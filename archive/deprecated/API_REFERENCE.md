# API Reference

> **Version:** 1.0.0 | **Generated:** 2026-03-31 23:11:34

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [HTTP Endpoints](#http-endpoints)
- [Request/Response Models](#requestresponse-models)
- [Error Codes](#error-codes)

---

## Overview

The Data Quality Platform exposes a RESTful API for programmatic access to data quality scanning, monitoring, and reporting capabilities.

**Base URL:** `http://localhost:8000`

**Content Type:** `application/json`

---

## Authentication

Currently, the API does not require authentication for local development. For production deployments, implement one of:
- API Keys via headers
- OAuth2/JWT tokens
- Client certificates (mTLS)

See [SECURITY.md](SECURITY.md) for production security best practices.

---

## HTTP Endpoints

### Health & Status

#### GET /api/health
Check API health and service status.

**Response:**
``json
{
  "status": "healthy",
  "timestamp": "2026-03-31T10:00:00Z",
  "version": "1.0.0",
  "database": "connected"
}
``

---

### Data Quality Scans

#### GET /
Function: `root`
---


#### POST /api/dynamic-scan
Function: `run_dynamic_scan`
Run scan with dynamically generated checks (no YAML files needed).

**Request:**
``json
{
  "table_name": "my_table",
  "csv_path": "data/my_data.csv",
  "checks": [
    {
      "type": "row_count",
      "operator": ">",
      "value": 0
    },
    {
      "type": "missing_count",
      "column": "email",
      "operator": "=",
      "value": 0
    }
  ]
}
``
---


#### GET /api/health
Function: `health_check`
---


#### GET /api/history/{table_name}
Function: `get_history`
Retrieve scan history for a specific table.

**Parameters:**
- `table_name`: Table identifier (path)
- `days`: Number of days to look back (query, default: 30)

**Response:**
``json
{
  "table_name": "my_table",
  "scans": [
    {
      "scan_id": "uuid",
      "timestamp": "2026-03-31T10:00:00Z",
      "status": "pass",
      "checks_passed": 10,
      "checks_failed": 0
    }
  ]
}
``
---


#### POST /api/scan
Function: `run_scan`
Execute a data quality scan with Soda Core checks.

**Request:**
``json
{
  "table_name": "my_table",
  "csv_path": "data/my_data.csv",
  "checks_path": "soda_duckdb/checks.yml",
  "config_path": "soda_duckdb/config.yml"
}
``

**Response:**
``json
{
  "scan_id": "uuid",
  "status": "pass|fail|warn",
  "checks_passed": 10,
  "checks_failed": 2,
  "report_path": "reports/scan_uuid.html"
}
``
---


#### GET /api/summary
Function: `get_summary`
Get summary of all tables and their latest scan results.

**Response:**
``json
{
  "total_tables": 5,
  "healthy_tables": 4,
  "warning_tables": 1,
  "failed_tables": 0,
  "tables": [...]
}
``
---


#### GET /api/trends/{table_name}
Function: `get_trends`
Get trend analysis for a table's data quality metrics.

**Parameters:**
- `table_name`: Table identifier
- `days`: Days to analyze (default: 7)

**Response:** Time-series data for pass rates, check counts, and anomalies.
---


#### POST /api/upload-scan
Function: `upload_and_scan`
Upload CSV file and scan in one operation.

**Request:** `multipart/form-data`
- `file`: CSV file
- `table_name`: Table identifier
- `checks`: JSON array of Soda checks

**Response:** Same as `/api/scan`
---


## Request/Response Models

### ScanRequest
``python
{
  "table_name": str,          # Required
  "csv_path": str,            # Required
  "checks_path": str,         # Optional (default: soda_duckdb/checks.yml)
  "config_path": str          # Optional (default: soda_duckdb/config.yml)
}
``

### SodaCheck
``python
{
  "type": str,               # row_count, missing_count, duplicate_count, schema
  "column": str,             # Optional, for column-specific checks
  "operator": str,           # >, <, =, >=, <=, !=
  "value": Any               # Threshold value
}
``

### ScanResponse
``python
{
  "scan_id": str,
  "table_name": str,
  "status": str,             # pass, fail, warn, error
  "timestamp": str,
  "checks_passed": int,
  "checks_failed": int,
  "checks_warned": int,
  "total_checks": int,
  "report_path": str,
  "anomalies": List[Dict],
  "profile": Dict
}
``

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Database connection failed |

**Error Response Format:**
``json
{
  "detail": "Error message description",
  "status_code": 400,
  "timestamp": "2026-03-31T10:00:00Z"
}
``

---

## Code Examples

### Python
``python
import requests

# Run a scan
response = requests.post('http://localhost:8000/api/scan', json={
    "table_name": "customers",
    "csv_path": "data/customers.csv"
})

result = response.json()
print(f"Scan {result['scan_id']}: {result['status']}")
``

### PowerShell
``powershell
 = @{
    table_name = "customers"
    csv_path = "data/customers.csv"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:8000/api/scan" `
    -Body  `
    -ContentType "application/json"
``

### cURL
``bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "customers",
    "csv_path": "data/customers.csv"
  }'
``

---

**For interactive API testing, visit:** http://localhost:8000/docs (Swagger UI)

