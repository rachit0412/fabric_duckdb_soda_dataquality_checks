"""
FastAPI Routes: Results
View and export check execution results with flexible organization
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from datetime import datetime
import logging
import json
from io import BytesIO
import csv
from collections import defaultdict

from src.api.models import (
    CheckResultResponse, ResultsResponse, ExportRequest,
    ColumnChecksSummary, CheckCategorySummary, ResultsSummaryByColumn,
    DetailedResultsByColumn, TableLevelChecksSummary
)
from src.models.db import CheckResult, Run, CheckPlan
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["results"])


def categorize_check(check_name: str) -> str:
    """Infer check category from check name"""
    name_lower = check_name.lower()
    
    if any(word in name_lower for word in ['missing', 'null', 'incomplete', 'empty']):
        return 'Completeness'
    elif any(word in name_lower for word in ['duplicate', 'unique']):
        return 'Uniqueness'
    elif any(word in name_lower for word in ['invalid', 'pattern', 'format', 'email']):
        return 'Validity'
    elif any(word in name_lower for word in ['anomaly', 'outlier', 'std', 'deviation', 'z-score']):
        return 'Anomaly Detection'
    elif any(word in name_lower for word in ['row_count', 'rows', 'volume']):
        return 'Volume'
    elif any(word in name_lower for word in ['schema', 'column', 'type']):
        return 'Schema'
    elif any(word in name_lower for word in ['min', 'max', 'avg', 'mean', 'statistical']):
        return 'Statistics'
    elif any(word in name_lower for word in ['freshness', 'recency', 'timeliness']):
        return 'Freshness'
    else:
        return 'Other'


def calculate_quality_score(passed: int, total: int) -> float:
    """Calculate quality score 0-100 based on check results"""
    if total == 0:
        return 100.0
    return round((passed / total) * 100, 2)


def get_status_from_score(quality_score: float) -> str:
    """Determine status badge from quality score"""
    if quality_score >= 95:
        return 'PASS'
    elif quality_score >= 80:
        return 'WARN'
    elif quality_score >= 50:
        return 'FAIL'
    else:
        return 'ERROR'


@router.get("/runs/{run_id}/results", response_model=ResultsResponse)
async def get_run_results(run_id: UUID, db: Session = Depends(get_db)):
    """
    Get all check results for a specific run (legacy flat format).
    Use ?format=summary or ?format=detailed for organized views.
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


@router.get("/runs/{run_id}/results/by-column/summary", response_model=ResultsSummaryByColumn)
async def get_results_by_column_summary(
    run_id: UUID,
    sort_by: Literal['quality_score', 'column_name', 'failures_count'] = Query('quality_score', description="Sort columns by"),
    sort_order: Literal['asc', 'desc'] = Query('desc', description="Sort ascending or descending"),
    db: Session = Depends(get_db)
):
    """
    Get results organized by COLUMN with compact summaries.
    Perfect for browsing datasets with 100+ columns.
    
    Returns:
    - Column-level quality scores
    - Check breakdown by category per column
    - Top failing checks per column
    - Summary statistics about overall quality
    """
    try:
        # Get run
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        # Get all results for this run
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        if not results:
            return ResultsSummaryByColumn(
                run_id=run.id,
                check_plan_id=run.check_plan_id,
                status=run.status,
                summary_stats={},
                columns=[],
                total_columns=0,
                columns_with_failures=0,
                completed_at=run.completed_at
            )
        
        # Group by column
        by_column: Dict[str, List[CheckResult]] = defaultdict(list)
        table_level_results: List[CheckResult] = []
        
        for result in results:
            # Extract column name from check_name or details
            column_name = None
            
            # Try to get from details first
            try:
                details = json.loads(result.details) if isinstance(result.details, str) else (result.details or {})
                column_name = details.get('column')
            except:
                pass
            
            # If no column in details, check the check_name format
            # Common format: "table.column.check_type" or "column.check_type"
            if not column_name and '.' in result.check_name:
                parts = result.check_name.split('.')
                if len(parts) >= 2:
                    # Assume second part is column (adjust based on actual format)
                    column_name = parts[1]
            
            if column_name and column_name != 'None':
                by_column[column_name].append(result)
            else:
                table_level_results.append(result)
        
        # Build column summaries
        column_summaries: List[ColumnChecksSummary] = []
        
        for column_name, column_results in by_column.items():
            passed = sum(1 for r in column_results if r.outcome == 'pass')
            failed = sum(1 for r in column_results if r.outcome == 'fail')
            warned = sum(1 for r in column_results if r.outcome == 'warn')
            total = len(column_results)
            
            quality_score = calculate_quality_score(passed, total)
            status = get_status_from_score(quality_score)
            
            # Group by category
            by_category: Dict[str, List[CheckResult]] = defaultdict(list)
            for result in column_results:
                category = categorize_check(result.check_name)
                by_category[category].append(result)
            
            # Build category summaries
            category_summaries: List[CheckCategorySummary] = []
            for category, cat_results in by_category.items():
                cat_passed = sum(1 for r in cat_results if r.outcome == 'pass')
                cat_failed = sum(1 for r in cat_results if r.outcome == 'fail')
                cat_total = len(cat_results)
                
                category_summaries.append(CheckCategorySummary(
                    category=category,
                    total=cat_total,
                    passed=cat_passed,
                    failed=cat_failed,
                    pass_rate=round((cat_passed / cat_total * 100), 2) if cat_total > 0 else 100.0,
                    checks=[
                        {
                            'check_name': r.check_name,
                            'outcome': r.outcome,
                            'message': r.message,
                            'metrics': json.loads(r.metrics) if isinstance(r.metrics, str) else (r.metrics or {})
                        }
                        for r in cat_results
                    ]
                ))
            
            # Get top failing checks (up to 3)
            failing_checks = [r for r in column_results if r.outcome != 'pass']
            top_issues = [
                {
                    'check_name': r.check_name,
                    'outcome': r.outcome,
                    'message': r.message,
                    'details': json.loads(r.details) if isinstance(r.details, str) else (r.details or {})
                }
                for r in sorted(failing_checks, key=lambda x: x.created_at, reverse=True)[:3]
            ] if failing_checks else None
            
            column_summaries.append(ColumnChecksSummary(
                column_name=column_name,
                total_checks=total,
                passed_checks=passed,
                failed_checks=failed,
                warned_checks=warned,
                quality_score=quality_score,
                status=status,
                check_categories=sorted(category_summaries, key=lambda x: x.pass_rate),
                top_issues=top_issues
            ))
        
        # Sort columns
        sort_key = {
            'quality_score': lambda x: x.quality_score,
            'column_name': lambda x: x.column_name,
            'failures_count': lambda x: x.failed_checks
        }.get(sort_by, lambda x: x.quality_score)
        
        column_summaries.sort(key=sort_key, reverse=(sort_order == 'desc'))
        
        # Calculate summary stats
        total_checks = sum(len(r) for r in by_column.values())
        total_passed = sum(sum(1 for r in results if r.outcome == 'pass') for results in by_column.values())
        total_failed = sum(sum(1 for r in results if r.outcome == 'fail') for results in by_column.values())
        
        critical_columns = sum(1 for s in column_summaries if s.quality_score < 50)
        warning_columns = sum(1 for s in column_summaries if 50 <= s.quality_score < 80)
        
        # Build table-level summary
        table_level_summary = None
        if table_level_results:
            table_passed = sum(1 for r in table_level_results if r.outcome == 'pass')
            table_failed = sum(1 for r in table_level_results if r.outcome == 'fail')
            
            table_level_summary = TableLevelChecksSummary(
                total_checks=len(table_level_results),
                passed_checks=table_passed,
                failed_checks=table_failed,
                checks=[
                    {
                        'check_name': r.check_name,
                        'outcome': r.outcome,
                        'message': r.message,
                        'metrics': json.loads(r.metrics) if isinstance(r.metrics, str) else (r.metrics or {})
                    }
                    for r in table_level_results
                ]
            )
        
        return ResultsSummaryByColumn(
            run_id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            summary_stats={
                'total_columns': len(by_column),
                'total_checks': total_checks,
                'passed_checks': total_passed,
                'failed_checks': total_failed,
                'overall_quality_score': calculate_quality_score(total_passed, total_checks) if total_checks > 0 else 100.0,
                'critical_columns': critical_columns,
                'warning_columns': warning_columns,
                'healthy_columns': len(column_summaries) - critical_columns - warning_columns
            },
            columns=column_summaries,
            table_level_checks=table_level_summary,
            total_columns=len(by_column),
            columns_with_failures=sum(1 for s in column_summaries if s.failed_checks > 0),
            completed_at=run.completed_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get column summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs/{run_id}/results/by-column/detailed", response_model=DetailedResultsByColumn)
async def get_results_by_column_detailed(
    run_id: UUID,
    column_filter: Optional[str] = Query(None, description="Filter by column name (substring)"),
    limit_columns: Optional[int] = Query(None, description="Limit number of columns to return"),
    db: Session = Depends(get_db)
):
    """
    Get results organized by COLUMN with FULL check details.
    Useful for deep-diving into specific columns.
    
    Returns:
    - All check results grouped by column
    - Complete details for each check result
    - Support for filtering and limiting columns
    """
    try:
        # Get run
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        
        # Get all results for this run
        results = db.query(CheckResult).filter(CheckResult.run_id == run_id).all()
        
        if not results:
            return DetailedResultsByColumn(
                run_id=run.id,
                check_plan_id=run.check_plan_id,
                status=run.status,
                summary_stats={},
                columns={},
                completed_at=run.completed_at
            )
        
        # Group by column and convert to response format
        columns_dict: Dict[str, List[CheckResultResponse]] = defaultdict(list)
        table_level_results: List[CheckResultResponse] = []
        
        for result in results:
            # Extract column name
            column_name = None
            try:
                details = json.loads(result.details) if isinstance(result.details, str) else (result.details or {})
                column_name = details.get('column')
            except:
                pass
            
            if not column_name and '.' in result.check_name:
                parts = result.check_name.split('.')
                if len(parts) >= 2:
                    column_name = parts[1]
            
            # Convert to CheckResultResponse
            check_response = CheckResultResponse(
                id=result.id,
                check_name=result.check_name,
                outcome=result.outcome,
                message=result.message,
                details=json.loads(result.details) if isinstance(result.details, str) else (result.details or {}),
                failed_rows=json.loads(result.failed_rows) if isinstance(result.failed_rows, str) else (result.failed_rows or []),
                metrics=json.loads(result.metrics) if isinstance(result.metrics, str) else (result.metrics or {}),
                created_at=result.created_at,
            )
            
            if column_name and column_name != 'None':
                columns_dict[column_name].append(check_response)
            else:
                table_level_results.append(check_response)
        
        # Apply filters
        if column_filter:
            columns_dict = {
                k: v for k, v in columns_dict.items()
                if column_filter.lower() in k.lower()
            }
        
        # Apply limit
        if limit_columns:
            columns_dict = dict(list(columns_dict.items())[:limit_columns])
        
        # Calculate summary stats
        all_results = list(columns_dict.values())
        total_results = sum(len(r) for r in all_results) + len(table_level_results)
        passed = sum(sum(1 for r in col_results if r.outcome == 'pass') for col_results in all_results)
        failed = sum(sum(1 for r in col_results if r.outcome == 'fail') for col_results in all_results)
        
        return DetailedResultsByColumn(
            run_id=run.id,
            check_plan_id=run.check_plan_id,
            status=run.status,
            summary_stats={
                'total_columns': len(columns_dict),
                'total_checks': total_results,
                'passed_checks': passed,
                'failed_checks': failed,
                'overall_quality_score': calculate_quality_score(passed, total_results) if total_results > 0 else 100.0
            },
            columns=columns_dict,
            table_level_checks=table_level_results if table_level_results else None,
            completed_at=run.completed_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get detailed column results: {e}", exc_info=True)
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

