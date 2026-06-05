from sqlalchemy import Column, String, UUID, DateTime, Integer, Float, Boolean, Text, CheckConstraint, Index, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime
import uuid

Base = declarative_base()

class Connection(Base):
    """Data source connection credentials (encrypted)."""
    __tablename__ = "connections"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    remote_url = Column(Text)
    encrypted_secret = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(PG_UUID(as_uuid=True))

class MetadataSnapshot(Base):
    """Versioned schema + profile data."""
    __tablename__ = "metadata_snapshots"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    dataset_identifier = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    schema_json = Column(JSONB, nullable=False)
    profile_json = Column(JSONB, nullable=False)
    row_count = Column(Integer)
    profile_duration_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    __table_args__ = (
        Index('idx_meta_conn_dataset', 'connection_id', 'dataset_identifier'),
    )

class CheckPlan(Base):
    """User-defined check plan."""
    __tablename__ = "check_plans"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    metadata_snapshot_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    dataset_identifier = Column(String(255), nullable=False)
    description = Column(Text)
    checks_yaml = Column(Text, nullable=False)
    custom_checks_yaml = Column(Text)
    check_engine = Column(String(50), default='soda', server_default='soda')
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(PG_UUID(as_uuid=True))
    
    __table_args__ = (
        Index('idx_plan_conn_dataset', 'connection_id', 'dataset_identifier'),
    )

class CheckSuggestion(Base):
    """Heuristic-generated check suggestion."""
    __tablename__ = "check_suggestions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metadata_snapshot_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    suggestion_set_id = Column(PG_UUID(as_uuid=True))
    rule_id = Column(String(100), nullable=False)
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50), nullable=False, index=True)
    rationale = Column(Text)
    suggested_check_yaml = Column(Text)
    confidence_score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

class Run(Base):
    """Check execution record."""
    __tablename__ = "runs"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_plan_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False)
    status = Column(String(50), default='pending', index=True)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    total_duration_ms = Column(Integer)
    pass_count = Column(Integer, default=0)
    warn_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_message = Column(Text)
    environment = Column(String(50), default='dev')
    created_by = Column(PG_UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)

class CheckResult(Base):
    """Per-check execution result with comprehensive details."""
    __tablename__ = "check_results"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    
    # Basic Check Identity
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50))
    column_name = Column(String(255), index=True)  # Column being checked
    status = Column(String(50), nullable=False, index=True)  # pass, fail, warn, error
    
    # Metric Details (detailed level)
    metric_name = Column(String(255))
    metric_value = Column(Float)  # Actual value found
    expected_value = Column(Float)  # Expected/threshold value
    metric_threshold = Column(Float)  # Tolerance threshold
    metric_unit = Column(String(100))  # e.g., 'count', 'percent', '%', 'rows'
    
    # Validation Rule Details
    validation_rule = Column(Text)  # Full rule description (e.g., "NOT NULL", "matches regex", "between 0-100")
    comparison_operator = Column(String(50))  # =, !=, >, <, >=, <=, contains, matches, etc.
    
    # Detailed Results (lowest level breakdown)
    total_rows = Column(Integer)  # Total rows in dataset
    affected_rows_count = Column(Integer)  # Number of rows affected/failing
    affected_rows_percent = Column(Float)  # Percentage of affected rows
    
    # Sample Failing Rows (detailed inspection)
    sample_failing_rows = Column(JSONB)  # First N rows that failed (with context)
    sample_passing_rows = Column(JSONB)  # Example of passing rows (for comparison)
    
    # Query & Execution Details
    query_used = Column(Text)  # Exact SQL/DuckDB query executed
    execution_time_ms = Column(Integer)  # How long the check took
    memory_used_mb = Column(Float)  # Memory consumed during execution
    
    # Error/Warning Details
    error_message = Column(Text)  # If check errored
    warning_message = Column(Text)  # If check has warnings
    remediation_steps = Column(JSONB)  # Suggested fixes as array
    
    # Additional Context
    validation_context = Column(JSONB)  # Full context: {rule, operator, threshold, etc}
    check_metadata = Column(JSONB)  # Custom metadata about this check
    data_quality_dimension = Column(String(100))  # Completeness, Uniqueness, Validity, etc.
    severity_level = Column(String(50))  # critical, high, medium, low
    
    created_at = Column(DateTime(timezone=True), default=func.now())

class JobQueue(Base):
    """Async job queue."""
    __tablename__ = "job_queue"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    status = Column(String(50), default='pending', index=True)
    worker_id = Column(String(100))
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_detail = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

class AuditLog(Base):
    """Audit trail of user actions."""
    __tablename__ = "audit_logs"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(PG_UUID(as_uuid=True))
    details = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)
