"""
FastAPI Routes: Check Plans
Manage collection of data quality checks to execute
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging
import json

from src.api.models import CheckPlanCreate, CheckPlanResponse
from src.models.db import CheckPlan, Connection, MetadataSnapshot
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["check-plans"])

@router.post("/", response_model=CheckPlanResponse)
async def create_check_plan(
    request: CheckPlanCreate,
    db: Session = Depends(get_db)
):
    """Create a new check plan (collection of checks to execute)."""
    try:
        # Resolve metadata snapshot from either metadata_snapshot_id or connection_id
        snapshot = None
        if request.metadata_snapshot_id:
            snapshot = db.query(MetadataSnapshot).filter(
                MetadataSnapshot.id == request.metadata_snapshot_id
            ).first()
        elif request.connection_id:
            snapshot = db.query(MetadataSnapshot).filter(
                MetadataSnapshot.connection_id == request.connection_id
            ).order_by(MetadataSnapshot.created_at.desc()).first()
        
        if not snapshot:
            raise HTTPException(status_code=404, detail="Metadata snapshot not found. Provide either metadata_snapshot_id or connection_id")
        
        # Verify connection exists
        conn = db.query(Connection).filter(
            Connection.id == snapshot.connection_id
        ).first()
        
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        logger.info(f"Creating check plan: {request.name}")
        
        # Create plan with correct field names from CheckPlan model
        plan = CheckPlan(
            name=request.name,
            connection_id=snapshot.connection_id,
            metadata_snapshot_id=snapshot.id,  # Store snapshot reference for executor
            dataset_identifier='data',  # From metadata snapshot
            description=request.description,
            checks_yaml=json.dumps(request.checks) if request.checks else json.dumps([]),
            enabled=request.is_active if request.is_active is not None else True,
        )
        
        db.add(plan)
        db.commit()
        db.refresh(plan)
        
        logger.info(f"Check plan created: {plan.id}")
        
        return CheckPlanResponse(
            id=plan.id,
            name=plan.name,
            description=plan.description,
            metadata_snapshot_id=snapshot.id,  # Use the snapshot we retrieved
            check_count=len(request.checks) if request.checks else 0,
            is_active=plan.enabled,  # Map database field 'enabled' to response field 'is_active'
            created_at=plan.created_at,
            created_by=plan.created_by,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create check plan: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[CheckPlanResponse])
async def list_check_plans(
    snapshot_id: Optional[UUID] = None,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all check plans (optionally filtered)."""
    try:
        query = db.query(CheckPlan)
        
        if snapshot_id:
            query = query.filter(CheckPlan.metadata_snapshot_id == snapshot_id)
        
        if active_only:
            query = query.filter(CheckPlan.is_active == True)
        
        plans = query.order_by(CheckPlan.created_at.desc()).all()
        
        return [
            CheckPlanResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                metadata_snapshot_id=p.metadata_snapshot_id,
                check_count=len(json.loads(p.checks_definition)) if p.checks_definition else 0,
                is_active=p.is_active,
                created_at=p.created_at,
                created_by=p.created_by,
            )
            for p in plans
        ]
    except Exception as e:
        logger.error(f"Failed to list check plans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{plan_id}", response_model=CheckPlanResponse)
async def get_check_plan(plan_id: UUID, db: Session = Depends(get_db)):
    """Get a specific check plan with full details."""
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Check plan not found")
        
        return CheckPlanResponse(
            id=plan.id,
            name=plan.name,
            description=plan.description,
            metadata_snapshot_id=plan.metadata_snapshot_id,
            check_count=len(json.loads(plan.checks_definition)) if plan.checks_definition else 0,
            is_active=plan.is_active,
            created_at=plan.created_at,
            created_by=plan.created_by,
        )
    except Exception as e:
        logger.error(f"Failed to get check plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{plan_id}", response_model=CheckPlanResponse)
async def update_check_plan(
    plan_id: UUID,
    request: CheckPlanCreate,
    db: Session = Depends(get_db)
):
    """Update an existing check plan."""
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Check plan not found")
        
        plan.name = request.name
        plan.description = request.description
        plan.checks_definition = json.dumps(request.checks) if request.checks else json.dumps([])
        
        db.commit()
        db.refresh(plan)
        
        logger.info(f"Check plan updated: {plan_id}")
        
        return CheckPlanResponse(
            id=plan.id,
            name=plan.name,
            description=plan.description,
            metadata_snapshot_id=plan.metadata_snapshot_id,
            check_count=len(json.loads(plan.checks_definition)) if plan.checks_definition else 0,
            is_active=plan.is_active,
            created_at=plan.created_at,
            created_by=plan.created_by,
        )
    except Exception as e:
        logger.error(f"Failed to update check plan: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{plan_id}")
async def delete_check_plan(plan_id: UUID, db: Session = Depends(get_db)):
    """Delete a check plan."""
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Check plan not found")
        
        db.delete(plan)
        db.commit()
        
        logger.info(f"Check plan deleted: {plan_id}")
        
        return {"message": "Check plan deleted"}
    except Exception as e:
        logger.error(f"Failed to delete check plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

