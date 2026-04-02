"""
FastAPI Routes: Metadata Management
Handles dataset profiling and metadata extraction
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from src.api.models import MetadataProfileRequest, MetadataProfileResponse, MetadataSnapshotResponse
from src.models.db import MetadataSnapshot, Connection
from src.services.metadata import MetadataService
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["metadata"])

metadata_service = MetadataService()

@router.post("/profile", response_model=MetadataSnapshotResponse)
async def profile_dataset(
    request: MetadataProfileRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Profile a dataset to extract schema, data types, and statistics.
    Stores metadata snapshot in database for later reference.
    """
    try:
        # Get connection
        conn = db.query(Connection).filter(Connection.id == request.connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection {request.connection_id} not found")
        
        logger.info(f"Profiling dataset for connection: {conn.name}")
        
        # Get connector (PostgreSQL, CSV, etc)
        connector = metadata_service.get_connector(conn.type, conn.remote_url, conn.encrypted_secret)
        
        # Profile the dataset
        schema = connector.get_schema()
        profile = connector.profile_dataset(tables=request.tables)
        
        # Store metadata snapshot
        snapshot = MetadataSnapshot(
            connection_id=conn.id,
            dataset_name=request.dataset_name or conn.name,
            schema_definition=schema,
            profile_data=profile,
            record_count=profile.get('total_records', 0),
            column_count=profile.get('total_columns', 0),
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        
        logger.info(f"Metadata snapshot created: {snapshot.id}")
        
        return MetadataSnapshotResponse(
            id=snapshot.id,
            connection_id=snapshot.connection_id,
            dataset_name=snapshot.dataset_name,
            record_count=snapshot.record_count,
            column_count=snapshot.column_count,
            created_at=snapshot.created_at,
            schema_preview=schema,
        )
    
    except Exception as e:
        logger.error(f"Failed to profile dataset: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{snapshot_id}", response_model=MetadataSnapshotResponse)
async def get_metadata_snapshot(snapshot_id: UUID, db: Session = Depends(get_db)):
    """Get a specific metadata snapshot."""
    try:
        snapshot = db.query(MetadataSnapshot).filter(MetadataSnapshot.id == snapshot_id).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        return MetadataSnapshotResponse(
            id=snapshot.id,
            connection_id=snapshot.connection_id,
            dataset_name=snapshot.dataset_name,
            record_count=snapshot.record_count,
            column_count=snapshot.column_count,
            created_at=snapshot.created_at,
            schema_preview=snapshot.schema_definition,
        )
    except Exception as e:
        logger.error(f"Failed to get metadata snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[MetadataSnapshotResponse])
async def list_metadata_snapshots(
    connection_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """List all metadata snapshots (optionally filtered by connection)."""
    try:
        query = db.query(MetadataSnapshot)
        if connection_id:
            query = query.filter(MetadataSnapshot.connection_id == connection_id)
        
        snapshots = query.order_by(MetadataSnapshot.created_at.desc()).all()
        
        return [
            MetadataSnapshotResponse(
                id=s.id,
                connection_id=s.connection_id,
                dataset_name=s.dataset_name,
                record_count=s.record_count,
                column_count=s.column_count,
                created_at=s.created_at,
                schema_preview=s.schema_definition,
            )
            for s in snapshots
        ]
    except Exception as e:
        logger.error(f"Failed to list metadata snapshots: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{snapshot_id}")
async def delete_metadata_snapshot(snapshot_id: UUID, db: Session = Depends(get_db)):
    """Delete a metadata snapshot."""
    try:
        snapshot = db.query(MetadataSnapshot).filter(MetadataSnapshot.id == snapshot_id).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        db.delete(snapshot)
        db.commit()
        
        logger.info(f"Metadata snapshot deleted: {snapshot_id}")
        
        return {"message": "Snapshot deleted"}
    except Exception as e:
        logger.error(f"Failed to delete metadata snapshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
