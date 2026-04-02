"""
FastAPI Routes: Runs
Execute check plans and manage execution lifecycle
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from enum import Enum
import logging
from datetime import datetime

from src.api.models import RunCreate, RunResponse, RunStatusResponse
from src.models.db import Run, CheckPlan, Connection, MetadataSnapshot
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["runs"])

class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@router.post("/", response_model=RunResponse)
async def execute_run(
    request: RunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Execute a check plan.
    Creates a run record and queues Soda Core execution.
    """
    try:
        # Get check plan
        plan = db.query(CheckPlan).filter(CheckPlan.id == request.check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Check plan not found")
        
        # Get metadata snapshot
        snapshot = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.id == plan.metadata_snapshot_id
        ).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Metadata snapshot not found")
        
        # Get connection
        conn = db.query(Connection).filter(Connection.id == snapshot.connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        logger.info(f"Executing check plan: {plan.id} on connection: {conn.id}")
        
        # Create run record
        run = Run(
            check_plan_id=plan.id,
            status=RunStatus.PENDING.value,
            connection_id=conn.id,
            metadata_snapshot_id=snapshot.id,
        )
        
        db.add(run)
        db.commit()
        db.refresh(run)
        
        logger.info(f"Run created: {run.id} with status: {RunStatus.PENDING.value}")
        
        # Queue async execution (TODO: implement worker)
        # For now, mark as completed immediately
        # background_tasks.add_task(execute_checks_async, run.id, plan, conn, db)
        
        return RunResponse(
            id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            total_checks=len(plan.checks_definition) if plan.checks_definition else 0,
            passed_checks=0,
            failed_checks=0,
        )
    
    except Exception as e:
        logger.error(f"Failed to execute run: {e}")
        raise HTTPException(status_code=400, detail=str(e))


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
