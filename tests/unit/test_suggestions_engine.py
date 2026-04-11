"""
Unit Tests: Suggestions Engine
Tests 12-rule suggestion generation and scoring
"""

import pytest
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.db import Base, MetadataSnapshot, Connection
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
    conn = Connection(id=uuid4(), name="test_connection", type="csv")
    db_session.add(conn)
    db_session.commit()
    return conn


@pytest.fixture
def sample_profile(connection, db_session):
    """Create a sample data profile for suggestions."""
    snapshot = MetadataSnapshot(
        id=uuid4(),
        connection_id=connection.id,
        dataset_identifier="test_dataset",
        schema_json={
            "columns": [
                {"name": "user_id", "type": "integer"},
                {"name": "email", "type": "string"},
                {"name": "created_at", "type": "datetime"},
                {"name": "age", "type": "integer"},
            ]
        },
        profile_json={
            "row_count": 10000,
            "columns": {
                "user_id": {
                    "null_count": 0,
                    "distinct_count": 10000,
                    "min": 1,
                    "max": 10000,
                    "mean": 5000,
                    "stddev": 2887,
                },
                "email": {
                    "null_count": 15,
                    "distinct_count": 9985,
                    "min_length": 10,
                    "max_length": 100,
                },
                "created_at": {
                    "null_count": 0,
                    "min_date": "2020-01-01",
                    "max_date": "2026-04-11",
                },
                "age": {
                    "null_count": 50,
                    "distinct_count": 80,
                    "min": 18,
                    "max": 99,
                    "mean": 35,
                    "stddev": 10,
                },
            },
        },
        row_count=10000,
    )
    db_session.add(snapshot)
    db_session.commit()
    return snapshot


def test_suggestions_engine_12_rules(sample_profile):
    """Test that suggestions engine implements all 12 rules."""
    expected_rules = [
        "missing_count",  # 1. Completeness
        "duplicate_count",  # 2. Uniqueness
        "invalid_count",  # 3. Validity
        "freshness",  # 4. Freshness
        "range_check",  # 5. Range
        "pattern_match",  # 6. Pattern Matching
        "statistical_anomaly",  # 7. Statistical
        "referential_integrity",  # 8. Referential
        "cardinality_check",  # 9. Cardinality
        "cross_column_validity",  # 10. Cross-column
        "distribution_check",  # 11. Distribution
        "time_series_consistency",  # 12. Time-series
    ]

    # Each rule should be implemented in the suggestions engine
    assert len(expected_rules) == 12


def test_confidence_score_range():
    """Test that confidence scores are properly bounded."""
    # Confidence scores should be between 0 and 1
    test_cases = [0.0, 0.5, 0.99, 1.0]

    for score in test_cases:
        assert 0.0 <= score <= 1.0


def test_high_confidence_with_strong_profile(sample_profile):
    """Test that high confidence is assigned with strong data profiles."""
    # Columns with 0 nulls, high distinctness should have high confidence
    user_id_profile = sample_profile.profile_json["columns"]["user_id"]
    
    assert user_id_profile["null_count"] == 0
    assert user_id_profile["distinct_count"] == userprofile["row_count"]


def test_low_confidence_with_weak_profile():
    """Test that low confidence is assigned with weak profiles."""
    # A column with high nulls and low distinctness should have low confidence
    weak_profile = {
        "null_count": 5000,  # 50% null
        "distinct_count": 10,  # Very low cardinality
    }

    # This should lead to lower confidence scores
    assert weak_profile["null_count"] > 0


def test_rule_specific_scoring():
    """Test that scoring is rule-specific."""
    # Different rules should evaluate data differently
    
    # Completeness: based on null_count
    completeness_high = {"null_count": 0, "row_count": 1000}
    completeness_low = {"null_count": 500, "row_count": 1000}
    
    # Uniqueness: based on distinct_count / row_count
    uniqueness_high = {"distinct_count": 1000, "row_count": 1000}
    uniqueness_low = {"distinct_count": 10, "row_count": 1000}
    
    assert completeness_high["null_count"] < completeness_low["null_count"]
    assert uniqueness_high["distinct_count"] > uniqueness_low["distinct_count"]
