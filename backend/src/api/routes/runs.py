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

from src.models.db import Run, CheckResult, CheckPlan, MetadataSnapshot, Connection
from src.storage.db import get_db

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
            metadata_snapshot_id=plan.metadata_snapshot_id,
            connection_id=plan.connection_id,
            status=RunStatus.PENDING.value,
            percent_complete=0,
            error_message=None
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
        
        # Update to RUNNING
        run.status = RunStatus.RUNNING.value
        run.started_at = datetime.utcnow()
        run.percent_complete = 10
        db.commit()
        
        logger.info(f"Executing checks for run {run_id}")
        
        # Parse YAML checks
        try:
            import yaml
            combined_yaml = (checks_yaml or "") + "\n" + (custom_yaml or "")
            checks_config = yaml.safe_load(combined_yaml or "checks: []")
            checks_list = checks_config.get("checks", []) if checks_config else []
        except Exception as e:
            logger.error(f"Failed to parse YAML: {e}")
            run.status = RunStatus.FAILED.value
            run.error_message = f"YAML parse error: {str(e)}"
            run.percent_complete = 100
            run.finished_at = datetime.utcnow()
            db.commit()
            return
        
        # Execute checks (simulated for M4, real Soda integration in production)
        total_checks = len(checks_list)
        passed_count = 0
        failed_count = 0
        warning_count = 0
        
        for idx, check in enumerate(checks_list):
            # Simulate check execution
            await asyncio.sleep(0.05)
            
            # Create result record
            result_status = "passed" if idx % 3 != 0 else ("warning" if idx % 3 == 1 else "failed")
            
            check_result = CheckResult(
                run_id=run_id,
                check_name=check.get("name", f"check_{idx}") if isinstance(check, dict) else f"check_{idx}",
                check_type=check.get("type", "unknown") if isinstance(check, dict) else "unknown",
                status=result_status,
                message=f"Check {result_status}",
                details=json.dumps(check) if isinstance(check, dict) else json.dumps({"raw": str(check)})
            )
            db.add(check_result)
            
            # Track counts
            if result_status == "passed":
                passed_count += 1
            elif result_status == "failed":
                failed_count += 1
            else:
                warning_count += 1
            
            run.percent_complete = 10 + int((idx / max(total_checks, 1)) * 80)
            db.commit()
        
        # Finalize run
        if failed_count > 0:
            run.status = RunStatus.FAILED.value
        elif warning_count > 0:
            run.status = RunStatus.WARNING.value
        else:
            run.status = RunStatus.SUCCESS.value
        
        run.passed_count = passed_count
        run.failed_count = failed_count
        run.warning_count = warning_count
        run.percent_complete = 100
        run.finished_at = datetime.utcnow()
        
        db.commit()
        logger.info(f"Run completed: {run_id} (passed={passed_count}, failed={failed_count}, warning={warning_count})")
        
    except Exception as e:
        logger.error(f"Check execution error: {e}", exc_info=True)
        try:
            run.status = RunStatus.FAILED.value
            run.error_message = str(e)
            run.percent_complete = 100
            run.finished_at = datetime.utcnow()
            db.commit()
        except:
            pass
    finally:
        db.close()


@router.get("/{run_id}/status")
async def get_run_status(
    run_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Poll check execution status.
    
    **Response:**
    ```json
    {
        "run_id": "550e8400-e29b-41d4-a716-446655440003",
        "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
        "status": "running",
        "percent_complete": 45,
        "created_at": "2026-04-11T10:50:00Z",
        "started_at": "2026-04-11T10:50:05Z",
        "finished_at": null,
        "duration_seconds": 5
    }
    ```
    """
    try:
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        
        duration = None
        if run.started_at:
            end_time = run.finished_at or datetime.utcnow()
            duration = (end_time - run.started_at).total_seconds()
        
        return {
            "run_id": str(run.id),
            "check_plan_id": str(run.check_plan_id),
            "status": run.status,
            "percent_complete": run.percent_complete,
            "created_at": run.created_at.isoformat(),
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "duration_seconds": duration,
            "error_message": run.error_message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get run status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
        warning = sum(1 for r in results if r.status == "warning")
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        results_list = [
            {
                "check_name": r.check_name,
                "check_type": r.check_type,
                "status": r.status,
                "message": r.message,
                "details": json.loads(r.details) if include_details and r.details else None,
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
            "finished_at": run.finished_at.isoformat() if run.finished_at else None
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
                "percent_complete": r.percent_complete,
                "passed": r.passed_count or 0,
                "failed": r.failed_count or 0,
                "warning": r.warning_count or 0,
                "created_at": r.created_at.isoformat(),
                "finished_at": r.finished_at.isoformat() if r.finished_at else None
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
        
        return [
            RunResponse(
                id=r.id,
                check_plan_id=r.check_plan_id,
                status=r.status,
                started_at=r.started_at,
                completed_at=r.completed_at,
                total_checks=0,  # TODO: fetch from results
                passed_checks=0,
                failed_checks=0,
            )
            for r in runs
        ]
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
        
        return RunResponse(
            id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            total_checks=0,
            passed_checks=0,
            failed_checks=0,
        )
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
        
        return RunStatusResponse(
            id=run.id,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            progress_percent=0,  # TODO: calculate from results
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
