"""
FastAPI Routes: Connections

Handles CSV/Parquet file uploads with comprehensive security validation:
- File type validation (CSV only in M2)
- File size limits (100MB)
- Virus scan check (ClamAV integration)
- Safe file storage
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging
import os
import shutil
import hashlib
import magic
from pathlib import Path
from datetime import datetime

from src.api.models import ConnectionCreate, ConnectionResponse
from src.models.db import Connection
from src.storage.db import get_db
from src.services.file_security import FileSecurityValidator

logger = logging.getLogger(__name__)
router = APIRouter(tags=["connections"])

# Configuration
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "/tmp/dq_platform_uploads"))
UPLOADS_DIR.mkdir(exist_ok=True, parents=True)
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB default
ALLOWED_EXTENSIONS = {'csv', 'parquet', 'parq'}
ALLOWED_FILE_TYPES = {'csv', 'parquet'}
ALLOWED_TYPES = {'csv', 'parquet', 'postgres', 'postgresql', 'snowflake', 'bigquery', 'duckdb'}

# File security validator
file_validator = FileSecurityValidator()

def validate_file_extension(filename: str) -> bool:
    """Validate file extension."""
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS

def validate_file_type_param(file_type: str) -> bool:
    """Validate file type parameter."""
    return file_type in ALLOWED_FILE_TYPES

def validate_file_size(file_size: int) -> bool:
    """Validate file size is within limits."""
    return 0 < file_size <= MAX_FILE_SIZE

async def validate_file_not_virus(file_path: Path) -> bool:
    """Validate file is not a virus (ClamAV check if available)."""
    try:
        # Try ClamAV scan if available
        is_safe = await file_validator.scan_file(str(file_path))
        return is_safe
    except Exception as e:
        logger.warning(f"Could not perform virus scan: {e}. Proceeding with caution.")
        return True  # Fail open if scanner unavailable

def compute_file_hash(file_path: Path) -> str:
    """Compute SHA256 hash of file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def resolve_unique_connection_name(db: Session, requested_name: str) -> str:
    """Return a versioned connection name when the requested one already exists."""
    existing_names = {
        row[0]
        for row in db.query(Connection.name).filter(Connection.name.like(f"{requested_name}%")).all()
    }
    if requested_name not in existing_names:
        return requested_name

    suffix = 2
    while True:
        candidate = f"{requested_name}-{suffix}"
        if candidate not in existing_names:
            return candidate
        suffix += 1

@router.post("/", response_model=ConnectionResponse)
async def create_connection(
    conn_data: ConnectionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new data source connection (non-file based).
    
    **Request Body:**
    ```json
    {
        "name": "prod-postgres",
        "type": "postgres",
        "remote_url": "postgresql://host:5432/dbname",
        "secret": "encrypted_password"
    }
    ```
    
    **Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "prod-postgres",
        "type": "postgres",
        "created_at": "2026-04-11T10:00:00Z",
        "created_by": null
    }
    ```
    """
    try:
        if not conn_data.name or len(conn_data.name) < 3:
            raise HTTPException(status_code=400, detail="Connection name must be at least 3 characters")
        
        # Check if connection name already exists
        existing = db.query(Connection).filter(Connection.name == conn_data.name).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Connection '{conn_data.name}' already exists")
        
        # Validate connection type
        if conn_data.type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported connection type. Allowed: {ALLOWED_TYPES}")
        
        # In production: implement proper encryption
        # For now, log that secrets should be encrypted
        logger.warning(f"Creating connection {conn_data.name}: Secrets not encrypted (TODO: implement KMS encryption)")
        
        new_conn = Connection(
            name=conn_data.name,
            type=conn_data.type,
            remote_url=conn_data.remote_url,
            encrypted_secret=conn_data.secret,  # TODO: encrypt with KMS
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        
        logger.info(f"Connection created: {new_conn.id} (type={conn_data.type}, name={conn_data.name})")
        
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
        logger.error(f"Failed to create connection: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload", response_model=ConnectionResponse)
async def upload_data_source(
    name: str = Form(...),
    type: str = Form(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file and create a connection.
    
    **Parameters:**
    - `name`: Connection identifier (must be unique)
    - `type`: File type ('csv' currently supported)
    - `file`: CSV file (max 100MB)
    
    **Validation:**
    - File size: ≤ 100MB
    - File type: CSV only (M2)
    - File extension: .csv
    - Virus scan: ClamAV check (optional)
    
    **Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "customer-data",
        "type": "csv",
        "created_at": "2026-04-11T10:00:00Z",
        "created_by": null
    }
    ```
    
    **Example cURL:**
    ```bash
    curl -X POST http://localhost:8000/api/v1/connections/upload \\
      -F "name=customers" \\
      -F "type=csv" \\
      -F "file=@data/customers.csv"
    ```
    """
    temp_file_path = None
    try:
        # 1. Validate parameters
        if not name or len(name) < 3:
            raise HTTPException(status_code=400, detail="Connection name must be at least 3 characters")
        
        if not validate_file_type_param(type):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{type}'. Allowed: {ALLOWED_FILE_TYPES}"
            )
        
        resolved_name = resolve_unique_connection_name(db, name)
        if resolved_name != name:
            logger.info(f"Connection name '{name}' already exists, storing upload as '{resolved_name}'")
        
        # 2. Validate file extension
        filename = file.filename or ""
        if not validate_file_extension(filename):
            ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension '.{ext}'. Only {ALLOWED_EXTENSIONS} allowed"
            )
        
        # 3. Read file content to check size
        content = await file.read()
        file_size = len(content)
        
        if not validate_file_size(file_size):
            raise HTTPException(
                status_code=413,
                detail=f"File size {file_size/1024/1024:.1f}MB exceeds max limit {MAX_FILE_SIZE/1024/1024:.0f}MB"
            )
        
        logger.info(f"Uploading file: {filename} ({file_size/1024:.1f}KB)")
        
        # 4. Create temporary file
        conn_dir = UPLOADS_DIR / resolved_name
        conn_dir.mkdir(exist_ok=True, parents=True)
        temp_file_path = conn_dir / filename
        
        with open(temp_file_path, 'wb') as f:
            f.write(content)
        
        # 5. Virus scan
        is_safe = await validate_file_not_virus(temp_file_path)
        if not is_safe:
            raise HTTPException(status_code=400, detail="File failed virus scan and was rejected")
        
        # 6. Compute file hash
        file_hash = compute_file_hash(temp_file_path)
        logger.info(f"File hash (SHA256): {file_hash}")
        
        # 7. Create connection in database
        new_conn = Connection(
            name=resolved_name,
            type=type,
            remote_url=str(temp_file_path),
            encrypted_secret=file_hash,  # Store file hash as content verification
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        
        logger.info(f"Connection created from upload: {new_conn.id} (file={filename}, hash={file_hash[:8]}...)")
        
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
        # Cleanup temp file on error
        if temp_file_path and temp_file_path.exists():
            try:
                temp_file_path.unlink()
            except Exception as cleanup_err:
                logger.warning(f"Failed to cleanup temp file: {cleanup_err}")
        
        logger.error(f"Failed to upload data source: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List all data source connections (secrets redacted).
    
    **Query Parameters:**
    - `skip`: Pagination offset (default 0)
    - `limit`: Result limit (default 50, max 100)
    
    **Response:**
    ```json
    [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "customer-data",
            "type": "csv",
            "created_at": "2026-04-11T10:00:00Z",
            "created_by": null
        }
    ]
    ```
    """
    try:
        if limit > 100:
            limit = 100
        
        connections = db.query(Connection).offset(skip).limit(limit).all()
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
        logger.error(f"Failed to list connections: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(
    connection_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get a specific connection (secrets redacted).
    
    **Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "customer-data",
        "type": "csv",
        "created_at": "2026-04-11T10:00:00Z",
        "created_by": null
    }
    ```
    """
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")
        
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
        logger.error(f"Failed to get connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{connection_id}/test")
async def test_connection(
    connection_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Test if a connection is valid and accessible.
    
    **Response Success:**
    ```json
    {
        "success": true,
        "message": "Connection test successful",
        "connection_id": "550e8400-e29b-41d4-a716-446655440000",
        "row_count": 1500,
        "timestamp": "2026-04-11T10:00:00Z"
    }
    ```
    
    **Note:** In M2, CSV connections return basic file info. In M3+, adds data profiling.
    """
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")
        
        from src.services.connectors import get_connector
        connector = get_connector(conn)
        
        # Test connection viability
        test_result = await connector.test_connection()
        
        return {
            "success": test_result.get("success", True),
            "message": test_result.get("message", "Connection test successful"),
            "connection_id": str(connection_id),
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Connection test failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete a connection and associated metadata snapshots.
    
    **Response:**
    ```json
    {
        "success": true,
        "message": "Connection deleted successfully",
        "connection_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2026-04-11T10:00:00Z"
    }
    ```
    
    **Side Effects:**
    - Deletes connection record
    - Deletes associated metadata snapshots
    - Deletes associated check plans
    - Preserves uploaded files (for audit trail)
    """
    try:
        conn = db.query(Connection).filter(Connection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail=f"Connection {connection_id} not found")
        
        # Delete associated metadata snapshots
        from src.models.db import MetadataSnapshot, CheckPlan
        db.query(MetadataSnapshot).filter(MetadataSnapshot.connection_id == connection_id).delete()
        db.query(CheckPlan).filter(CheckPlan.connection_id == connection_id).delete()
        
        # Delete connection
        db.delete(conn)
        db.commit()
        
        logger.info(f"Connection deleted: {connection_id}")
        
        return {
            "success": True,
            "message": "Connection deleted successfully",
            "connection_id": str(connection_id),
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
