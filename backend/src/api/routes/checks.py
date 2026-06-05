"""
FastAPI Routes: Check Plans (M3)

Manage collection of data quality checks to execute.
Supports:
- POST /checks: Create check plan from suggestions or custom YAML
- GET /checks: List check plans
- GET /checks/{id}: Get check plan details  
- PUT /checks/{id}: Update check plan
- DELETE /checks/{id}: Delete check plan
- GET /checks/{id}/suggestions: Get suggested checks for check plan
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
import logging
import json
import re
import yaml
from datetime import datetime

from src.api.models import CheckPlanCreate, CheckPlanResponse, SuggestionsResponse, CheckLibraryResponse
from src.models.db import CheckPlan, Connection, MetadataSnapshot, CheckSuggestion, Run
from src.storage.db import get_db
from src.services.check_library import get_check_library
from src.services.suggestions import SuggestionEngine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["checks"])

# ---------------------------------------------------------------------------
# SodaCL YAML validator
# ---------------------------------------------------------------------------

_INVALID_TYPE_PATTERNS = [
    (
        r'^\s+type:\s*anomaly_detection',
        "anomaly_detection is not a Soda check type. "
        "Replace with: invalid_count(col) = 0:\n      valid min: X\n      valid max: Y",
    ),
    (
        r'^\s+type:\s*schema_type',
        "schema_type is not a Soda check type. "
        "Replace with: schema:\n      fail:\n        when wrong column type:\n          col_name: expected_type",
    ),
    (
        r'^\s+type:\s*valid_values',
        "valid_values as 'type:' is not valid SodaCL. "
        "Replace with: invalid_count(col) = 0:\n      valid values: [val1, val2]",
    ),
    (
        r'^\s+type:\s*row_count',
        "row_count as 'type:' is not valid SodaCL. "
        "Use the expression form: row_count between X and Y",
    ),
]


def _validate_soda_yaml(checks_yaml: str) -> Dict[str, Any]:
    """Validate SodaCL YAML syntax and patterns. Returns {valid, issues}."""
    raw = (checks_yaml or "").strip()
    if not raw:
        return {"valid": False, "issues": [{"severity": "error", "message": "Checks YAML is empty."}]}

    # 1. YAML syntax
    try:
        yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        first_line = str(exc).split("\n")[0]
        return {"valid": False, "issues": [{"severity": "error", "message": f"YAML syntax error: {first_line}"}]}

    issues = []

    # 2. Must start with 'checks for <table>:' or 'checks:'
    if not (raw.startswith("checks for ") or raw.startswith("checks:")):
        issues.append({
            "severity": "warning",
            "message": "SodaCL should start with 'checks for <table>:' (e.g. 'checks for data:')",
        })

    # 3. Known unsupported block-mapping 'type:' keys
    for pattern, message in _INVALID_TYPE_PATTERNS:
        if re.search(pattern, raw, re.MULTILINE):
            issues.append({"severity": "error", "message": message})

    # 4. Invalid 'fail: when < X / when > Y' block syntax
    if re.search(r'fail:\s*\n\s+when\s+[<>=]', raw):
        issues.append({
            "severity": "error",
            "message": "Invalid 'fail: when < X' block syntax. Use 'row_count between X and Y' for range checks.",
        })

    # 5. Block-mapping check style (- name: / type: / fail:) mixed into a list
    if re.search(r'^\s+- name:\s+', raw, re.MULTILINE):
        issues.append({
            "severity": "error",
            "message": (
                "Block-mapping check style ('- name: ... type: ... fail: ...') is not valid SodaCL. "
                "Use expression syntax, e.g.: - missing_count(col) = 0"
            ),
        })

    return {
        "valid": not any(i["severity"] == "error" for i in issues),
        "issues": issues,
    }


# ---------------------------------------------------------------------------
# Validate endpoint  (must appear before any /{check_plan_id} route)
# ---------------------------------------------------------------------------

@router.post("/validate")
async def validate_check_plan_yaml(request: Dict[str, Any]):
    """Validate SodaCL YAML without persisting. Returns {valid, issues}."""
    return _validate_soda_yaml(request.get("checks_yaml", ""))


@router.get("/library", response_model=CheckLibraryResponse)
async def list_check_library(engine: Optional[str] = None):
    """Return predefined check templates for Soda Core and Great Expectations."""
    return get_check_library(engine)

def _normalize_checks_yaml(checks_yaml: Optional[str]) -> str:
    raw_yaml = (checks_yaml or "").strip()
    if not raw_yaml:
        return ""

    lines = raw_yaml.splitlines()
    seen_checks_for_header = False
    normalized_lines = []

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("checks for "):
            seen_checks_for_header = True
            normalized_lines.append(stripped)
            continue

        if seen_checks_for_header and line.startswith("- "):
            normalized_lines.append(f"  {line}")
            continue

        normalized_lines.append(line)

    return "\n".join(normalized_lines)

@router.post("/", response_model=CheckPlanResponse)
async def create_check_plan(
    request: CheckPlanCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new check plan (collection of checks to execute).
    
    **Purpose:** Define a collection of data quality checks for a dataset
    
    **Request Body:**
    ```json
    {
        "name": "customer_daily_checks",
        "connection_id": "550e8400-e29b-41d4-a716-446655440000",
        "metadata_snapshot_id": "550e8400-e29b-41d4-a716-446655440001",
        "dataset_identifier": "public.customers",
        "description": "Daily checks for customer data quality",
        "checks_yaml": "checks:\\n  - missing_count(id) == 0\\n  ...",
        "custom_checks_yaml": "checks:\\n  - row_count > 1000\\n",
        "enabled": true
    }
    ```
    
    **Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "customer_daily_checks",
        "connection_id": "550e8400-e29b-41d4-a716-446655440000",
        "metadata_snapshot_id": "550e8400-e29b-41d4-a716-446655440001",
        "dataset_identifier": "public.customers",
        "description": "Daily checks for customer data quality",
        "checks_yaml": "checks:\\n  - missing_count(id) == 0\\n",
        "custom_checks_yaml": "checks:\\n  - row_count > 1000\\n",
        "enabled": true,
        "created_at": "2026-04-11T10:30:00Z",
        "updated_at": "2026-04-11T10:30:00Z"
    }
    ```
    """
    try:
        # Resolve metadata snapshot
        if not request.metadata_snapshot_id:
            # Try to find latest for connection
            if request.connection_id:
                snapshot = db.query(MetadataSnapshot).filter(
                    MetadataSnapshot.connection_id == request.connection_id
                ).order_by(MetadataSnapshot.created_at.desc()).first()
                if not snapshot:
                    raise HTTPException(
                        status_code=404,
                        detail=f"No metadata snapshot found for connection {request.connection_id}. Run profiling first (POST /metadata/profile)."
                    )
                metadata_snapshot_id = snapshot.id
            else:
                raise HTTPException(status_code=400, detail="Provide either metadata_snapshot_id or connection_id")
        else:
            metadata_snapshot_id = request.metadata_snapshot_id
        
        # Verify snapshot exists
        snapshot = db.query(MetadataSnapshot).filter(MetadataSnapshot.id == metadata_snapshot_id).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail=f"Metadata snapshot {metadata_snapshot_id} not found")
        
        # Verify connection exists
        conn = db.query(Connection).filter(Connection.id == snapshot.connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        # Check plan name uniqueness
        existing_plan = db.query(CheckPlan).filter(
            CheckPlan.name == request.name,
            CheckPlan.connection_id == snapshot.connection_id
        ).first()
        if existing_plan:
            raise HTTPException(
                status_code=409,
                detail=f"Check plan '{request.name}' already exists for this connection"
            )
        
        logger.info(f"Creating check plan: {request.name}")

        # Validate SodaCL YAML only for Soda-backed plans.
        if request.checks_yaml and (request.check_engine or 'soda') != 'great_expectations':
            validation = _validate_soda_yaml(request.checks_yaml)
            if not validation["valid"]:
                errors = [i["message"] for i in validation["issues"] if i["severity"] == "error"]
                raise HTTPException(
                    status_code=422,
                    detail={"message": "Checks YAML contains errors. Fix them before creating the plan.",
                            "errors": errors},
                )

        # Create check plan
        new_plan = CheckPlan(
            name=request.name,
            connection_id=snapshot.connection_id,
            metadata_snapshot_id=metadata_snapshot_id,
            dataset_identifier=request.dataset_identifier or snapshot.dataset_identifier,
            description=request.description,
            checks_yaml=_normalize_checks_yaml(request.checks_yaml),
            custom_checks_yaml=request.custom_checks_yaml,
            check_engine=request.check_engine or 'soda',
            enabled=request.enabled if request.enabled is not None else True,
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        
        logger.info(f"Check plan created: {new_plan.id} (name={request.name})")
        
        return CheckPlanResponse(
            id=new_plan.id,
            name=new_plan.name,
            connection_id=new_plan.connection_id,
            metadata_snapshot_id=new_plan.metadata_snapshot_id,
            dataset_identifier=new_plan.dataset_identifier,
            description=new_plan.description,
            checks_yaml=new_plan.checks_yaml,
            custom_checks_yaml=new_plan.custom_checks_yaml,
            check_engine=new_plan.check_engine or 'soda',
            enabled=new_plan.enabled,
            created_at=new_plan.created_at,
            updated_at=new_plan.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create check plan: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[CheckPlanResponse])
async def list_check_plans(
    connection_id: Optional[UUID] = None,
    enabled_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List check plans with optional filtering.
    
    **Query Parameters:**
    - `connection_id`: Filter by connection (optional)
    - `enabled_only`: Show only enabled plans (default: all)
    - `skip`: Pagination offset (default 0)
    - `limit`: Result limit (default 50, max 100)
    """
    try:
        query = db.query(CheckPlan)
        
        if connection_id:
            query = query.filter(CheckPlan.connection_id == connection_id)
        
        if enabled_only:
            query = query.filter(CheckPlan.enabled == True)
        
        if limit > 100:
            limit = 100
        
        plans = query.offset(skip).limit(limit).all()
        
        return [
            CheckPlanResponse(
                id=p.id,
                name=p.name,
                connection_id=p.connection_id,
                metadata_snapshot_id=p.metadata_snapshot_id,
                dataset_identifier=p.dataset_identifier,
                description=p.description,
                checks_yaml=p.checks_yaml,
                custom_checks_yaml=p.custom_checks_yaml,
                check_engine=p.check_engine or 'soda',
                enabled=p.enabled,
                created_at=p.created_at,
                updated_at=p.updated_at
            )
            for p in plans
        ]
    except Exception as e:
        logger.error(f"Failed to list check plans: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{check_plan_id}", response_model=CheckPlanResponse)
async def get_check_plan(
    check_plan_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get check plan details.
    
    **Response includes:** Full YAML definitions, metadata snapshot reference, enabled status
    """
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Check plan {check_plan_id} not found")
        
        return CheckPlanResponse(
            id=plan.id,
            name=plan.name,
            connection_id=plan.connection_id,
            metadata_snapshot_id=plan.metadata_snapshot_id,
            dataset_identifier=plan.dataset_identifier,
            description=plan.description,
            checks_yaml=plan.checks_yaml,
            custom_checks_yaml=plan.custom_checks_yaml,
            check_engine=plan.check_engine or 'soda',
            enabled=plan.enabled,
            created_at=plan.created_at,
            updated_at=plan.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get check plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{check_plan_id}", response_model=CheckPlanResponse)
async def update_check_plan(
    check_plan_id: UUID,
    request: CheckPlanCreate,
    db: Session = Depends(get_db)
):
    """
    Update check plan.
    
    **Note:** All fields are optional. Unspecified fields retain previous values.
    """
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Check plan {check_plan_id} not found")
        
        # Update fields (only if provided)
        if request.name:
            plan.name = request.name
        if request.description is not None:
            plan.description = request.description
        if request.check_engine is not None:
            plan.check_engine = request.check_engine
        if request.checks_yaml is not None:
            # Validate only SodaCL plans before updating.
            if (request.check_engine or plan.check_engine or 'soda') != 'great_expectations':
                validation = _validate_soda_yaml(request.checks_yaml)
                if not validation["valid"]:
                    errors = [i["message"] for i in validation["issues"] if i["severity"] == "error"]
                    raise HTTPException(
                        status_code=422,
                        detail={"message": "Checks YAML contains errors. Fix them before saving.",
                                "errors": errors},
                    )
            plan.checks_yaml = request.checks_yaml
        if request.custom_checks_yaml is not None:
            plan.custom_checks_yaml = request.custom_checks_yaml
        if request.enabled is not None:
            plan.enabled = request.enabled
        
        plan.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(plan)
        
        logger.info(f"Check plan updated: {check_plan_id}")
        
        return CheckPlanResponse(
            id=plan.id,
            name=plan.name,
            connection_id=plan.connection_id,
            metadata_snapshot_id=plan.metadata_snapshot_id,
            dataset_identifier=plan.dataset_identifier,
            description=plan.description,
            checks_yaml=plan.checks_yaml,
            custom_checks_yaml=plan.custom_checks_yaml,
            check_engine=plan.check_engine or 'soda',
            enabled=plan.enabled,
            created_at=plan.created_at,
            updated_at=plan.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update check plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{check_plan_id}")
async def delete_check_plan(
    check_plan_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete check plan and associated suggestions.
    
    **Side Effects:**
    - Deletes check plan record
    - Deletes associated check suggestions (but preserves historical runs)
    
    **Response:**
    ```json
    {
        "success": true,
        "message": "Check plan deleted successfully",
        "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
        "timestamp": "2026-04-11T10:45:00Z"
    }
    ```
    """
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Check plan {check_plan_id} not found")
        
        # Delete associated suggestions (runs are preserved for audit)
        db.query(CheckSuggestion).filter(CheckSuggestion.metadata_snapshot_id == plan.metadata_snapshot_id).delete()
        
        # Delete check plan
        db.delete(plan)
        db.commit()
        
        logger.info(f"Check plan deleted: {check_plan_id}")
        
        return {
            "success": True,
            "message": "Check plan deleted successfully",
            "check_plan_id": str(check_plan_id),
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete check plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{check_plan_id}/suggestions", response_model=Dict[str, Any])
async def get_check_suggestions(
    check_plan_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Generate check suggestions for a check plan's dataset.
    
    **Purpose:** Recommend data quality checks based on profiled metadata
    
    **Response:**
    ```json
    {
        "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
        "suggestions_count": 8,
        "suggestions_by_category": {
            "completeness": 3,
            "uniqueness": 2,
            "validity": 2,
            "statistical": 1
        },
        "suggestions": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440003",
                "rule_id": "null_check_for_pk_like",
                "check_name": "id is not null",
                "category": "completeness",
                "column": "id",
                "confidence": 0.95,
                "severity": "critical",
                "rationale": "Column appears to be a key/ID; expect no NULLs",
                "suggested_yaml": "checks:\\n  - missing_count(id) == 0"
            }
        ]
    }
    ```
    """
    try:
        plan = db.query(CheckPlan).filter(CheckPlan.id == check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Check plan {check_plan_id} not found")
        
        # Get metadata snapshot
        snapshot = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.id == plan.metadata_snapshot_id
        ).first()
        if not snapshot:
            raise HTTPException(
                status_code=409,
                detail="Metadata snapshot not found. Re-profile dataset first."
            )
        
        # Generate suggestions
        engine = SuggestionEngine()
        
        # Reconstruct schema from snapshot
        schema_data = snapshot.schema_json if isinstance(snapshot.schema_json, dict) else json.loads(snapshot.schema_json or "{}")
        
        suggestions = engine.generate_suggestions(schema_data)
        
        # Store suggestions in DB
        for sugg in suggestions:
            check_sugg = CheckSuggestion(
                metadata_snapshot_id=plan.metadata_snapshot_id,
                suggestion_set_id=uuid4(),
                rule_id=sugg.get("rule_id", "unknown"),
                check_name=sugg.get("check_name", ""),
                check_type=sugg.get("check_type", ""),
                rationale=sugg.get("rationale", ""),
                suggested_check_yaml=sugg.get("suggested_yaml", ""),
                confidence_score=sugg.get("confidence", 0.0)
            )
            db.add(check_sugg)
        
        db.commit()
        
        # Categorize suggestions
        suggestions_by_category = {}
        for sugg in suggestions:
            cat = sugg.get("category", "other")
            suggestions_by_category[cat] = suggestions_by_category.get(cat, 0) + 1
        
        logger.info(f"Generated {len(suggestions)} check suggestions for plan {check_plan_id}")
        
        return {
            "check_plan_id": str(check_plan_id),
            "suggestions_count": len(suggestions),
            "suggestions_by_category": suggestions_by_category,
            "suggestions": suggestions
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        
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

