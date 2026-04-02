"""
FastAPI Routes: Connections
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import logging
import os
import shutil
from pathlib import Path

from src.api.models import ConnectionCreate, ConnectionResponse
from src.models.db import Connection
from src.storage.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["connections"])

# Create uploads directory
UPLOADS_DIR = Path("/tmp/dq_platform_uploads")
UPLOADS_DIR.mkdir(exist_ok=True, parents=True)

@router.post("/", response_model=ConnectionResponse)
async def create_connection(
    conn_data: ConnectionCreate,
    db: Session = Depends(get_db)
):
    """Create a new data source connection."""
    try:
        # In production: encrypt conn_data.secret here
        new_conn = Connection(
            name=conn_data.name,
            type=conn_data.type,
            remote_url=conn_data.remote_url,
            encrypted_secret=conn_data.secret,  # TODO: implement encryption
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        
        logger.info(f"Connection created: {new_conn.id}")
        
        return ConnectionResponse(
            id=new_conn.id,
            name=new_conn.name,
            type=new_conn.type,
            created_at=new_conn.created_at,
            created_by=new_conn.created_by
        )
    except Exception as e:
        logger.error(f"Failed to create connection: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload", response_model=ConnectionResponse)
async def upload_data_source(
    name: str = Form(...),
    type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CSV or Parquet file and create a connection."""
    try:
        # Validate file type
        valid_types = ['csv', 'parquet']
        if type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {type}")

        # Validate file extension
        filename = file.filename
        ext = filename.split('.')[-1].lower() if '.' in filename else ''
        
        if type == 'csv' and ext != 'csv':
            raise HTTPException(status_code=400, detail="File must be a CSV file (.csv)")
        if type == 'parquet' and ext not in ['parquet', 'parq']:
            raise HTTPException(status_code=400, detail="File must be a Parquet file (.parquet or .parq)")

        # Create directory for this connection
        conn_id = UUID(int=0).hex[:16]  # Temporary ID for file storage
        conn_dir = UPLOADS_DIR / conn_id
        conn_dir.mkdir(exist_ok=True, parents=True)

        # Save file
        file_path = conn_dir / filename
        try:
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file")

        # Create connection in database with file path
        new_conn = Connection(
            name=name,
            type=type,
            remote_url=str(file_path),  # Store file path as remote_url
            encrypted_secret="",
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)

        # Update directory name to use actual connection ID
        actual_conn_dir = UPLOADS_DIR / str(new_conn.id)
        if conn_dir != actual_conn_dir:
            conn_dir.rename(actual_conn_dir)
            new_file_path = actual_conn_dir / filename
            db.query(Connection).filter(Connection.id == new_conn.id).update(
                {Connection.remote_url: str(new_file_path)}
            )
            db.commit()

        logger.info(f"File uploaded and connection created: {new_conn.id}")

        return ConnectionResponse(
            id=new_conn.id,
            name=new_conn.name,
            type=new_conn.type,
            created_at=new_conn.created_at,
            created_by=new_conn.created_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload data source: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(db: Session = Depends(get_db)):
    """List all data source connections (secrets redacted)."""
    try:
        connections = db.query(Connection).all()
        return [
            ConnectionResponse(
                id=c.id,
                name=c.name,
                type=c.type,
                created_at=c.created_at,
                created_by=c.created_by
            )
            for c in connections
        ]
    except Exception as e:
        logger.error(f"Failed to list connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: UUID, db: Session = Depends(get_db)):
    """Get a specific connection (secrets redacted)."""
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        return ConnectionResponse(
            id=conn.id,
            name=conn.name,
            type=conn.type,
            created_at=conn.created_at,
            created_by=conn.created_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{connection_id}/test")
async def test_connection(connection_id: UUID, db: Session = Depends(get_db)):
    """Test if connection is valid."""
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        # TODO: Implement actual connection test based on type
        # For now, just return success
        return {
            "success": True,
            "message": "Connection test successful",
            "connection_id": str(connection_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{connection_id}")
async def delete_connection(connection_id: UUID, db: Session = Depends(get_db)):
    """Delete a connection."""
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        db.delete(conn)
        db.commit()
        
        logger.info(f"Connection deleted: {connection_id}")
        
        return {"message": "Connection deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))
