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
    """Deprecated - use MetadataSnapshotResponse"""
    pass

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
    metadata_snapshot_id: UUID
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
    metadata_snapshot_id: UUID
    description: Optional[str] = None
    checks: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = True

class CheckPlanResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    metadata_snapshot_id: UUID
    check_count: int
    is_active: bool
    created_at: datetime
    created_by: Optional[UUID] = None

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

class RunStatusResponse(BaseModel):
    id: UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
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

class ResultsResponse(BaseModel):
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
