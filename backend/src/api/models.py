from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# ============== Connection Models ==============
class ConnectionCreate(BaseModel):
    name: str
    type: str  # postgres, bigquery, csv, etc.
    remote_url: Optional[str] = None
    secret: Optional[str] = None  # Will be encrypted

class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    type: str
    created_at: datetime
    created_by: Optional[UUID] = None

# ============== Metadata Models ==============
class ColumnProfile(BaseModel):
    name: str
    type: str
    nullable: bool
    row_count: int
    null_count: int
    distinct_count: int
    is_pk: Optional[bool] = False
    pii: Optional[bool] = False
    min: Optional[Any] = None
    max: Optional[Any] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    mean: Optional[float] = None
    stddev: Optional[float] = None

class SchemaDefinition(BaseModel):
    columns: List[ColumnProfile]
    row_count: int

class MetadataProfileRequest(BaseModel):
    connection_id: UUID
    dataset_name: Optional[str] = None
    tables: Optional[List[str]] = None

class MetadataProfileResponse(BaseModel):
    """Response for metadata profiling operations"""
    snapshot_id: UUID
    connection_id: UUID
    schema: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    profiled_at: datetime

class MetadataSnapshotResponse(BaseModel):
    id: UUID
    connection_id: UUID
    dataset_name: str
    record_count: int
    column_count: int
    created_at: datetime
    schema_preview: Optional[Dict[str, Any]] = None

# ============== Suggestion Models ==============
class CheckSuggestionDTO(BaseModel):
    id: UUID
    rule_id: str
    check_name: str
    check_type: str  # Completeness, Uniqueness, Validity, etc.
    rationale: str
    confidence: float = Field(..., ge=0, le=1)
    suggested_yaml: str

class SuggestionsRequest(BaseModel):
    metadata_snapshot_id: Optional[UUID] = None
    connection_id: Optional[UUID] = None  # Alternative: get latest snapshot for connection
    confidence_threshold: Optional[float] = 0.5

class SuggestionsResponse(BaseModel):
    metadata_snapshot_id: UUID
    suggestions: List[Dict[str, Any]]
    total_suggestions: int
    generated_at: Optional[datetime] = None

# ============== Check Library Models ==============
class CheckTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str  # Completeness, Uniqueness, etc.
    template: str  # SodaCL template

class CheckLibraryResponse(BaseModel):
    categories: Dict[str, List[CheckTemplate]]

# ============== Check Plan Models ==============
class CheckSelection(BaseModel):
    template_id: str
    columns: Optional[List[str]] = None
    threshold: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None

class CheckPlanCreate(BaseModel):
    name: str
    metadata_snapshot_id: Optional[UUID] = None
    connection_id: Optional[UUID] = None
    dataset_identifier: Optional[str] = None
    description: Optional[str] = None
    checks_yaml: Optional[str] = None
    custom_checks_yaml: Optional[str] = None
    enabled: Optional[bool] = True

class CheckPlanResponse(BaseModel):
    id: UUID
    name: str
    connection_id: UUID
    description: Optional[str]
    metadata_snapshot_id: UUID
    dataset_identifier: str
    checks_yaml: str
    custom_checks_yaml: Optional[str] = None
    enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

# ============== Run Models ==============
class RunCreate(BaseModel):
    check_plan_id: UUID
    environment: str = "dev"

class RunResponse(BaseModel):
    id: UUID
    check_plan_id: UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_checks: int
    passed_checks: int
    failed_checks: int
    warning_checks: int = 0

class RunStatusResponse(BaseModel):
    id: UUID
    check_plan_id: UUID
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    progress_percent: float = 0

# ============== Result Models ==============
class CheckResultDTO(BaseModel):
    check_name: str
    check_type: str
    status: str
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    metric_threshold: Optional[float] = None
    execution_time_ms: int
    query_used: Optional[str] = None
    sample_failing_rows: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None

class CheckResultResponse(BaseModel):
    id: UUID
    check_name: str
    outcome: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    failed_rows: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: datetime

# ============== Column-Level Summary Models ==============
class CheckCategorySummary(BaseModel):
    """Summary of checks by category for a column"""
    category: str
    total: int
    passed: int
    failed: int
    pass_rate: float
    checks: List[Dict[str, Any]] = []  # List of {check_name, outcome, message}

class ColumnChecksSummary(BaseModel):
    """Complete summary of all checks for a single column"""
    column_name: str
    column_type: Optional[str] = None
    total_checks: int
    passed_checks: int
    failed_checks: int
    warned_checks: int = 0
    quality_score: float  # 0-100, based on pass_rate
    status: str  # PASS, WARN, FAIL, ERROR
    check_categories: List[CheckCategorySummary]
    top_issues: Optional[List[Dict[str, Any]]] = None  # Top 3 failing checks
    
class TableLevelChecksSummary(BaseModel):
    """Summary of table-level checks (non-column specific)"""
    total_checks: int
    passed_checks: int
    failed_checks: int
    checks: List[Dict[str, Any]] = []  # List of {check_name, outcome, message}

class ResultsSummaryByColumn(BaseModel):
    """Column-organized view of results - COMPACT for browsing many columns"""
    run_id: UUID
    check_plan_id: UUID
    status: str
    summary_stats: Dict[str, Any]  # {total_columns, critical_columns, columns_by_quality, etc.}
    columns: List[ColumnChecksSummary]  # Ordered by quality_score (worst first)
    table_level_checks: Optional[TableLevelChecksSummary] = None
    total_columns: int
    columns_with_failures: int
    completed_at: Optional[datetime] = None

class DetailedResultsByColumn(BaseModel):
    """Column-organized view with FULL details for each check"""
    run_id: UUID
    check_plan_id: UUID
    status: str
    summary_stats: Dict[str, Any]
    columns: Dict[str, List[CheckResultResponse]]  # {column_name: [detailed results]}
    table_level_checks: Optional[List[CheckResultResponse]] = None
    completed_at: Optional[datetime] = None

class ResultsResponse(BaseModel):
    """Legacy flat results format (for backward compatibility)"""
    run_id: UUID
    check_plan_id: UUID
    status: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    completed_at: Optional[datetime] = None
    results: List[CheckResultResponse]

# ============== Export Models ==============
class ExportRequest(BaseModel):
    format: str = "json"  # json or html

class ExportResponse(BaseModel):
    data: str
    format: str
    content_type: str
