"""
FastAPI Routes: Metadata Management
Handles dataset profiling and metadata extraction
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import logging
import json

from src.api.models import MetadataProfileRequest, MetadataProfileResponse
from src.models.db import MetadataSnapshot, Connection
from src.services.metadata import PostgresConnector, CSVConnector
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["metadata"])


@router.post("/profile", response_model=MetadataProfileResponse)
async def profile_dataset(
    request: MetadataProfileRequest,
    db: Session = Depends(get_db)
):
    """
    Profile a dataset to extract schema, data types, and statistics.
    """
    try:
        # Get connection
        conn = db.query(Connection).filter(Connection.id == request.connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection not found")
        
        logger.info(f"Profiling dataset for connection: {conn.name}")
        
        # Get appropriate connector
        if conn.type == "postgres":
            connector = PostgresConnector(conn.remote_url)
        elif conn.type == "csv":
            connector = CSVConnector(conn.remote_url)
        elif conn.type == "parquet":
            # For now, treat parquet like CSV (DuckDB handles both)
            connector = CSVConnector(conn.remote_url)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported connection type: {conn.type}")
        
        # Profile the dataset
        # For CSV/Parquet, use filename as dataset identifier; for Postgres use table name or provided dataset
        dataset_id = "data"  # default
        if request.tables and len(request.tables) > 0:
            dataset_id = request.tables[0]
        
        schema = connector.get_schema(dataset_identifier=dataset_id)
        profile = connector.profile_dataset(dataset_identifier=dataset_id, sample_size=None)
        
        # Store metadata snapshot
        snapshot = MetadataSnapshot(
            connection_id=conn.id,
            dataset_identifier=dataset_id,
            schema_json=schema,  # Use correct field name
            profile_json=profile,  # Use correct field name
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        
        logger.info(f"Metadata snapshot created: {snapshot.id}")
        
        return MetadataProfileResponse(
            snapshot_id=snapshot.id,
            connection_id=conn.id,
            schema=schema,
            profile=profile,
            profiled_at=snapshot.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to profile metadata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{snapshot_id}", response_model=MetadataProfileResponse)
async def get_metadata_snapshot(
    snapshot_id: UUID,
    db: Session = Depends(get_db)
):
    """Retrieve a stored metadata snapshot."""
    try:
        snapshot = db.query(MetadataSnapshot).filter(MetadataSnapshot.id == snapshot_id).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Metadata snapshot not found")

        return MetadataProfileResponse(
            snapshot_id=snapshot.id,
            connection_id=snapshot.connection_id,
            schema=snapshot.schema_json if isinstance(snapshot.schema_json, dict) else (json.loads(snapshot.schema_json) if snapshot.schema_json else {}),
            profile=snapshot.profile_json if isinstance(snapshot.profile_json, dict) else (json.loads(snapshot.profile_json) if snapshot.profile_json else {}),
            profiled_at=snapshot.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve metadata snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connection/{connection_id}", response_model=List[MetadataProfileResponse])
async def list_snapshots_for_connection(
    connection_id: UUID,
    db: Session = Depends(get_db)
):
    """List all metadata snapshots for a connection."""
    try:
        snapshots = db.query(MetadataSnapshot).filter(
            MetadataSnapshot.connection_id == connection_id
        ).order_by(MetadataSnapshot.created_at.desc()).all()
        
        return [
            MetadataProfileResponse(
                snapshot_id=s.id,
                connection_id=s.connection_id,
                schema=s.schema_json if isinstance(s.schema_json, dict) else (json.loads(s.schema_json) if s.schema_json else {}),
                profile=s.profile_json if isinstance(s.profile_json, dict) else (json.loads(s.profile_json) if s.profile_json else {}),
                profiled_at=s.created_at,
            )
            for s in snapshots
        ]
    except Exception as e:
        logger.error(f"Failed to list metadata snapshots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

