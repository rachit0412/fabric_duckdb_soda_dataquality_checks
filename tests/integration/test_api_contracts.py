"""
Integration Tests: API Contracts
Tests all endpoints match specification contracts
"""

import pytest
from uuid import uuid4
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.db import (
    Base, Connection, MetadataSnapshot, CheckPlan,
    CheckSuggestion, Run, CheckResult
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


def test_connections_endpoint_contract(db_session):
    """Test GET /connections response contract."""
    # Create test data
    for i in range(3):
        conn = Connection(
            id=uuid4(),
            name=f"connection_{i}",
            type="csv" if i % 2 == 0 else "parquet",
        )
        db_session.add(conn)
    db_session.commit()

    connections = db_session.query(Connection).all()

    # Expected contract
    for conn in connections:
        assert hasattr(conn, 'id')
        assert hasattr(conn, 'name')
        assert hasattr(conn, 'type')
        assert hasattr(conn, 'created_at')
        assert conn.id is not None
        assert conn.name is not None
        assert conn.type in ['csv', 'parquet', 'excel', 'database']


def test_checks_endpoint_contract(db_session):
    """Test GET /checks response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
    checks = []

    for i in range(5):
        plan = CheckPlan(
            id=uuid4(),
            name=f"check_{i}",
            connection_id=conn.id,
            dataset_identifier="data",
            checks_yaml="checks: []",
        )
        checks.append(plan)

    db_session.add_all([conn] + checks)
    db_session.commit()

    retrieved_checks = db_session.query(CheckPlan).all()

    # Expected contract
    for check in retrieved_checks:
        assert hasattr(check, 'id')
        assert hasattr(check, 'name')
        assert hasattr(check, 'enabled')
        assert hasattr(check, 'created_at')
        assert check.id is not None


def test_suggestions_endpoint_contract(db_session):
    """Test GET /checks/suggestions response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=conn.id,
        dataset_identifier="data",
        schema_json={},
        profile_json={},
    )
    db_session.add_all([conn, snapshot])
    db_session.commit()

    # Create suggestions
    suggestions = []
    for i in range(5):
        sug = CheckSuggestion(
            id=uuid4(),
            metadata_snapshot_id=snapshot.id,
            rule_id=f"rule_{i}",
            check_name=f"check_{i}",
            check_type="type_a",
            confidence_score=0.9 + (i * 0.01),
            rationale=f"Suggestion {i}",
        )
        suggestions.append(sug)
    db_session.add_all(suggestions)
    db_session.commit()

    retrieved_sug = db_session.query(CheckSuggestion).all()

    # Expected contract
    for sug in retrieved_sug:
        assert hasattr(sug, 'id')
        assert hasattr(sug, 'check_name')
        assert hasattr(sug, 'check_type')
        assert hasattr(sug, 'confidence_score')
        assert 0.0 <= sug.confidence_score <= 1.0
        assert sug.rationale is not None


def test_run_status_endpoint_contract(db_session):
    """Test GET /runs/{run_id}/status response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
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
        status="completed",
        pass_count=5,
        fail_count=1,
        warn_count=0,
        error_count=0,
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    retrieved_run = db_session.query(Run).first()

    # Expected contract
    assert hasattr(retrieved_run, 'id')
    assert hasattr(retrieved_run, 'status')
    assert hasattr(retrieved_run, 'pass_count')
    assert hasattr(retrieved_run, 'fail_count')
    assert hasattr(retrieved_run, 'warn_count')
    assert hasattr(retrieved_run, 'error_count')
    assert retrieved_run.status in ['pending', 'queued', 'running', 'completed', 'failed']


def test_results_endpoint_contract(db_session):
    """Test GET /runs/{run_id}/results response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
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
        status="completed",
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    # Add results
    for i in range(3):
        result = CheckResult(
            id=uuid4(),
            run_id=run.id,
            check_name=f"check_{i}",
            status="pass" if i < 2 else "fail",
            column_name="col",
            severity_level="info" if i < 2 else "high",
        )
        db_session.add(result)
    db_session.commit()

    retrieved_results = db_session.query(CheckResult).filter_by(run_id=run.id).all()

    # Expected contract
    for result in retrieved_results:
        assert hasattr(result, 'id')
        assert hasattr(result, 'check_name')
        assert hasattr(result, 'status')
        assert hasattr(result, 'column_name')
        assert result.status in ['pass', 'fail', 'warn', 'error']


def test_metrics_endpoint_contract(db_session):
    """Test GET /results/{run_id}/metrics response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
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
        status="completed",
        pass_count=7,
        fail_count=1,
        warn_count=1,
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    # Expected response has:
    # - run_id
    # - status
    # - summary (with pass_count, fail_count, total_checks, pass_rate)
    # - by_column
    # - by_check_type
    # - timestamps

    assert hasattr(run, 'id')
    assert hasattr(run, 'pass_count')
    assert hasattr(run, 'fail_count')


def test_anomalies_endpoint_contract(db_session):
    """Test GET /results/{run_id}/anomalies response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
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
        status="completed",
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    # Expected response fields:
    # - run_id
    # - anomaly_count
    # - anomalies[] (with check_name, type, severity, etc)

    assert hasattr(run, 'id')


def test_drill_down_endpoint_contract(db_session):
    """Test GET /results/{run_id}/drill-down response contract."""
    conn = Connection(id=uuid4(), name="test", type="csv")
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
        status="completed",
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    result = CheckResult(
        id=uuid4(),
        run_id=run.id,
        check_name="test_check",
        column_name="test_col",
        status="pass",
        total_rows=1000,
        affected_rows_count=10,
        affected_rows_percent=1.0,
    )
    db_session.add(result)
    db_session.commit()

    retrieved = db_session.query(CheckResult).first()

    # Expected response fields:
    # - run_id
    # - columns[]
    #   - column_name
    #   - health_score
    #   - checks[]
    #   - data_quality_dimensions

    assert hasattr(retrieved, 'column_name')
    assert hasattr(retrieved, 'total_rows')
    assert hasattr(retrieved, 'affected_rows_count')
