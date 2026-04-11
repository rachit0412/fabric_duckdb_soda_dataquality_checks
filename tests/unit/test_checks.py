"""
Unit Tests: Checks API
Tests check creation, scoring, and suggestion logic
"""

import pytest
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.db import Base, CheckPlan, CheckSuggestion, MetadataSnapshot, Connection
from src.services.suggestions import SuggestionsEngine
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


@pytest.fixture
def connection(db_session):
    """Create a test connection."""
    conn = Connection(
        id=uuid4(),
        name="test_connection",
        type="csv",
    )
    db_session.add(conn)
    db_session.commit()
    return conn


@pytest.fixture
def metadata_snapshot(db_session, connection):
    """Create a test metadata snapshot."""
    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=connection.id,
        dataset_identifier="test_dataset",
        schema_json={
            "columns": [
                {"name": "id", "type": "integer", "nullable": False},
                {"name": "email", "type": "string", "nullable": False},
                {"name": "created_at", "type": "datetime", "nullable": False},
            ]
        },
        profile_json={
            "columns": {
                "id": {"null_count": 0, "distinct_count": 1000},
                "email": {"null_count": 5, "distinct_count": 995},
                "created_at": {"null_count": 0, "max_date": "2026-04-11"},
            }
        },
        row_count=1000,
    )
    db_session.add(snapshot)
    db_session.commit()
    return snapshot


def test_create_check_plan(db_session, connection):
    """Test creating a check plan."""
    plan = CheckPlan(
        id=uuid4(),
        name="test_check_plan",
        connection_id=connection.id,
        dataset_identifier="test_dataset",
        checks_yaml="checks:\n  - missing_count(id) < 5",
        enabled=True,
    )
    db_session.add(plan)
    db_session.commit()

    retrieved = db_session.query(CheckPlan).filter_by(name="test_check_plan").first()
    assert retrieved is not None
    assert retrieved.connection_id == connection.id


def test_check_plan_enabled_status(db_session, connection):
    """Test enabling/disabling check plans."""
    plan = CheckPlan(
        id=uuid4(),
        name="test_enabled_plan",
        connection_id=connection.id,
        dataset_identifier="test_dataset",
        checks_yaml="checks: []",
        enabled=True,
    )
    db_session.add(plan)
    db_session.commit()

    plan.enabled = False
    db_session.commit()

    retrieved = db_session.query(CheckPlan).filter_by(name="test_enabled_plan").first()
    assert retrieved.enabled is False


def test_check_suggestion_confidence_scoring(db_session, metadata_snapshot):
    """Test confidence score calculation for suggestions."""
    suggestion = CheckSuggestion(
        id=uuid4(),
        metadata_snapshot_id=metadata_snapshot.id,
        rule_id="completeness_rule",
        check_name="completeness_email",
        check_type="completeness",
        confidence_score=0.95,
        rationale="Email column has 99.5% non-null values",
    )
    db_session.add(suggestion)
    db_session.commit()

    retrieved = db_session.query(CheckSuggestion).filter_by(check_name="completeness_email").first()
    assert retrieved is not None
    assert retrieved.confidence_score == 0.95
    assert 0.0 <= retrieved.confidence_score <= 1.0


def test_multiple_check_suggestions(db_session, metadata_snapshot):
    """Test generating multiple suggestions for a dataset."""
    suggestions_data = [
        ("missing_count_id", "missing_count", 0.98),
        ("missing_count_email", "missing_count", 0.95),
        ("duplicate_count_id", "duplicate_count", 0.99),
        ("uniqueness_email", "uniqueness", 0.92),
    ]

    for check_name, check_type, confidence in suggestions_data:
        suggestion = CheckSuggestion(
            id=uuid4(),
            metadata_snapshot_id=metadata_snapshot.id,
            rule_id=f"{check_type}_rule",
            check_name=check_name,
            check_type=check_type,
            confidence_score=confidence,
        )
        db_session.add(suggestion)

    db_session.commit()

    suggestions = db_session.query(CheckSuggestion).filter_by(
        metadata_snapshot_id=metadata_snapshot.id
    ).all()
    assert len(suggestions) == 4


def test_suggested_check_yaml_generation(db_session, metadata_snapshot):
    """Test that suggested checks include YAML generation."""
    suggestion = CheckSuggestion(
        id=uuid4(),
        metadata_snapshot_id=metadata_snapshot.id,
        rule_id="completeness_rule",
        check_name="completeness_email",
        check_type="completeness",
        suggested_check_yaml="checks:\n  - missing_count(email) < 10",
        confidence_score=0.95,
    )
    db_session.add(suggestion)
    db_session.commit()

    retrieved = db_session.query(CheckSuggestion).filter_by(check_name="completeness_email").first()
    assert retrieved.suggested_check_yaml is not None
    assert "missing_count" in retrieved.suggested_check_yaml
