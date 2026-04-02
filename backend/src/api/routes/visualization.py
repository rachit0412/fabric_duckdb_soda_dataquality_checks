"""
FastAPI Routes: Visualization
Returns aggregated metrics for chart visualizations
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from uuid import UUID
import logging
import json
from datetime import datetime, timedelta

from src.models.db import Run, CheckResult, CheckPlan
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["visualization"])


@router.get("/runs/{run_id}/metrics")
async def get_run_metrics(
    run_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get aggregated metrics for a specific run.
    Returns data for charts: check status distribution, per-column metrics, etc.
    """
    try:
        # Get run
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        # Get all results for this run
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        if not results:
            return {
                "run_id": str(run_id),
                "status": run.status,
                "summary": {
                    "total_checks": 0,
                    "passed": 0,
                    "failed": 0,
                    "pass_rate": 0.0,
                },
                "by_status": {"pass": [], "fail": []},
                "by_column": {},
                "by_check_type": {},
                "timestamps": {
                    "started_at": run.started_at.isoformat() if run.started_at else None,
                    "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                }
            }
        
        # Aggregate status
        passed = sum(1 for r in results if r.outcome == "pass")
        failed = sum(1 for r in results if r.outcome == "fail")
        total = len(results)
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        # Group by column
        by_column = {}
        for result in results:
            col = result.check_name or "unknown"
            if col not in by_column:
                by_column[col] = {"passed": 0, "failed": 0, "checks": []}
            
            if result.outcome == "pass":
                by_column[col]["passed"] += 1
            else:
                by_column[col]["failed"] += 1
            
            by_column[col]["checks"].append({
                "name": result.check_name,
                "outcome": result.outcome,
                "message": result.message,
            })
        
        # Calculate column scores
        column_scores = {}
        for col, data in by_column.items():
            total_col = data["passed"] + data["failed"]
            score = (data["passed"] / total_col * 100) if total_col > 0 else 0
            column_scores[col] = score
        
        # Group by check type (parse from check_name pattern)
        by_check_type = {}
        for result in results:
            # Try to infer check type from message or name
            check_type = "unknown"
            if result.message:
                if "missing" in result.message.lower() or "null" in result.message.lower():
                    check_type = "missing_count"
                elif "duplicate" in result.message.lower():
                    check_type = "duplicate_count"
                elif "invalid" in result.message.lower():
                    check_type = "invalid_count"
                elif "anomaly" in result.message.lower():
                    check_type = "anomaly_detection"
                elif "freshness" in result.message.lower():
                    check_type = "freshness"
            
            if check_type not in by_check_type:
                by_check_type[check_type] = {"passed": 0, "failed": 0}
            
            if result.outcome == "pass":
                by_check_type[check_type]["passed"] += 1
            else:
                by_check_type[check_type]["failed"] += 1
        
        return {
            "run_id": str(run_id),
            "status": run.status,
            "summary": {
                "total_checks": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": round(pass_rate, 2),
            },
            "by_status": {
                "pass": [r.check_name for r in results if r.outcome == "pass"],
                "fail": [r.check_name for r in results if r.outcome == "fail"],
            },
            "by_column": {
                col: {
                    "quality_score": round(column_scores.get(col, 0), 2),
                    **data
                }
                for col, data in by_column.items()
            },
            "by_check_type": by_check_type,
            "timestamps": {
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            }
        }
    
    except Exception as e:
        logger.error(f"Failed to get run metrics: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/plans/{plan_id}/trend")
async def get_plan_trend(
    plan_id: UUID,
    days: int = 7,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get trend data for a check plan over time.
    Returns historical pass/fail rates for charting trend lines.
    """
    try:
        # Get all runs for this plan
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        runs = db.query(Run).filter(
            Run.check_plan_id == plan_id,
            Run.completed_at >= cutoff_date,
            Run.status == "completed"
        ).order_by(Run.completed_at.asc()).all()
        
        if not runs:
            return {
                "plan_id": str(plan_id),
                "days": days,
                "data_points": []
            }
        
        # Build trend data
        trend_data = []
        for run in runs:
            results = db.query(CheckResult).filter(CheckResult.run_id == run.id).all()
            
            if results:
                passed = sum(1 for r in results if r.outcome == "pass")
                total = len(results)
                pass_rate = (passed / total * 100) if total > 0 else 0
                
                trend_data.append({
                    "date": run.completed_at.isoformat() if run.completed_at else None,
                    "pass_rate": round(pass_rate, 2),
                    "passed": passed,
                    "failed": total - passed,
                    "total": total,
                })
        
        return {
            "plan_id": str(plan_id),
            "days": days,
            "data_points": trend_data,
        }
    
    except Exception as e:
        logger.error(f"Failed to get plan trend: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/summary/quality-by-column")
async def get_quality_by_column(
    days: int = 7,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get overall data quality score by column across all recent runs.
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get recent results
        results = db.query(CheckResult).join(Run).filter(
            Run.completed_at >= cutoff_date,
            Run.status == "completed"
        ).all()
        
        if not results:
            return {
                "days": days,
                "quality_scoreboard": []
            }
        
        # Aggregate by column
        column_quality = {}
        for result in results:
            col_name = result.check_name or "unknown"
            if col_name not in column_quality:
                column_quality[col_name] = {"passed": 0, "total": 0}
            
            column_quality[col_name]["total"] += 1
            if result.outcome == "pass":
                column_quality[col_name]["passed"] += 1
        
        # Calculate scores
        scoreboard = []
        for col, stats in column_quality.items():
            score = (stats["passed"] / stats["total"] * 100) if stats["total"] > 0 else 0
            scoreboard.append({
                "column": col,
                "quality_score": round(score, 2),
                "checks_passed": stats["passed"],
                "total_checks": stats["total"],
            })
        
        # Sort by quality score
        scoreboard.sort(key=lambda x: x["quality_score"])
        
        return {
            "days": days,
            "quality_scoreboard": scoreboard,
        }
    
    except Exception as e:
        logger.error(f"Failed to get quality scoreboard: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
