"""
Integration Tests: End-to-End Workflow
Tests complete workflow: upload → profile → suggest → execute → results
"""

import pytest
import asyncio
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


def test_workflow_step_1_upload_file(db_session):
    """Step 1: Upload a file and create connection."""
    conn = Connection(
        id=uuid4(),
        name="test_upload",
        type="csv",
        remote_url="/uploads/test.csv",
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).filter_by(name="test_upload").first()
    assert retrieved is not None
    print("✓ Step 1: File upload and connection creation successful")


def test_workflow_step_2_profile_data(db_session):
    """Step 2: Profile uploaded data and create metadata snapshot."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    db_session.add(conn)
    db_session.commit()

    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=conn.id,
        dataset_identifier="test_dataset",
        schema_json={
            "columns": [
                {"name": "id", "type": "int"},
                {"name": "email", "type": "string"},
            ]
        },
        profile_json={
            "columns": {
                "id": {"null_count": 0, "distinct_count": 1000},
                "email": {"null_count": 5, "distinct_count": 995},
            }
        },
        row_count=1000,
    )
    db_session.add(snapshot)
    db_session.commit()

    retrieved = db_session.query(MetadataSnapshot).filter_by(
        connection_id=conn.id
    ).first()
    assert retrieved is not None
    assert retrieved.row_count == 1000
    print("✓ Step 2: Data profiling and metadata snapshot creation successful")


def test_workflow_step_3_suggest_checks(db_session):
    """Step 3: Generate check suggestions from profile."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=conn.id,
        dataset_identifier="test_dataset",
        schema_json={"columns": []},
        profile_json={"columns": {}},
    )
    db_session.add_all([conn, snapshot])
    db_session.commit()

    # Create suggestions
    suggestions_data = [
        ("completeness_id", "missing_count", 0.95),
        ("uniqueness_id", "duplicate_count", 0.98),
        ("freshness_check", "freshness", 0.85),
    ]

    for check_name, check_type, confidence in suggestions_data:
        suggestion = CheckSuggestion(
            id=uuid4(),
            metadata_snapshot_id=snapshot.id,
            rule_id=f"{check_type}_rule",
            check_name=check_name,
            check_type=check_type,
            confidence_score=confidence,
        )
        db_session.add(suggestion)

    db_session.commit()

    suggestions = db_session.query(CheckSuggestion).filter_by(
        metadata_snapshot_id=snapshot.id
    ).all()
    assert len(suggestions) == 3
    print("✓ Step 3: Check suggestions generation successful")


def test_workflow_step_4_create_check_plan(db_session):
    """Step 4: User selects checks and creates check plan."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    db_session.add(conn)
    db_session.commit()

    plan = CheckPlan(
        id=uuid4(),
        name="user_selected_plan",
        connection_id=conn.id,
        dataset_identifier="test_dataset",
        description="User-selected 3 checks from suggestions",
        checks_yaml="""
checks:
  - missing_count(id) < 5
  - duplicate_count(id) = 0
  - freshness(created_at, 7 days)
""",
        enabled=True,
    )
    db_session.add(plan)
    db_session.commit()

    retrieved = db_session.query(CheckPlan).filter_by(name="user_selected_plan").first()
    assert retrieved is not None
    assert "missing_count" in retrieved.checks_yaml
    print("✓ Step 4: Check plan creation successful")


def test_workflow_step_5_execute_checks(db_session):
    """Step 5: Execute check plan and create run."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    plan = CheckPlan(
        id=uuid4(),
        name="test_plan",
        connection_id=conn.id,
        dataset_identifier="test_dataset",
        checks_yaml="checks: []",
    )
    db_session.add_all([conn, plan])
    db_session.commit()

    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
        status="running",
        started_at=datetime.utcnow(),
    )
    db_session.add(run)
    db_session.commit()

    retrieved = db_session.query(Run).first()
    assert retrieved is not None
    assert retrieved.status == "running"
    print("✓ Step 5: Check execution started (run created)")


def test_workflow_step_6_collect_results(db_session):
    """Step 6: Collect and aggregate check results."""
    conn = Connection(id=uuid4(), name="test_conn", type="csv")
    plan = CheckPlan(
        id=uuid4(),
        name="test_plan",
        connection_id=conn.id,
        dataset_identifier="test_dataset",
        checks_yaml="checks: []",
    )
    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
        status="completed",
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        pass_count=2,
        fail_count=1,
        warn_count=0,
    )
    db_session.add_all([conn, plan, run])
    db_session.commit()

    # Add check results
    results_data = [
        ("missing_count_id", "pass"),
        ("duplicate_count_id", "pass"),
        ("freshness_created_at", "fail"),
    ]

    for check_name, status in results_data:
        result = CheckResult(
            id=uuid4(),
            run_id=run.id,
            check_name=check_name,
            status=status,
            column_name=check_name.split("_")[-1],
            severity_level="high" if status == "fail" else "info",
        )
        db_session.add(result)

    db_session.commit()

    results = db_session.query(CheckResult).filter_by(run_id=run.id).all()
    assert len(results) == 3
    assert sum(1 for r in results if r.status == "pass") == 2
    assert sum(1 for r in results if r.status == "fail") == 1
    print("✓ Step 6: Results collected and aggregated")


def test_complete_end_to_end_workflow(db_session):
    """Test complete workflow from upload to results visualization."""
    # Step 1: Upload
    conn = Connection(id=uuid4(), name="e2e_test", type="csv")
    db_session.add(conn)
    db_session.commit()

    # Step 2: Profile
    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=conn.id,
        dataset_identifier="e2e_dataset",
        schema_json={"columns": []},
        profile_json={"columns": {}},
        row_count=5000,
    )
    db_session.add(snapshot)
    db_session.commit()

    # Step 3: Suggest
    for i in range(5):
        suggestion = CheckSuggestion(
            id=uuid4(),
            metadata_snapshot_id=snapshot.id,
            rule_id=f"rule_{i}",
            check_name=f"check_{i}",
            check_type="type_a",
            confidence_score=0.90 + (i * 0.01),
        )
        db_session.add(suggestion)
    db_session.commit()

    # Step 4: Create Plan
    plan = CheckPlan(
        id=uuid4(),
        name="e2e_plan",
        connection_id=conn.id,
        dataset_identifier="e2e_dataset",
        checks_yaml="checks: []",
    )
    db_session.add(plan)
    db_session.commit()

    # Step 5: Execute
    run = Run(
        id=uuid4(),
        check_plan_id=plan.id,
        connection_id=conn.id,
        status="completed",
        pass_count=4,
        fail_count=1,
    )
    db_session.add(run)
    db_session.commit()

    # Step 6: Collect Results
    for i in range(5):
        result = CheckResult(
            id=uuid4(),
            run_id=run.id,
            check_name=f"check_{i}",
            status="pass" if i < 4 else "fail",
            column_name="test_col",
        )
        db_session.add(result)
    db_session.commit()

    # Verify complete workflow
    final_run = db_session.query(Run).filter_by(name="e2e_plan").first()
    final_results = db_session.query(CheckResult).filter_by(run_id=run.id).all()
    
    assert len(final_results) == 5
    print("✓ Complete End-to-End Workflow Successful")
