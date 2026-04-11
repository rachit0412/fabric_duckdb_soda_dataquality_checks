"""
Unit Tests: Connections API
Tests CRUD operations for data source connections
"""

import pytest
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.db import Base, Connection
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


def test_create_connection(db_session):
    """Test creating a new connection."""
    conn = Connection(
        id=uuid4(),
        name="test_csv_connection",
        type="csv",
        remote_url="/data/test.csv",
        encrypted_secret="encrypted_key",
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).filter_by(name="test_csv_connection").first()
    assert retrieved is not None
    assert retrieved.type == "csv"
    assert retrieved.name == "test_csv_connection"


def test_read_connection(db_session):
    """Test reading a connection."""
    conn_id = uuid4()
    conn = Connection(
        id=conn_id,
        name="read_test_connection",
        type="parquet",
        remote_url="/data/test.parquet",
    )
    db_session.add(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).filter_by(id=conn_id).first()
    assert retrieved is not None
    assert retrieved.name == "read_test_connection"
    assert retrieved.type == "parquet"


def test_update_connection(db_session):
    """Test updating a connection."""
    conn = Connection(
        id=uuid4(),
        name="update_test_connection",
        type="csv",
        remote_url="/data/original.csv",
    )
    db_session.add(conn)
    db_session.commit()

    conn.remote_url = "/data/updated.csv"
    db_session.commit()

    retrieved = db_session.query(Connection).filter_by(name="update_test_connection").first()
    assert retrieved.remote_url == "/data/updated.csv"


def test_delete_connection(db_session):
    """Test deleting a connection."""
    conn = Connection(
        id=uuid4(),
        name="delete_test_connection",
        type="csv",
    )
    db_session.add(conn)
    db_session.commit()

    db_session.delete(conn)
    db_session.commit()

    retrieved = db_session.query(Connection).filter_by(name="delete_test_connection").first()
    assert retrieved is None


def test_connection_unique_name(db_session):
    """Test that connection names are unique."""
    conn1 = Connection(id=uuid4(), name="unique_name", type="csv")
    conn2 = Connection(id=uuid4(), name="unique_name", type="parquet")

    db_session.add(conn1)
    db_session.commit()

    db_session.add(conn2)
    with pytest.raises(Exception):  # Should raise IntegrityError
        db_session.commit()


def test_list_all_connections(db_session):
    """Test retrieving all connections."""
    for i in range(5):
        conn = Connection(
            id=uuid4(),
            name=f"connection_{i}",
            type="csv",
        )
        db_session.add(conn)
    db_session.commit()

    all_connections = db_session.query(Connection).all()
    assert len(all_connections) == 5
