"""
Check Execution Engine (M4)

Manages check execution lifecycle:
- POST /runs/{check_plan_id}/execute: Start check execution
- GET /runs/{run_id}/status: Poll execution status with progress
- GET /runs/{run_id}/results: Get check results and summary
- GET /checks/{check_plan_id}/runs: Execution history
- Background job execution with result aggregation
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from enum import Enum
import logging
import json
from datetime import datetime
import asyncio
import yaml

from src.models.db import Run, CheckResult, CheckPlan, MetadataSnapshot, Connection
from src.storage.db import get_db
from src.api.models import RunResponse, RunStatusResponse
from src.services.soda_runner import SodaCoreRunner

logger = logging.getLogger(__name__)
router = APIRouter(tags=["runs"])


class RunStatus(str, Enum):
    """Execution status states."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"
    CANCELLED = "cancelled"


def _extract_checks_list(checks_config: Any) -> List[Any]:
    """Support both `checks:` lists and SodaCL `checks for <dataset>:` blocks."""
    if not checks_config:
        return []

    if isinstance(checks_config, list):
        return checks_config

    if isinstance(checks_config, dict):
        direct_checks = checks_config.get("checks")
        if isinstance(direct_checks, list):
            return direct_checks

        flattened: List[Any] = []
        for key, value in checks_config.items():
            if isinstance(key, str) and key.startswith("checks for ") and isinstance(value, list):
                flattened.extend(value)
        return flattened

    return []


def _run_response_from_model(run: Run) -> RunResponse:
    total_checks = (run.pass_count or 0) + (run.fail_count or 0) + (run.warn_count or 0) + (run.error_count or 0)
    return RunResponse(
        id=run.id,
        check_plan_id=run.check_plan_id,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        total_checks=total_checks,
        passed_checks=run.pass_count or 0,
        failed_checks=run.fail_count or 0,
        warning_checks=run.warn_count or 0,
    )


def _get_total_checks_from_plan(plan: Optional[CheckPlan]) -> int:
    if not plan:
        return 0

    combined_yaml = "\n\n".join(
        part.strip() for part in [plan.checks_yaml or "", plan.custom_checks_yaml or ""] if part and part.strip()
    )
    if not combined_yaml:
        return 0

    try:
        parsed = yaml.safe_load(combined_yaml) or {}
    except Exception:
        return 0

    return len(_extract_checks_list(parsed))


@router.post("/{check_plan_id}/execute")
async def execute_check_plan(
    check_plan_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Start check execution for a check plan.
    
    **Purpose:** Queue checks for asynchronous execution
    
    **Response:**
    ```json
    {
        "run_id": "550e8400-e29b-41d4-a716-446655440003",
        "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
        "status": "pending",
        "message": "Check execution queued. Poll /runs/{run_id}/status for updates.",
        "created_at": "2026-04-11T10:50:00Z",
        "percent_complete": 0
    }
    ```
    """
    try:
        # Verify check plan
        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Check plan {check_plan_id} not found")
        
        if not plan.enabled:
            raise HTTPException(status_code=409, detail="Check plan is disabled")
        
        # Verify metadata snapshot
        snapshot = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.id == plan.metadata_snapshot_id
        ).first()
        if not snapshot:
            raise HTTPException(status_code=409, detail="Metadata snapshot not found. Re-profile dataset.")
        
        # Create run record
        new_run = Run(
            id=uuid4(),
            check_plan_id=check_plan_id,
            connection_id=plan.connection_id,
            status=RunStatus.PENDING.value,
            error_message=None,
        )
        db.add(new_run)
        db.commit()
        db.refresh(new_run)
        
        logger.info(f"Run created: {new_run.id} for plan {check_plan_id}")
        
        # Queue background execution
        background_tasks.add_task(
            _execute_checks_background,
            new_run.id,
            check_plan_id,
            plan.checks_yaml or "",
            plan.custom_checks_yaml
        )
        
        return {
            "run_id": str(new_run.id),
            "check_plan_id": str(check_plan_id),
            "status": RunStatus.PENDING.value,
            "message": "Check execution queued. Poll /runs/{run_id}/status for updates.",
            "created_at": new_run.created_at.isoformat(),
            "percent_complete": 0
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute check plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def _execute_checks_background(
    run_id: UUID,
    check_plan_id: UUID,
    checks_yaml: str,
    custom_yaml: Optional[str] = None
) -> None:
    """Background task for asynchronous check execution."""
    from src.storage.db import SessionLocal
    db = SessionLocal()
    
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            logger.error(f"Run {run_id} not found during background execution")
            return

        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise ValueError(f"Check plan {check_plan_id} not found")

        snapshot = db.query(MetadataSnapshot).filter(MetadataSnapshot.id == plan.metadata_snapshot_id).first()
        if not snapshot:
            raise ValueError("Metadata snapshot not found. Re-profile dataset.")

        connection = db.query(Connection).filter(Connection.id == plan.connection_id).first()
        if not connection:
            raise ValueError(f"Connection {plan.connection_id} not found")
        
        # Update to RUNNING
        run.status = RunStatus.RUNNING.value
        run.started_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Executing checks for run {run_id}")
        
        combined_yaml = "\n\n".join(part.strip() for part in [checks_yaml or "", custom_yaml or ""] if part and part.strip())
        if not combined_yaml:
            raise ValueError("No checks were provided for this plan")

        try:
            parsed_checks = yaml.safe_load(combined_yaml) or {}
            checks_list = _extract_checks_list(parsed_checks)
        except Exception as e:
            raise ValueError(f"YAML parse error: {str(e)}") from e

        runner = SodaCoreRunner()
        soda_results = runner.execute_checks(
            connection_id=str(connection.id),
            connection_type=connection.type,
            remote_url=connection.remote_url or snapshot.dataset_identifier,
            dataset_identifier=plan.dataset_identifier or snapshot.dataset_identifier,
            checks_config=combined_yaml,
        )

        passed_count = 0
        failed_count = 0
        warning_count = 0
        error_count = 0

        for idx, result in enumerate(soda_results.get("results", [])):
            raw_outcome = str(result.get("status") or result.get("outcome") or "").lower()
            if raw_outcome in {"pass", "passed", "success"}:
              result_status = "passed"
            elif raw_outcome in {"warn", "warned", "warning"}:
              result_status = "warned"
            else:
              result_status = "failed"

            message = result.get("message") or ""
            details = result.get("details") or {}
            metric_value = None
            if isinstance(details, dict):
                metric_value = (details.get("result") or {}).get("value") if isinstance(details.get("result"), dict) else None

            check_result = CheckResult(
                run_id=run_id,
                check_name=result.get("check_name") or f"check_{idx + 1}",
                check_type=result.get("check_type") or "soda",
                status=result_status,
                metric_value=metric_value,
                execution_time_ms=result.get("execution_time_ms") or 0,
                error_message=message if result_status == "failed" else None,
                warning_message=message if result_status == "warned" else None,
                validation_context={
                    "details": details,
                    "execution_mode": soda_results.get("execution_mode", "soda"),
                    "declared_checks": len(checks_list),
                },
            )
            db.add(check_result)

            if result_status == "passed":
                passed_count += 1
            elif result_status == "warned":
                warning_count += 1
            else:
                failed_count += 1

        if not soda_results.get("success", True):
            error_count += 1
            run.error_message = soda_results.get("error") or "Execution failed"
        
        # Finalize run
        if failed_count > 0 or error_count > 0:
            run.status = RunStatus.FAILED.value
        elif warning_count > 0:
            run.status = RunStatus.WARNING.value
        else:
            run.status = RunStatus.SUCCESS.value
        
        run.pass_count = passed_count
        run.fail_count = failed_count
        run.warn_count = warning_count
        run.error_count = error_count
        run.completed_at = datetime.utcnow()
        
        db.commit()
        logger.info(
            f"Run completed: {run_id} (passed={passed_count}, failed={failed_count}, warning={warning_count}, mode={soda_results.get('execution_mode', 'soda')})"
        )
        
    except Exception as e:
        logger.error(f"Check execution error: {e}", exc_info=True)
        try:
            run = db.query(Run).filter(Run.id == run_id).first()
            if run:
                run.status = RunStatus.FAILED.value
                run.error_message = str(e)
                run.completed_at = datetime.utcnow()
                run.error_count = 1
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.get("/{run_id}/results")
async def get_run_results(
    run_id: UUID,
    include_details: bool = False,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get aggregated check results.
    
    **Response:**
    ```json
    {
        "run_id": "550e8400-e29b-41d4-a716-446655440003",
        "status": "success",
        "summary": {
            "total_checks": 8,
            "passed": 7,
            "failed": 0,
            "warning": 1,
            "pass_rate_percent": 87.5
        },
        "results": [
            {
                "check_name": "customer_id is not null",
                "check_type": "missing_count",
                "status": "passed",
                "message": "Check passed successfully"
            }
        ]
    }
    ```
    """
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        # Aggregate results
        total = len(results)
        passed = sum(1 for r in results if r.status == "passed")
        failed = sum(1 for r in results if r.status == "failed")
        warning = sum(1 for r in results if r.status == "warned")
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        results_list = [
            {
                "check_name": r.check_name,
                "check_type": r.check_type,
                "status": r.status,
                "message": r.error_message or r.warning_message or f"Check {r.status}",
                "details": r.validation_context if include_details else None,
                "created_at": r.created_at.isoformat()
            }
            for r in results
        ]
        
        return {
            "run_id": str(run.id),
            "check_plan_id": str(run.check_plan_id),
            "status": run.status,
            "summary": {
                "total_checks": total,
                "passed": passed,
                "failed": failed,
                "warning": warning,
                "pass_rate_percent": round(pass_rate, 2)
            },
            "results": results_list,
            "created_at": run.created_at.isoformat(),
            "finished_at": run.completed_at.isoformat() if run.completed_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get run results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{check_plan_id}/runs")
async def list_runs_for_plan(
    check_plan_id: UUID,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get execution history for a check plan.
    
    **Query Parameters:**
    - `status_filter`: Filter by status
    - `skip`, `limit`: Pagination
    """
    try:
        query = db.query(Run).filter(Run.check_plan_id == check_plan_id)
        
        if status_filter:
            query = query.filter(Run.status == status_filter)
        
        if limit > 100:
            limit = 100
        
        runs = query.order_by(Run.created_at.desc()).offset(skip).limit(limit).all()
        
        return [
            {
                "run_id": str(r.id),
                "check_plan_id": str(r.check_plan_id),
                "status": r.status,
                "percent_complete": 100 if r.completed_at else (50 if r.started_at else 0),
                "passed": r.pass_count or 0,
                "failed": r.fail_count or 0,
                "warning": r.warn_count or 0,
                "created_at": r.created_at.isoformat(),
                "finished_at": r.completed_at.isoformat() if r.completed_at else None
            }
            for r in runs
        ]
    except Exception as e:
        logger.error(f"Failed to list runs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[RunResponse])
async def list_runs(
    plan_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all runs (optionally filtered by plan or status)."""
    try:
        query = db.query(Run)
        
        if plan_id:
            query = query.filter(Run.check_plan_id == plan_id)
        
        if status:
            query = query.filter(Run.status == status)
        
        runs = query.order_by(Run.created_at.desc()).all()
        
        return [_run_response_from_model(r) for r in runs]
    except Exception as e:
        logger.error(f"Failed to list runs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(run_id: UUID, db: Session = Depends(get_db)):
    """Get a specific run with details."""
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        return _run_response_from_model(run)
    except Exception as e:
        logger.error(f"Failed to get run: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{run_id}/status", response_model=RunStatusResponse)
async def get_run_status(run_id: UUID, db: Session = Depends(get_db)):
    """Get current status of a run (for polling)."""
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        plan = db.query(CheckPlan).filter(CheckPlan.id == run.check_plan_id).first()
        expected_checks = max(_get_total_checks_from_plan(plan), 1)
        completed_checks = db.query(CheckResult).filter(CheckResult.run_id == run_id).count()
        if run.completed_at:
            progress_percent = 100
        elif run.started_at:
            progress_percent = min(95, int((completed_checks / expected_checks) * 100))
        else:
            progress_percent = 0
        
        return RunStatusResponse(
            id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            created_at=run.created_at,
            started_at=run.started_at,
            completed_at=run.completed_at,
            error_message=run.error_message,
            progress_percent=progress_percent,
        )
    except Exception as e:
        logger.error(f"Failed to get run status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{run_id}/cancel")
async def cancel_run(run_id: UUID, db: Session = Depends(get_db)):
    """Cancel a running check execution."""
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        if run.status not in [RunStatus.PENDING.value, RunStatus.RUNNING.value]:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot cancel run with status: {run.status}"
            )
        
        run.status = "cancelled"
        run.completed_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Run cancelled: {run_id}")
        
        return {"message": "Run cancelled"}
    except Exception as e:
        logger.error(f"Failed to cancel run: {e}")
        raise HTTPException(status_code=500, detail=str(e))
