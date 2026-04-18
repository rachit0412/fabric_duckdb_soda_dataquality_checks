"""
FastAPI Application Factory

Main entry point for the Data Quality Platform API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging.config
import json
import sys
import os
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.config import settings
from src.storage.db import init_db, close_db, engine
from src.models.db import Base
from src.api.routes import connection, metadata, suggestions, checks, runs, results, visualization
from src.worker import start_worker, stop_worker

# Configure logging
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
        }
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "root": {
        "level": settings.LOG_LEVEL,
        "handlers": ["default"],
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context for startup/shutdown events."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized")
    
    # Start worker if enabled
    if settings.WORKER_ENABLED:
        logger.info("Starting check execution worker")
        start_worker()
    
    yield
    
    # Shutdown
    logger.info("Shutting down")
    if settings.WORKER_ENABLED:
        stop_worker()
    close_db()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="MVP Data Quality Platform with Soda Core integration",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - redirect to API documentation."""
    return {
        "message": "Welcome to Data Quality Platform API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
        "endpoints": {
            "connections": "/api/v1/connections",
            "metadata": "/api/v1/metadata",
            "suggestions": "/api/v1/suggestions",
            "check_plans": "/api/v1/check-plans",
            "runs": "/api/v1/runs",
            "results": "/api/v1/results",
            "visualization": "/api/v1/visualization"
        }
    }

# Health check
@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Try to connect to database
        from sqlalchemy import text
        from src.storage.db import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "disconnected"
    
    return {
        "status": "ok",
        "version": "1.0.0",
        "database": db_status,
        "app": settings.APP_NAME,
        "timestamp": str(datetime.now(timezone.utc))
    }

# Include routers
app.include_router(connection.router, prefix="/api/v1/connections", tags=["connections"])
app.include_router(metadata.router, prefix="/api/v1/metadata", tags=["metadata"])
app.include_router(suggestions.router, prefix="/api/v1/suggestions", tags=["suggestions"])
app.include_router(checks.router, prefix="/api/v1/check-plans", tags=["check-plans"])
app.include_router(runs.router, prefix="/api/v1/runs", tags=["runs"])
app.include_router(results.router, prefix="/api/v1/results", tags=["results"])
app.include_router(visualization.router, prefix="/api/v1/visualization", tags=["visualization"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower()
    )
