## Connections & File Upload (M2)

**Phase:** M2 (4 days) | **Status:** COMPLETE | **Commit:** [details below]

### Overview

M2 implements the **Connections API** for managing data source connections with comprehensive file security:

- **POST /connections** - Create PostgreSQL/remote connections
- **POST /connections/upload** - Upload CSV files with validation
- **GET /connections** - List all connections
- **GET /connections/{id}** - Get connection details
- **POST /connections/{id}/test** - Test connection viability
- **DELETE /connections/{id}** - Delete connection and metadata

### Architecture

#### File Security Model
```
Upload Flow:
  1. File received → Size validation (≤100MB)
  2. Extension & MIME type check → Error if invalid
  3. Save to temporary location
  4. ClamAV virus scan (optional, configurable)
  5. Compute SHA256 hash for integrity
  6. Store in DB with file hash as verification
  7. Return connection metadata
```

#### Connection Storage
```
connections table:
  - id (UUID, PK)
  - name (unique, indexed)
  - type ('csv', 'parquet', 'postgres', etc.)
  - remote_url (file path or connection string)
  - encrypted_secret (for credentials)
  - created_at, updated_at
  - created_by (user ID, nullable)
```

### API Reference

#### 1. Upload CSV File

**Endpoint:** `POST /api/v1/connections/upload`

**Purpose:** Upload a CSV or Parquet file and create a connection for data quality checks

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/connections/upload \
  -F "name=customer-data" \
  -F "type=csv" \
  -F "file=@data/customers.csv"
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique connection identifier (3+ chars) |
| `type` | string | Yes | File type: 'csv' or 'parquet' |
| `file` | file | Yes | Data file (max 100MB) |

**Validation Rules:**
- File size: ≤ 100MB
- File types: CSV (.csv), Parquet (.parquet, .parq)
- Extension must match type parameter
- Filename: alphanumeric, hyphens, underscores only
- Connection name must be unique

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "customer-data",
  "type": "csv",
  "created_at": "2026-04-11T10:30:00Z",
  "created_by": null
}
```

**Error Responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `FILE_TOO_LARGE` | "File size 150MB exceeds max limit 100MB" |
| 400 | `INVALID_FILE_TYPE` | "Unsupported file type 'xlsx'. Only csv, parquet allowed" |
| 400 | `INVALID_EXTENSION` | "Invalid file extension '.xlsx'. Expected .csv" |
| 400 | `VIRUS_DETECTED` | "File failed virus scan and was rejected" |
| 409 | `DUPLICATE_NAME` | "Connection 'customer-data' already exists" |
| 413 | `PAYLOAD_TOO_LARGE` | "Request body exceeds size limit" |
| 500 | `INTERNAL_ERROR` | "Failed to process upload" |

#### 2. Create PostgreSQL Connection

**Endpoint:** `POST /api/v1/connections`

**Purpose:** Register a remote PostgreSQL or DuckDB connection

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prod-postgres",
    "type": "postgres",
    "remote_url": "postgresql://host:5432/metrics",
    "secret": "encrypted_password"
  }'
```

**Request Body:**
```json
{
  "name": "string (required, 3+ chars, unique)",
  "type": "string (required, 'csv'|'parquet'|'postgres'|'duckdb')",
  "remote_url": "string (required)",
  "secret": "string (required, will be encrypted)"
}
```

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "prod-postgres",
  "type": "postgres",
  "created_at": "2026-04-11T10:30:00Z",
  "created_by": null
}
```

#### 3. List All Connections

**Endpoint:** `GET /api/v1/connections?skip=0&limit=50`

**Purpose:** List all connections (secrets redacted)

**Query Parameters:**
| Parameter | Type | Default | Max |
|---|---|---|---|
| `skip` | integer | 0 | n/a |
| `limit` | integer | 50 | 100 |

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "customer-data",
    "type": "csv",
    "created_at": "2026-04-11T10:30:00Z",
    "created_by": null
  },
  {
    "id": "660f9511-f30c-52e5-b717-557766551111",
    "name": "prod-postgres",
    "type": "postgres",
    "created_at": "2026-04-11T09:00:00Z",
    "created_by": null
  }
]
```

#### 4. Get Connection Details

**Endpoint:** `GET /api/v1/connections/{connection_id}`

**Purpose:** Retrieve a specific connection (secrets redacted)

**Path Parameters:**
- `connection_id`: UUID of connection

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "customer-data",
  "type": "csv",
  "created_at": "2026-04-11T10:30:00Z",
  "created_by": null
}
```

**Error Response (404):**
```json
{
  "detail": "Connection 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

#### 5. Test Connection

**Endpoint:** `POST /api/v1/connections/{connection_id}/test`

**Purpose:** Verify connection is accessible and return basic info

**Response Success:**
```json
{
  "success": true,
  "message": "Connection test successful",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-11T10:30:00Z"
}
```

**For CSV files, includes:**
```json
{
  "success": true,
  "message": "CSV file accessible (1245678 bytes)",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_size": 1245678,
  "timestamp": "2026-04-11T10:30:00Z"
}
```

#### 6. Delete Connection

**Endpoint:** `DELETE /api/v1/connections/{connection_id}`

**Purpose:** Delete connection and associated metadata snapshots

**Response:**
```json
{
  "success": true,
  "message": "Connection deleted successfully",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-11T10:30:00Z"
}
```

**Side Effects:**
- Deletes connection record
- Deletes all associated MetadataSnapshots
- Deletes all associated CheckPlans
- Uploaded files preserved (for audit trail)

### File Security Implementation

#### File Size Validation
- **M2 Limit:** 100MB
- **Configurable via:** `MAX_FILE_SIZE` environment variable
- **Rejection:** Immediate with 413 Payload Too Large

#### File Type Validation
- **Extension Check:** .csv, .parquet only
- **MIME Type Check:** Detects actual file type (prevents spoofing)
- **Rejection:** 400 Invalid File Type if mismatch

#### Virus Scanning
- **Provider:** ClamAV (optional)
- **Configurable via:**
  - `CLAMAV_ENABLED=true|false`
  - `CLAMAV_SOCKET=/path/to/clamd.ctl`
- **Behavior:**
  - If enabled and scanner available: scan all files
  - If enabled but scanner unavailable: log warning, proceed
  - If disabled: skip scan (documented in logs)
- **Threat Response:** Immediate deletion with 400 error

#### File Integrity
- **SHA256 Hash:** Computed for all uploads
- **Storage:** Stored in connection record
- **Verification:** Can re-verify against stored hash

#### File Storage
- **Location:** `/tmp/dq_platform_uploads/{connection_name}/`
- **Cleanup:**
  - On error: Temporary files deleted
  - On delete: Files preserved (audit trail)
  - Optional: Implement retention policy per COMPLIANCE requirements
  
### Configuration

#### Environment Variables
```bash
# File upload settings
MAX_FILE_SIZE=104857600          # 100MB in bytes
UPLOADS_DIR=/tmp/dq_platform_uploads

# Virus scanning
CLAMAV_ENABLED=false
CLAMAV_SOCKET=unix:///var/run/clamav/clamd.ctl

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# API
API_PORT=8000
API_HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO
```

#### Docker Compose
```yaml
version: '3.8'

services:
  api:
    image: dq-platform:latest
    environment:
      MAX_FILE_SIZE: 104857600
      CLAMAV_ENABLED: "false"
      DATABASE_URL: postgresql://postgres:password@db:5432/dq
    volumes:
      - uploads:/tmp/dq_platform_uploads
    ports:
      - "8000:8000"
  
  # Optional: ClamAV antivirus
  clamav:
    image: clamav/clamav:latest
    volumes:
      - clamav:/var/lib/clamav

volumes:
  uploads:
  clamav:
```

### Implementation Details

#### SecurityValidator Class
```python
class FileSecurityValidator:
    async def scan_file(file_path: str) -> bool:
        """ClamAV virus scan if enabled"""
    
    def verify_mime_type(file_path: str, expected: list) -> bool:
        """MIME type validation"""
    
    def inspect_file_content(file_path: str) -> dict:
        """Basic content inspection for SQL injection, etc."""
```

#### Connector Factory Pattern
```python
def get_connector(connection_obj) -> BaseConnector:
    """Returns appropriate connector (CSV, Parquet, etc.)"""
    type_map = {
        "csv": CSVConnector,
        "parquet": ParquetConnector,
        "postgres": PostgresConnector  # M3+
    }
    return type_map[connection_obj.type](connection_obj.remote_url)
```

### Error Handling

#### File Processing Errors
```
On upload error:
1. Temporary file cleaned up
2. Connection NOT created in DB
3. Detailed error logged
4. Client receives 4xx or 5xx response
```

#### Connection Validation
```
Duplicate check:
- name field is unique index
- DB constraint prevents duplicates
- Application returns 409 Conflict

Encoding errors:
- CSV reading uses 'utf-8' with error='ignore'
- Invalid UTF-8 sequences skipped
- Logged for audit trail
```

### Accepted Criteria (M2)

✅ File size validation (≤100MB)
✅ File type validation (CSV, extension, MIME)
✅ Virus scan integration (ClamAV optional)
✅ Secure file storage with hash verification
✅ All endpoints documented with request/response examples
✅ POST /connections, POST /connections/upload
✅ GET /connections, GET /connections/{id}
✅ DELETE /connections/{id}
✅ Error responses with proper HTTP status codes
✅ All code compiles without errors
✅ Database schema matches ORM (verified)

### Testing (See M6 for full test suite)

**Unit Tests:**
```python
test_file_size_validation()      # Files > 100MB rejected
test_file_type_validation()      # Only .csv/.parquet accepted
test_mime_type_detection()       # Actual type checked
test_duplicate_connection_names() # Unique constraint enforced
test_virus_scan_optional()       # Works with/without ClamAV
```

**Integration Tests:**
```python
test_upload_csv_and_profile()      # Full workflow
test_connection_lifecycle()        # Create→Test→Delete
test_error_handling_partial_upload() # Cleanup on failure
```

### Related Documentation

- [API.md](API.md) - Full API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Configuration
- [DATABASE.md](DATABASE.md) - Schema details
- [TESTING.md](TESTING.md) - Test execution (M6)

### Next Phase (M3)

M3 extends M2 with:
- Metadata profiling (GET /metadata/profile)
- Data type inference
- Check suggestions engine
- 12-rule catalog

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-11  
**Commits:** [see execution log]
