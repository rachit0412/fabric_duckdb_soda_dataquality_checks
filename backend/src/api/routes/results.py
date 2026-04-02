"""
FastAPI Routes: Results
View and export check execution results
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging
import json
from io import BytesIO
import csv

from src.api.models import CheckResultResponse, ResultsResponse, ExportRequest
from src.models.db import CheckResult, Run, CheckPlan
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["results"])

@router.get("/runs/{run_id}/results", response_model=ResultsResponse)
async def get_run_results(run_id: UUID, db: Session = Depends(get_db)):
    """
    Get all check results for a specific run.
    """
    try:
        # Get run
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        # Get check plan
        plan = db.query(CheckPlan).filter(CheckPlan.id == run.check_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Check plan not found")
        
        logger.info(f"Fetching results for run: {run_id}")
        
        # Get all results for this run
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        # Calculate stats
        passed = sum(1 for r in results if r.outcome == 'pass')
        failed = sum(1 for r in results if r.outcome == 'fail')
        
        return ResultsResponse(
            run_id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            total_checks=len(results),
            passed_checks=passed,
            failed_checks=failed,
            completed_at=run.completed_at,
            results=[
                CheckResultResponse(
                    id=r.id,
                    check_name=r.check_name,
                    outcome=r.outcome,
                    message=r.message,
                    details=json.loads(r.details) if isinstance(r.details, str) else (r.details or {}),
                    failed_rows=json.loads(r.failed_rows) if isinstance(r.failed_rows, str) else (r.failed_rows or []),
                    metrics=json.loads(r.metrics) if isinstance(r.metrics, str) else (r.metrics or {}),
                    created_at=r.created_at,
                )
                for r in results
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get run results: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}", response_model=CheckResultResponse)
async def get_check_result(result_id: UUID, db: Session = Depends(get_db)):
    """Get detailed result for a specific check."""
    try:
        result = db.query(CheckResult).filter(CheckResult.id == result_id).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        return CheckResultResponse(
            id=result.id,
            check_name=result.check_name,
            outcome=result.outcome,
            message=result.message,
            details=json.loads(result.details) if isinstance(result.details, str) else (result.details or {}),
            failed_rows=json.loads(result.failed_rows) if isinstance(result.failed_rows, str) else (result.failed_rows or []),
            metrics=json.loads(result.metrics) if isinstance(result.metrics, str) else (result.metrics or {}),
            created_at=result.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get check result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs/{run_id}/results/summary")
async def get_results_summary(run_id: UUID, db: Session = Depends(get_db)):
    """Get summary statistics for a run's results."""
    try:
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        if not results:
            raise HTTPException(status_code=404, detail="No results found for this run")
        
        passed = sum(1 for r in results if r.outcome == 'pass')
        failed = sum(1 for r in results if r.outcome == 'fail')
        
        # Group by check category
        by_category = {}
        for r in results:
            details = json.loads(r.details) if isinstance(r.details, str) else (r.details or {})
            cat = details.get('category', 'other')
            if cat not in by_category:
                by_category[cat] = {'passed': 0, 'failed': 0}
            
            if r.outcome == 'pass':
                by_category[cat]['passed'] += 1
            else:
                by_category[cat]['failed'] += 1
        
        return {
            'run_id': str(run_id),
            'total': len(results),
            'passed': passed,
            'failed': failed,
            'pass_rate': (passed / len(results) * 100) if results else 0,
            'by_category': by_category,
        }
    except Exception as e:
        logger.error(f"Failed to get results summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_results(request: ExportRequest, db: Session = Depends(get_db)):
    """
    Export results in multiple formats (JSON, CSV)
    """
    try:
        # Get results
        results = db.query(CheckResult).filter(CheckResult.run_id == request.run_id).all()
        
        if not results:
            raise HTTPException(status_code=404, detail="No results found for this run")
        
        format_type = request.format.lower()
        
        if format_type == 'json':
            data = {
                'run_id': str(request.run_id),
                'exported_at': datetime.utcnow().isoformat(),
                'total_checks': len(results),
                'results': [
                    {
                        'id': str(r.id),
                        'check_name': r.check_name,
                        'outcome': r.outcome,
                        'message': r.message,
                        'details': json.loads(r.details) if isinstance(r.details, str) else r.details,
                    }
                    for r in results
                ]
            }
            content = json.dumps(data, indent=2)
            filename = f"results_{request.run_id}.json"
            media_type = "application/json"
        
        elif format_type == 'csv':
            output = BytesIO()
            writer = csv.writer(output)
            writer.writerow(['Check Name', 'Outcome', 'Message', 'Details'])
            for r in results:
                details_dict = json.loads(r.details) if isinstance(r.details, str) else r.details
                writer.writerow([
                    r.check_name,
                    r.outcome,
                    r.message,
                    json.dumps(details_dict) if details_dict else ''
                ])
            content = output.getvalue()
            filename = f"results_{request.run_id}.csv"
            media_type = "text/csv"
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")
        
        logger.info(f"Exporting results for run {request.run_id} as {format_type}")
        
        return {
            'filename': filename,
            'format': format_type,
            'size': len(content),
            'download_url': f'/api/v1/results/download/{request.run_id}?format={format_type}'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export results: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/runs/{run_id}/results/comparison")
async def compare_runs(
    run_id: UUID,
    previous_run_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """
    Compare results between current and previous run.
    Shows improvements, regressions, and new issues.
    """
    try:
        current_results = db.query(CheckResult).filter(
            CheckResult.run_id == run_id
        ).all()
        
        if not current_results:
            raise HTTPException(status_code=404, detail="Current run results not found")
        
        comparison = {
            'current_run_id': str(run_id),
            'results': {
                'total': len(current_results),
                'passed': sum(1 for r in current_results if r.outcome == 'pass'),
                'failed': sum(1 for r in current_results if r.outcome == 'fail'),
            }
        }
        
        if previous_run_id:
            previous_results = db.query(CheckResult).filter(
                CheckResult.run_id == previous_run_id
            ).all()
            
            if previous_results:
                comparison['previous_run_id'] = str(previous_run_id)
                comparison['previous_results'] = {
                    'total': len(previous_results),
                    'passed': sum(1 for r in previous_results if r.outcome == 'pass'),
                    'failed': sum(1 for r in previous_results if r.outcome == 'fail'),
                }
                
                # Calculate deltas
                comparison['improvements'] = (
                    (comparison['results']['passed'] - comparison['previous_results']['passed'])
                    if 'previous_results' in comparison else 0
                )
        
        return comparison
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compare runs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

