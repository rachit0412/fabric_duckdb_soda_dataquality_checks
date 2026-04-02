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
    """Per-check execution result."""
    __tablename__ = "check_results"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50))
    status = Column(String(50), nullable=False, index=True)
    metric_name = Column(String(255))
    metric_value = Column(Float)
    metric_threshold = Column(Float)
    query_used = Column(Text)
    execution_time_ms = Column(Integer)
    sample_failing_rows = Column(JSONB)
    error_message = Column(Text)
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
