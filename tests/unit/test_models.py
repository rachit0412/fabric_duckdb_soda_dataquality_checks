"""
Unit Tests: Database Models
Tests ORM model validation and constraints
"""

import pytest
from uuid import uuid4
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.db import (
    Base, Connection, MetadataSnapshot, CheckPlan,
    CheckSuggestion, Run, CheckResult, JobQueue
)
from src.storage.db import SessionLocal


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_connection_model_fields(db_session):
    """Test Connection model has required fields."""
    conn = Connection(
        id=uuid4(),
        name="test_connection",
        type="csv",
        remote_url="/path/to/file",
        encrypted_secret="secret_key",
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).first()
    assert hasattr(retrieved, 'id')
    assert hasattr(retrieved, 'name')
    assert hasattr(retrieved, 'type')
    assert hasattr(retrieved, 'created_at')
    assert retrieved.name == "test_connection"


def test_metadata_snapshot_model_validation(db_session):
    """Test MetadataSnapshot model validation."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    db_session.add(conn)
    db_session.commit()

    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=conn.id,
        dataset_identifier="test_data",
        schema_json={"columns": []},
        profile_json={"stats": {}},
        row_count=1000,
    )
    db_session.add(snapshot)
    db_session.commit()

    retrieved = db_session.query(MetadataSnapshot).first()
    assert retrieved.row_count == 1000
    assert retrieved.schema_json is not None


def test_check_plan_model_required_fields(db_session):
    """Test CheckPlan model has all required fields."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    db_session.add(conn)
    db_session.commit()

    plan = CheckPlan(
        id=uuid4(),
        name="test_plan",
        connection_id=conn.id,
        dataset_identifier="data",
        checks_yaml="checks: []",
        enabled=True,
    )
    db_session.add(plan)
    db_session.commit()

    retrieved = db_session.query(CheckPlan).first()
    assert retrieved.name == "test_plan"
    assert retrieved.checks_yaml == "checks: []"
    assert retrieved.enabled is True


def test_run_model_status_field(db_session):
    """Test Run model status field."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    plan = CheckPlan(
        id=uuid4(),
        name="test_plan",
        connection_id=conn.id,
        dataset_identifier="data",
        checks_yaml="checks: []",
    )
    db_session.add_all([conn, plan])
    db_session.commit()

    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
        status="pending",
        pass_count=0,
        fail_count=0,
        warn_count=0,
        error_count=0,
    )
    db_session.add(run)
    db_session.commit()

    retrieved = db_session.query(Run).first()
    assert retrieved.status == "pending"
    assert retrieved.status in ['pending', 'queued', 'running', 'completed', 'failed']


def test_check_result_comprehensive_fields(db_session):
    """Test CheckResult model has all required detail fields."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    plan = CheckPlan(
        id=uuid4(),
        name="test_plan",
        connection_id=conn.id,
        dataset_identifier="data",
        checks_yaml="checks: []",
    )
    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
        status="completed",
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    result = CheckResult(
        id=uuid4(),
        run_id=run.id,
        check_name="missing_count_email",
        check_type="missing_count",
        column_name="email",
        status="fail",
        metric_name="null_count",
        metric_value=150,
        expected_value=0,
        metric_threshold=10,
        total_rows=10000,
        affected_rows_count=150,
        affected_rows_percent=1.5,
        validation_rule="email IS NOT NULL",
        comparison_operator="<=",
        severity_level="high",
        data_quality_dimension="Completeness",
    )
    db_session.add(result)
    db_session.commit()

    retrieved = db_session.query(CheckResult).first()
    assert retrieved.metric_value == 150
    assert retrieved.affected_rows_percent == 1.5
    assert retrieved.severity_level == "high"
    assert retrieved.data_quality_dimension == "Completeness"


def test_job_queue_model(db_session):
    """Test JobQueue model for background tasks."""
    job = JobQueue(
        id=uuid4(),
        job_type="execute_checks",
        status="pending",
        payload={"check_plan_id": "test_id"},
    )
    db_session.add(job)
    db_session.commit()

    retrieved = db_session.query(JobQueue).first()
    assert retrieved.job_type == "execute_checks"
    assert retrieved.status == "pending"


def test_model_timestamps(db_session):
    """Test that models have proper timestamp fields."""
    conn = Connection(
        id=uuid4(),
        name="test_connection",
        type="csv",
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).first()
    assert retrieved.created_at is not None
    assert isinstance(retrieved.created_at, datetime)
    assert retrieved.updated_at is not None


def test_model_relationships(db_session):
    """Test model relationships are properly defined."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    plan = CheckPlan(
        id=uuid4(),
        name="plan",
        connection_id=conn.id,
        dataset_identifier="data",
        checks_yaml="checks: []",
    )
    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
    )

    db_session.add_all([conn, plan, run])
    db_session.commit()

    # Verify relationships
    retrieved_run = db_session.query(Run).first()
    assert retrieved_run.check_plan_id == plan.id
    assert retrieved_run.connection_id == conn.id
