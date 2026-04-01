# API Reference Guide

**Version:** 1.0.1 | **Last Updated:** 2026-04-01

## Overview

Complete API reference for the Data Quality Platform. All endpoints use JSON for request/response bodies.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, no authentication is required. In production, add JWT tokens to the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. File Upload & Scan

#### `POST /api/simple-upload`

Upload a CSV file and run data quality scan with selected rules.

**Request:**
```
Content-Type: multipart/form-data

- file: [CSV file]
- rules: [comma-separated rule names]
```

**Rules:**
- `volume` - Row count validation
- `completeness` - Missing value checks
- `uniqueness` - Duplicate detection
- `validity` - Format & constraint checking
- `freshness` - Data timeliness checks

**Example:**
```bash
curl -X POST http://localhost:8000/api/simple-upload \
  -F "file=@customers.csv" \
  -F "rules=volume,completeness,uniqueness"
```

**Response:**
```json
{
  "scan_id": "433e6196-660b-4288-8e33-a291dfe06fce",
  "status": "CRITICAL",
  "pass_rate": 0.8333,
  "message": "Scan completed with CRITICAL status",
  "report_url": "/reports/433e6196-660b-4288-8e33-a291dfe06fce.html"
}
```

**Status Codes:**
- `200 OK` - Scan completed successfully
- `400 Bad Request` - Invalid file or rules
- `413 Payload Too Large` - File exceeds size limit
- `500 Internal Server Error` - Scan execution failed

---

### 2. Scan Summary

#### `GET /api/summary`

Retrieve summary of all scans and statistics.

**Example:**
```bash
curl http://localhost:8000/api/summary
```

**Response:**
```json
{
  "total_tables": 1,
  "total_scans": 13,
  "average_pass_rate": 0.8641,
  "failed_scans": 0,
  "tables": [
    {
      "table_name": "customers",
      "last_scan": "2026-04-01T18:27:57.607207",
      "avg_pass_rate": 0.8641,
      "scan_count": 13,
      "latest_status": "CRITICAL"
    }
  ],
  "recent_scans": [
    {
      "scan_id": "433e6196-660b-4288-8e33-a291dfe06fce",
      "timestamp": "2026-04-01T18:27:57.607207",
      "table_name": "customers",
      "total_checks": 12,
      "passed_checks": 10,
      "failed_checks": 2,
      "pass_rate": 0.8333,
      "status": "CRITICAL"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Summary retrieved successfully
- `500 Internal Server Error` - Database error

---

### 3. Health Check

#### `GET /api/health`

Check API service and dependencies health status.

**Example:**
```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-01T18:25:49.623788",
  "version": "1.0.1",
  "services": {
    "storage_backend": "postgresql",
    "storage_available": true,
    "alerting": true
  }
}
```

**Status Codes:**
- `200 OK` - All services healthy
- `503 Service Unavailable` - One or more dependencies down

---

### 4. Scan Results (Optional - Proposed)

#### `GET /api/scans/{scan_id}`

Retrieve detailed results for a specific scan.

**Parameters:**
- `scan_id` (string, required) - The scan ID

**Example:**
```bash
curl http://localhost:8000/api/scans/433e6196-660b-4288-8e33-a291dfe06fce
```

**Response:**
```json
{
  "scan_id": "433e6196-660b-4288-8e33-a291dfe06fce",
  "timestamp": "2026-04-01T18:27:57.607207",
  "table_name": "customers",
  "total_checks": 12,
  "passed_checks": 10,
  "failed_checks": 2,
  "pass_rate": 0.8333,
  "status": "CRITICAL",
  "check_details": [
    {
      "name": "row_count > 0",
      "table": "customers",
      "outcome": "pass",
      "metrics": ["metric-scan-customers-row_count"],
      "diagnostics": {
        "value": 15
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Scan found and details returned
- `404 Not Found` - Scan ID doesn't exist
- `500 Internal Server Error` - Database error

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "scan_id": "string",
  "status": "PASSED|WARNING|CRITICAL",
  "pass_rate": 0.0-1.0,
  "message": "Human-readable message",
  "data": {}
}
```

### Error Response

All error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": {
    "field": "value"
  }
}
```

---

## Status Definitions

| Status | Condition | Action |
|--------|-----------|--------|
| **PASSED** | 100% checks passed | ✅ Data is quality. Ready to use. |
| **WARNING** | 98-99.99% pass rate | ⚠️ Minor issues found. Review before use. |
| **CRITICAL** | <95% pass rate | ❌ Significant issues. Investigate required. |

---

## Rate Limiting

Currently, no rate limiting is enforced. Production deployment should implement:

- 100 requests per minute per IP
- 1000 requests per hour per API key
- File uploads limited to 100 MB

---

## Examples

### Example 1: Quick Scan

```bash
# Upload and scan a CSV file
curl -X POST http://localhost:8000/api/simple-upload \
  -F "file=@data.csv" \
  -F "rules=volume,completeness" \
  -H "Content-Type: multipart/form-data"
```

### Example 2: Check Health

```bash
# Verify all systems operational
curl -s http://localhost:8000/api/health | jq '.'
```

### Example 3: Python Client

```python
import requests

# Scan a file
with open('customers.csv', 'rb') as f:
    files = {'file': f}
    data = {'rules': 'volume,completeness,uniqueness'}
    response = requests.post('http://localhost:8000/api/simple-upload', 
                           files=files, data=data)
    
print(response.json())
```

---

## Error Handling

Always check HTTP status codes:

```python
import requests

try:
    response = requests.post('http://localhost:8000/api/simple-upload',
                           files={'file': open('data.csv')})
    response.raise_for_status()  # Raise exception for 4xx/5xx
    result = response.json()
except requests.exceptions.HTTPError as e:
    print(f"HTTP Error: {e.response.status_code}")
    print(e.response.json())
except Exception as e:
    print(f"Error: {e}")
```

---

## See Also

- [Modern UI Guide](MODERN_UI_GUIDE.md) - User interface walkthrough
- [Rule Selection Guide](RULE_SELECTION_GUIDE.md) - Quality rules documentation
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design documentation
- [API Docs (Interactive)](http://localhost:8000/docs) - Swagger UI
