"""
Database connection and session management.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from src.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency for FastAPI to inject DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database schema."""
    from src.models.db import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized")

def close_db():
    """Close database connections."""
    engine.dispose()
    logger.info("Database connections closed")
