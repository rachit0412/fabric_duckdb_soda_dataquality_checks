# 📡 REST API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:8001/api/v1`  
**Format:** JSON  
**Authentication:** None (v1.0); JWT in v1.1+

---

## Table of Contents

1. [Overview](#overview)
2. [Status & Health](#status--health)
3. [Connections](#connections)
4. [Metadata & Profiling](#metadata--profiling)
5. [Rule Libraries & Suggestions](#rule-libraries--suggestions)
6. [Check Plans](#check-plans)
7. [Execution & Runs](#execution--runs)
8. [Results](#results)
9. [Visualization](#visualization)
10. [Error Codes](#error-codes)

---

## Overview

### Principles
- **RESTful Design:** Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Format:** All requests/responses are JSON (snake_case fields)
- **Pagination:** List endpoints support `limit` and `offset` query params
- **Status Codes:** Standard HTTP (200, 201, 400, 404, 500, etc.)
- **Async Operations:** Long-running operations return status; use polling or WebSocket

### Authentication
- **MVP (v1.0):** No authentication required
- **v1.1+:** JWT Bearer tokens will be required

### Rate Limits
- **v1.0:** No rate limits (internal use)
- **v1.1+:** 1000 req/hour per user

---

## Status & Health

### Health Check Endpoint

```
GET /health

Response: 200 OK
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-04-11T10:00:00Z"
}
```

**Usage:** Verify API is running and database is accessible

---

## Connections

### 1.1 Create Connection

Register a data source (PostgreSQL, BigQuery, Snowflake, etc.)

```
POST /connections/

Content-Type: application/json

Request:
{
  "name": "my-postgres",
  "type": "postgres",              # "csv" | "postgres" | "bigquery" | "snowflake"
  "remote_url": "postgresql://user:pass@host:5432/dbname",  # optional
  "credentials": {                 # optional; encrypted at-rest
    "username": "admin",
    "password": "secret"
  }
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-postgres",
  "type": "postgres",
  "created_at": "2026-04-11T10:00:00Z"
}

Errors:
- 400 Bad Request: Missing required fields | Invalid type
- 409 Conflict: Name already exists
```

### 1.2 Upload CSV/Parquet File

```
POST /connections/upload

Content-Type: multipart/form-data

Request:
- name: "customers-2024-Q1" (string)
- type: "csv" | "parquet"
- file: <binary file> (max 100MB)

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "customers-2024-Q1",
  "type": "csv",
  "file_size_bytes": 5242880,
  "created_at": "2026-04-11T10:05:00Z",
  "file_path": "/tmp/dq_uploads/550e8400-e29b-41d4-a716-446655440000/customers.csv"
}

Errors:
- 400 Bad Request: Invalid file extension | File type mismatch
- 413 Payload Too Large: File exceeds 100MB
- 500 Server Error: File save failed
```

### 1.3 List Connections

```
GET /connections/?type=csv&limit=20&offset=0

Response: 200 OK
{
  "connections": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "my-postgres",
      "type": "postgres",
      "created_at": "2026-04-11T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "customers-2024-Q1",
      "type": "csv",
      "created_at": "2026-04-11T10:05:00Z"
    }
  ],
  "total": 2
}

Query Parameters:
- type: string (optional) - Filter by connection type
- limit: integer (default 20) - Items per page
- offset: integer (default 0) - Pagination offset
```

### 1.4 Get Connection Details

```
GET /connections/{connection_id}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-postgres",
  "type": "postgres",
  "remote_url": "postgresql://...",
  "created_at": "2026-04-11T10:00:00Z"
}

Errors:
- 404 Not Found: Connection does not exist
```

### 1.5 Test Connection

```
POST /connections/{connection_id}/test

Response: 200 OK
{
  "status": "success",
  "message": "Connection established successfully",
  "latency_ms": 125
}

OR (failure)

Response: 400 Bad Request
{
  "status": "failed",
  "message": "Connection refused: host not found",
  "error_code": "CONN_REFUSED"
}
```

### 1.6 Delete Connection

```
DELETE /connections/{connection_id}

Response: 204 No Content

Errors:
- 404 Not Found: Connection does not exist
- 409 Conflict: Connection has active runs; cannot delete
```

---

## Metadata & Profiling

### 2.1 Profile Data Source

Extract schema and calculate statistics

```
POST /metadata/profile

Request:
{
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "customers"  # table name or identifier
}

Response: 200 OK
{
  "snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "customers",
  "version": 1,
  "row_count": 150000,
  "column_count": 15,
  "profile_duration_ms": 2500,
  "schema": [
    {
      "name": "id",
      "data_type": "integer",
      "nullable": false
    },
    {
      "name": "email",
      "data_type": "string",
      "nullable": true
    },
    {
      "name": "created_date",
      "data_type": "date",
      "nullable": false
    }
  ],
  "column_profiles": {
    "id": {
      "null_count": 0,
      "distinct_count": 150000,
      "min": 1,
      "max": 150000
    },
    "email": {
      "null_count": 500,
      "distinct_count": 149900,
      "min_length": 7,
      "max_length": 255
    },
    "created_date": {
      "null_count": 0,
      "distinct_count": 730,
      "min": "2023-01-01",
      "max": "2026-04-11"
    }
  },
  "created_at": "2026-04-11T10:15:00Z"
}

Errors:
- 404 Not Found: Connection not found
- 400 Bad Request: Invalid dataset_identifier | Dataset not accessible
```

### 2.2 Get Metadata Snapshot

```
GET /metadata/{snapshot_id}

Response: 200 OK
{ ...same as POST /metadata/profile response... }

Errors:
- 404 Not Found: Snapshot not found
```

### 2.3 List Metadata Snapshots

```
GET /metadata/connection/{connection_id}?limit=10&offset=0

Response: 200 OK
{
  "snapshots": [
    {
      "snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
      "dataset_identifier": "customers",
      "version": 1,
      "row_count": 150000,
      "created_at": "2026-04-11T10:15:00Z"
    }
  ],
  "total": 3
}

Query Parameters:
- dataset_identifier: string (optional)
- limit: integer (default 20)
- offset: integer (default 0)
```

---

## Rule Libraries & Suggestions

### 3.1 Rule Libraries

Plans can combine baseline rules, AI-generated suggestions, and reusable rule patterns from Soda or Great Expectations. The rule-library experience is primarily surfaced in the UI and plan authoring flow rather than through a standalone catalog endpoint in this version.

Common rule sources include:

- Baseline checks such as row count, missing values, duplicates, validity, and freshness
- AI-generated suggestions produced from profiled metadata
- Soda and Great Expectations rule patterns adapted into `checks_yaml`

**Check Types:**
- `completeness` - Missingness, NULL values
- `uniqueness` - Duplicates, primary key violations
- `validity` - Data type mismatches, format errors
- `volume` - Row count changes, thresholds
- `freshness` - Staleness, update frequency
- `patterns` - Format matching, regex validation
- `consistency` - Foreign key relationships, referential integrity
- `custom` - User-defined checks

### 3.2 Generate Suggestions from Metadata

Analyze metadata snapshot and suggest applicable checks

```
POST /suggestions/

Request:
{
  "metadata_snapshot_id": "770e8400-e29b-41d4-a716-446655440002"
}

Response: 200 OK
{
  "snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
  "suggestions": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "rule_name": "Null Values Heuristic",
      "check_name": "missing_count",
      "check_type": "completeness",
      "rank": 1,
      "confidence_score": 0.95,
      "rationale": "Column 'email' has 500 NULL values (0.33%); likely important field",
      "suggested_check_yaml": "- type: missing_count\n  column: email\n  warn_when: \"> 1000\"",
      "severity": "high"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "rule_name": "Primary Key Candidate",
      "check_name": "duplicate_count",
      "check_type": "uniqueness",
      "rank": 2,
      "confidence_score": 0.98,
      "rationale": "Column 'id' has 150K distinct out of 150K rows; likely primary key",
      "suggested_check_yaml": "- type: duplicate_count\n  column: id\n  warn_when: \"> 0\"",
      "severity": "high"
    }
    # Up to 12 rules total
  ],
  "total_suggestions": 8
}

Errors:
- 404 Not Found: Metadata snapshot not found
```

### 3.3 Get Suggestions

```
GET /suggestions/{snapshot_id}

Response: 200 OK
{ ...same as POST response... }

Errors:
- 404 Not Found: Snapshot not found
```

---

## Check Plans

### 4.1 Create Check Plan

```
POST /check-plans/

Request:
{
  "name": "daily-customer-checks",
  "metadata_snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
  "description": "Daily quality checks for customer table",
  "checks_yaml": "checks for data:\n  - missing_count(email) < 1000\n  - duplicate_count(id) = 0"
}

Response: 201 Created
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "name": "daily-customer-checks",
  "metadata_snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
  "enabled": true,
  "created_at": "2026-04-11T10:30:00Z"
}

Errors:
- 400 Bad Request: Invalid check definitions | Metadata snapshot not found
```

### 4.2 List Check Plans

```
GET /check-plans/?is_active=true&limit=20&offset=0

Response: 200 OK
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "name": "daily-customer-checks",
    "enabled": true,
    "created_at": "2026-04-11T10:30:00Z"
  }
]
```

### 4.3 Get Check Plan

```
GET /check-plans/{plan_id}

Response: 200 OK
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "name": "daily-customer-checks",
  "metadata_snapshot_id": "770e8400-e29b-41d4-a716-446655440002",
  "checks_yaml": "checks for data: ...",
  "enabled": true,
  "created_at": "2026-04-11T10:30:00Z"
}
```

### 4.4 Delete Check Plan

```
DELETE /check-plans/{plan_id}

Response: 204 No Content

Errors:
- 409 Conflict: Has completed runs; deactivate instead of deleting
```

---

## Execution & Runs

### 6.1 Execute Check Plan

Start a new run for the given check plan.

```
POST /api/v1/runs/{check_plan_id}/execute

Response: 202 Accepted
{
  "id": "aa0e8400-e29b-41d4-a716-446655440006",
  "check_plan_id": "990e8400-e29b-41d4-a716-446655440005",
  "status": "pending",
  "started_at": null,
  "completed_at": null,
  "result_count": 0,
  "created_at": "2026-04-11T10:35:00Z"
}

Errors:
- 400 Bad Request: Invalid check plan
- 404 Not Found: Check plan not found
```

### 6.2 Get Run Status

```
GET /api/v1/runs/{run_id}/status

Response: 200 OK
{
  "id": "aa0e8400-e29b-41d4-a716-446655440006",
  "check_plan_id": "990e8400-e29b-41d4-a716-446655440005",
  "status": "running",  # pending | running | success | failed | warning
  "started_at": "2026-04-11T10:35:01Z",
  "completed_at": "2026-04-11T10:35:45Z",
  "duration_seconds": 44,
  "result_count": 2,
  "passed_count": 1,
  "failed_count": 1,
  "error_message": null,
  "created_at": "2026-04-11T10:35:00Z"
}

Errors:
- 404 Not Found: Run not found
```

### 6.3 List Runs

```
GET /api/v1/runs/

Response: 200 OK
[
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440006",
    "check_plan_id": "990e8400-e29b-41d4-a716-446655440005",
    "status": "success",
    "created_at": "2026-04-11T10:35:00Z"
  }
]
```

### 6.4 Get Run Summary

```
GET /api/v1/runs/{run_id}

Response: 200 OK
{ ...run object with status, timestamps, and counters... }
```

---

## Results

### 7.1 Get Run Results

```
GET /api/v1/runs/{run_id}/results

Response: 200 OK
{
  "run_id": "aa0e8400-e29b-41d4-a716-446655440006",
  "results": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440007",
      "check_name": "missing_count",
      "check_type": "completeness",
      "status": "pass",
      "passed_count": 150000,
      "failed_count": 0,
      "error_message": null,
      "details": {
        "column": "email",
        "null_count": 500,
        "threshold": 1000
      },
      "created_at": "2026-04-11T10:35:30Z"
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440008",
      "check_name": "duplicate_count",
      "check_type": "uniqueness",
      "status": "fail",
      "passed_count": 149999,
      "failed_count": 1,
      "error_message": "Found 1 duplicate row",
      "sample_failures": [
        {"id": 12345, "email": "duplicate@example.com"}
      ],
      "created_at": "2026-04-11T10:35:35Z"
    }
  ],
  "total": 2
}
```

### 7.2 Get Single Result

```
GET /api/v1/results/runs/{run_id}/results

Response: 200 OK
{ ...flat result list for the run... }
```

---

## Visualization

### 8.1 Get Run Metrics

```
GET /api/v1/visualization/runs/{run_id}/metrics

Response: 200 OK
{
  "run_id": "aa0e8400-e29b-41d4-a716-446655440006",
  "overview": {
    "passed": 1,
    "failed": 1,
    "warnings": 0,
    "errors": 0
  },
  "by_check": [
    {
      "check_name": "missing_count",
      "check_type": "completeness",
      "status": "pass"
    },
    {
      "check_name": "duplicate_count",
      "check_type": "uniqueness",
      "status": "fail"
    }
  ],
  "scorecard": [
    {
      "column": "email",
      "pass_count": 1,
      "total_checks": 2,
      "pass_rate": 0.5
    },
    {
      "column": "id",
      "pass_count": 1,
      "total_checks": 1,
      "pass_rate": 1.0
    }
  ],
  "created_at": "2026-04-11T10:35:45Z"
}
```

### 8.2 Get Quality Scorecard

```
GET /api/v1/visualization/summary/quality-by-column?days=30

Response: 200 OK
{
  "columns": [
    {
      "column": "id",
      "pass_rate": 1.0,
      "recent_fails": 0,
      "trend": "stable"
    },
    {
      "column": "email",
      "pass_rate": 0.97,
      "recent_fails": 1,
      "trend": "declining"
    }
  ],
  "overall_pass_rate": 0.98,
  "period_days": 30
}
```

### 8.3 Get Trends

```
GET /api/v1/visualization/plans/{plan_id}/trend?days=90

Response: 200 OK
{
  "plan_id": "990e8400-e29b-41d4-a716-446655440005",
  "trends": [
    {
      "date": "2026-02-11",
      "pass_rate": 0.95,
      "run_count": 1,
      "total_checks": 25
    },
    {
      "date": "2026-02-12",
      "pass_rate": 0.96,
      "run_count": 1,
      "total_checks": 25
    }
    # ... daily data for 90 days
  ]
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid authentication (v1.1+) |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Operation conflicts with existing state |
| 413 | Payload Too Large | File upload exceeds 100MB |
| 500 | Server Error | Unexpected server error |
| 503 | Service Unavailable | Database unavailable |

### Error Response Format

```json
{
  "error_code": "INVALID_CONNECTION",
  "message": "Connection type 'oracle' is not supported",
  "details": {
    "field": "type",
    "value": "oracle",
    "allowed_values": ["csv", "postgres", "bigquery", "snowflake"]
  }
}
```

---

## Examples

### Complete Workflow: Connect → Profile → Suggest → Plan → Execute → Analyze

**Step 1: Upload CSV**
```bash
curl -X POST http://localhost:8001/api/v1/connections/upload \
  -F "name=customers" \
  -F "type=csv" \
  -F "file=@customers.csv"
# Response: {"id": "conn-123", ...}
```

**Step 2: Profile Data**
```bash
curl -X POST http://localhost:8001/api/v1/metadata/profile \
  -d '{"connection_id":"conn-123","dataset_identifier":"customers"}' \
  -H "Content-Type: application/json"
# Response: {"snapshot_id": "snap-456", "schema": [...], ...}
```

**Step 3: Get Suggestions**
```bash
curl -X POST http://localhost:8001/api/v1/suggestions/ \
  -d '{"metadata_snapshot_id":"snap-456"}' \
  -H "Content-Type: application/json"
# Response: {"suggestions": [{...}, {...}], ...}
```

**Step 4: Create Check Plan**
```bash
curl -X POST http://localhost:8001/api/v1/check-plans/ \
  -d '{"name":"my-checks","metadata_snapshot_id":"snap-456","checks_yaml":"checks for data:\n  - row_count > 0"}' \
  -H "Content-Type: application/json"
# Response: {"id": "plan-789", ...}
```

**Step 5: Execute Plan**
```bash
curl -X POST http://localhost:8001/api/v1/runs/plan-789/execute
# Response: {"id": "run-abc", "status": "pending", ...}
```

**Step 6: Poll Status**
```bash
curl http://localhost:8001/api/v1/runs/run-abc/status
# Returns the current execution status
```

**Step 7: Get Results**
```bash
curl http://localhost:8001/api/v1/runs/run-abc/results
# Response: {"results": [{...}, {...}], ...}
```

**Step 8: Get Analysis Metrics**
```bash
curl http://localhost:8001/api/v1/visualization/runs/run-abc/metrics
# Response: {"summary": {...}, "by_column": {...}}
```

---

**Interactive API Docs:** Swagger UI available at `http://localhost:8001/docs`

**Last Updated:** 2026-04-11  
**Maintained By:** API Team
