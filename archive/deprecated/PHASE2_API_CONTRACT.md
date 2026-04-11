# PHASE 2: API Contract (Source-of-Truth)

**Status:** Ready for Backend Development  
**Date:** 2026-04-11  
**Format:** OpenAPI-aligned; examples in cURL + Python

---

## Overview & Principles

- **Base URL:** `http://localhost:8000/api/v1` (or `/api` if v1 not in path)
- **Authentication:** None (v1.0 MVP); add JWT/OAuth in v1.1
- **Error Format:** Consistent HTTP status codes + JSON error body
- **Response Format:** JSON with consistent field naming (snake_case)
- **Database Storage:** All results persisted to PostgreSQL

---

## 1. CONNECTIONS Management

### 1.1 Create Connection (from credentials)
```
POST /connections/
Content-Type: application/json

Request:
{
  "name": "my-postgres",
  "type": "postgres",  # or "csv", "bigquery", "snowflake"
  "remote_url": "postgresql://user:pass@host:5432/dbname",  # optional
  "secret": "encrypted-credential-here"  # will be encrypted
}

Response: 201 Created
{
  "id": "uuid",
  "name": "my-postgres",
  "type": "postgres",
  "created_at": "2026-04-11T10:00:00Z",
  "created_by": "user-uuid"  # optional
}

Errors:
- 400: Invalid type or missing required fields
- 409: Name already exists (duplicate)
```

### 1.2 Upload Data Source (CSV/Parquet)
```
POST /connections/upload
Content-Type: multipart/form-data

Request:
- name: "customers-2024" (string)
- type: "csv" (string: "csv" | "parquet")
- file: <binary file> (form field, max 100MB)

Response: 201 Created
{
  "id": "uuid",
  "name": "customers-2024",
  "type": "csv",
  "created_at": "2026-04-11T10:05:00Z"
}

File saved to:
/tmp/dq_platform_uploads/{connection_id}/{filename}

Errors:
- 400: Invalid file type or extension mismatch
- 413: File too large (>100MB)
- 500: File save failed
```

### 1.3 List Connections
```
GET /connections/

Response: 200 OK
{
  "connections": [
    {
      "id": "uuid",
      "name": "my-postgres",
      "type": "postgres",
      "created_at": "2026-04-11T10:00:00Z"
    }
  ],
  "total": 5
}

Query Params: (optional)
- type: "csv" (filter by type)
- limit: 10 (default 20)
- offset: 0 (pagination)
```

### 1.4 Get Single Connection
```
GET /connections/{connection_id}

Response: 200 OK
{
  "id": "uuid",
  "name": "my-postgres",
  "type": "postgres",
  "created_at": "2026-04-11T10:00:00Z"
}

Errors:
- 404: Connection not found
```

### 1.5 Test Connection
```
POST /connections/{connection_id}/test

Response: 200 OK
{
  "status": "success",
  "message": "Connection established",
  "latency_ms": 125
}

OR

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
- 404: Connection not found
- 409: Connection has active runs (cannot delete)
```

---

## 2. METADATA & PROFILING

### 2.1 Extract Schema + Profile from Data Source
```
POST /metadata/profile

Request:
{
  "connection_id": "uuid",
  "dataset_identifier": "customers"  # table name or dataset identifier
}

Response: 200 OK
{
  "snapshot_id": "uuid",
  "connection_id": "uuid",
  "dataset_identifier": "customers",
  "version": 1,
  "schema": [
    {
      "name": "id",
      "type": "int64",
      "nullable": false,
      "description": "Primary key"
    },
    {
      "name": "email",
      "type": "string",
      "nullable": true,
      "description": "Customer email"
    }
  ],
  "statistics": {
    "row_count": 150000,
    "column_count": 15,
    "profile_duration_ms": 2500,
    "sample_rows": 100  # number of rows scanned for stats
  },
  "column_profiles": {
    "id": {
      "null_count": 0,
      "null_percent": 0.0,
      "distinct_count": 150000,
      "distinct_percent": 100.0,
      "min": 1,
      "max": 150000,
      "mean": 75000.5,
      "stddev": 43301.27,
      "median": 75000,
      "mode": null
    },
    "email": {
      "null_count": 500,
      "null_percent": 0.33,
      "distinct_count": 149900,
      "distinct_percent": 99.93,
      "min_length": 7,
      "max_length": 255,
      "avg_length": 32.5,
      "sample_values": ["user1@example.com", "user2@example.com"]
    }
  },
  "created_at": "2026-04-11T10:15:00Z"
}

Errors:
- 404: Connection not found
- 400: Invalid dataset_identifier or profile extraction failed
- 500: Data source unreachable
```

### 2.2 Get Metadata Snapshot
```
GET /metadata/{snapshot_id}

Response: 200 OK
{
  "snapshot_id": "uuid",
  "connection_id": "uuid",
  "dataset_identifier": "customers",
  "version": 1,
  "schema": [...],  # same as above
  "statistics": {...},
  "column_profiles": {...},
  "created_at": "2026-04-11T10:15:00Z"
}

Errors:
- 404: Snapshot not found
```

### 2.3 List Metadata Snapshots for Connection
```
GET /metadata/connection/{connection_id}

Response: 200 OK
{
  "snapshots": [
    {
      "snapshot_id": "uuid",
      "dataset_identifier": "customers",
      "version": 1,
      "created_at": "2026-04-11T10:15:00Z"
    }
  ],
  "total": 3
}

Query Params:
- dataset_identifier: "customers" (filter)
- limit: 10
- offset: 0
```

---

## 3. CHECKS CATALOG & SUGGESTIONS

### 3.1 List Available Checks (Catalog)
```
GET /checks/catalog

Response: 200 OK
{
  "checks": [
    {
      "id": "missing_count",
      "name": "Missing Values Check",
      "type": "completeness",
      "engine": "soda",
      "description": "Count NULL/missing values in a column",
      "parameters": [
        {
          "name": "column",
          "type": "string",
          "required": true,
          "description": "Column name to check"
        },
        {
          "name": "missing_threshold",
          "type": "integer",
          "required": false,
          "default": 0,
          "description": "Max allowed missing values"
        }
      ],
      "example_yaml": "- type: missing_count\\n  column: email\\n  warn_when: \"> 100\""
    },
    {
      "id": "duplicate_count",
      "name": "Duplicate Rows Check",
      "type": "uniqueness",
      "engine": "soda",
      "description": "Count duplicate rows"
    },
    # ...20+ total checks
  ],
  "total": 25,
  "engines": ["soda", "custom"]
}
```

### 3.2 Generate Check Suggestions
```
POST /check-suggestions/

Request:
{
  "metadata_snapshot_id": "uuid"
}

Response: 200 OK
{
  "snapshot_id": "uuid",
  "suggestions": [
    {
      "id": "uuid",
      "rule_id": "rule-null-check",
      "rule_name": "Null Values Heuristic",
      "rank": 1,
      "confidence_score": 0.95,
      "check_name": "missing_count",
      "check_type": "completeness",
      "rationale": "Column 'email' has 500 NULL values (0.33%); suggests important field",
      "suggested_check_yaml": "- type: missing_count\\n  column: email\\n  warn_when: \"> 1000\"",
      "severity": "high" # critical | high | medium | low
    },
    {
      "id": "uuid",
      "rule_id": "rule-uniqueness-key",
      "rule_name": "Primary Key Candidate",
      "rank": 2,
      "confidence_score": 0.98,
      "check_name": "duplicate_count",
      "check_type": "uniqueness",
      "rationale": "Column 'id' has 150K distinct values out of 150K rows; likely primary key",
      "suggested_check_yaml": "- type: duplicate_count\\n  column: id\\n  warn_when: \"> 0\"",
      "severity": "high"
    }
    # Up to 12 suggestions (rules)
  ],
  "total_suggestions": 8
}

Error Responses:
- 404: Snapshot not found
```

### 3.3 Get Suggestions for Snapshot
```
GET /check-suggestions/{snapshot_id}

Same response as 3.2
```

---

## 4. CHECK PLANS (Collections of Checks)

### 4.1 Create Check Plan
```
POST /check-plans/

Request:
{
  "name": "daily-customer-checks",
  "connection_id": "uuid",  # OR
  "metadata_snapshot_id": "uuid",  # one of these required
  "description": "Daily data quality checks for customer table",
  "checks": [
    {
      "type": "missing_count",
      "column": "email",
      "warn_when": "> 1000"
    },
    {
      "type": "duplicate_count",
      "column": "id",
      "warn_when": "> 0"
    }
  ],
  "is_active": true
}

Response: 201 Created
{
  "id": "uuid",
  "name": "daily-customer-checks",
  "description": "Daily data quality checks for customer table",
  "metadata_snapshot_id": "uuid",
  "check_count": 2,
  "is_active": true,
  "created_at": "2026-04-11T10:30:00Z",
  "created_by": "user-uuid"
}

Errors:
- 400: Metadata snapshot not found
- 400: Invalid check definitions
```

### 4.2 List Check Plans
```
GET /check-plans/

Response: 200 OK
{
  "plans": [
    {
      "id": "uuid",
      "name": "daily-customer-checks",
      "check_count": 2,
      "is_active": true,
      "created_at": "2026-04-11T10:30:00Z"
    }
  ],
  "total": 5
}

Query Params:
- is_active: true (filter)
- limit: 20
- offset: 0
```

### 4.3 Get Check Plan
```
GET /check-plans/{plan_id}

Response: 200 OK
{
  "id": "uuid",
  "name": "daily-customer-checks",
  "metadata_snapshot_id": "uuid",
  "description": "Daily data quality checks for customer table",
  "checks": [...],  # full check definitions
  "check_count": 2,
  "is_active": true,
  "created_at": "2026-04-11T10:30:00Z"
}

Errors:
- 404: Plan not found
```

### 4.4 Update Check Plan
```
PUT /check-plans/{plan_id}

Request:
{
  "name": "daily-customer-checks-v2",
  "description": "Updated description",
  "checks": [...],  # new check list
  "is_active": true
}

Response: 200 OK
{ ...same as Get }

Errors:
- 404: Plan not found
- 400: Invalid checks
```

### 4.5 Delete Check Plan
```
DELETE /check-plans/{plan_id}

Response: 204 No Content

Errors:
- 404: Plan not found
- 409: Plan has completed runs (cannot delete; deactivate instead)
```

---

## 5. RUNS & EXECUTION

### 5.1 Execute Check Plan
```
POST /runs/

Request:
{
  "check_plan_id": "uuid"
}

Response: 201 Created
{
  "id": "uuid",
  "check_plan_id": "uuid",
  "status": "pending",  # pending | running | completed | failed
  "started_at": null,
  "completed_at": null,
  "total_duration_ms": null,
  "pass_count": 0,
  "fail_count": 0,
  "warn_count": 0,
  "error_count": 0,
  "created_at": "2026-04-11T10:45:00Z"
}

Notes:
- Background task queued (async)
- Client should poll /runs/{id}/status for completion
```

### 5.2 List Runs
```
GET /runs/

Response: 200 OK
{
  "runs": [
    {
      "id": "uuid",
      "check_plan_id": "uuid",
      "status": "completed",
      "pass_count": 18,
      "fail_count": 1,
      "total_duration_ms": 2500,
      "completed_at": "2026-04-11T10:47:30Z"
    }
  ],
  "total": 42
}

Query Params:
- status: "completed" (filter)
- check_plan_id: "uuid" (filter)
- limit: 20
- offset: 0
```

### 5.3 Get Run Details
```
GET /runs/{run_id}

Response: 200 OK
{
  "id": "uuid",
  "check_plan_id": "uuid",
  "status": "completed",
  "started_at": "2026-04-11T10:45:05Z",
  "completed_at": "2026-04-11T10:47:30Z",
  "total_duration_ms": 2450,
  "pass_count": 18,
  "fail_count": 1,
  "warn_count": 0,
  "error_count": 0,
  "environment": "dev",
  "error_message": null,
  "created_at": "2026-04-11T10:45:00Z"
}

Errors:
- 404: Run not found
```

### 5.4 Get Run Status (Polling)
```
GET /runs/{run_id}/status

Response: 200 OK
{
  "run_id": "uuid",
  "status": "running",  # pending | running | completed | failed
  "progress": 0.65,  # 0-1 estimate
  "started_at": "2026-04-11T10:45:05Z",
  "estimated_completion": "2026-04-11T10:48:00Z",
  "checks_completed": 13,
  "checks_total": 20
}

Use Cases:
- Poll every 1-2 seconds during execution
- Timeout after 5 minutes or user cancellation
```

### 5.5 Cancel Run
```
POST /runs/{run_id}/cancel

Response: 200 OK
{
  "id": "uuid",
  "status": "cancelled"
}

Errors:
- 404: Run not found
- 409: Run already completed (cannot cancel)
```

---

## 6. RESULTS & SCORING

### 6.1 Get All Results for Run
```
GET /runs/{run_id}/results

Response: 200 OK
{
  "run_id": "uuid",
  "total_checks": 20,
  "passed": 18,
  "failed": 1,
  "warnings": 1,
  "results": [
    {
      "id": "uuid",
      "check_name": "missing_count[email]",
      "check_type": "completeness",
      "column_name": "email",
      "status": "fail",  # pass | fail | warn | error
      "metric_name": "null_count",
      "metric_value": 1200,
      "expected_value": 1000,
      "metric_unit": "rows",
      "validation_rule": "NULL count <= 1000",
      "comparison_operator": "<=",
      "affected_rows_count": 1200,
      "affected_rows_percent": 0.8,
      "sample_failing_rows": [
        {"id": 123, "email": null},
        {"id": 456, "email": null}
      ],
      "error_message": null,
      "severity_level": "high",
      "remediation_steps": [
        "Review rows with NULL email values",
        "Fill NULL values if data is available elsewhere",
        "Update check threshold if NULL values are expected"
      ],
      "execution_time_ms": 125,
      "created_at": "2026-04-11T10:45:30Z"
    }
  ]
}

Errors:
- 404: Run not found
```

### 6.2 Get Results Summary
```
GET /runs/{run_id}/results/summary

Response: 200 OK
{
  "run_id": "uuid",
  "total_checks": 20,
  "passed": 18,
  "failed": 1,
  "warnings": 1,
  "pass_rate": 0.90,  # 0-1
  "quality_score": 0.90,  # 0-100 or 0-1
  "result_by_status": {
    "pass": ["check1", "check2"],
    "fail": ["check3"],
    "warn": ["check4"]
  }
}
```

### 6.3 Get Results by Column
```
GET /runs/{run_id}/results/by-column/summary

Response: 200 OK
{
  "by_column": {
    "email": {
      "total_checks": 3,
      "passed": 2,
      "failed": 1,
      "column_quality_score": 0.67,
      "issues": [
        {
          "check_name": "missing_count",
          "status": "fail",
          "message": "1200 NULL values found"
        }
      ]
    },
    "id": {
      "total_checks": 2,
      "passed": 2,
      "failed": 0,
      "column_quality_score": 1.0,
      "issues": []
    }
  }
}
```

### 6.4 Get Detailed Results by Column
```
GET /runs/{run_id}/results/by-column/detailed

Response: 200 OK
{
  "by_column": {
    "email": {
      "statistics": {
        "row_count": 150000,
        "null_count": 1200,
        "null_percent": 0.8,
        "distinct_count": 148900,
        "min_length": 10,
        "max_length": 255
      },
      "checks_applied": [
        {
          "check_name": "missing_count",
          "status": "fail",
          "affected_rows": 1200,
          "remediation": "..."
        }
      ]
    }
  }
}
```

### 6.5 Export Results
```
POST /results/export

Request:
{
  "run_id": "uuid",
  "format": "csv"  # csv | json | excel | pdf
}

Response: 200 OK
Binary file (CSV/JSON/etc.)

OR

Response: 201 Created
{
  "export_id": "uuid",
  "format": "csv",
  "file_url": "http://localhost:8000/exports/uuid.csv",
  "created_at": "2026-04-11T10:50:00Z",
  "expires_at": "2026-04-18T10:50:00Z"  # 7-day expiry
}
```

---

## 7. VISUALIZATION & ANALYTICS

### 7.1 Get Run Metrics (for Charts)
```
GET /runs/{run_id}/metrics

Response: 200 OK
{
  "run_id": "uuid",
  "status": "completed",
  "summary": {
    "total_checks": 20,
    "passed": 18,
    "failed": 1,
    "pass_rate": 90.0
  },
  "by_status": {
    "pass": ["check1", "check2", ...],
    "fail": ["check3"]
  },
  "by_column": {
    "email": {
      "quality_score": 67,
      "passed": 2,
      "failed": 1,
      "checks": [
        {"name": "missing_count", "outcome": "fail", "message": "..."}
      ]
    }
  },
  "by_check_type": {
    "missing_count": {"passed": 15, "failed": 1},
    "duplicate_count": {"passed": 3, "failed": 0}
  },
  "timestamps": {
    "started_at": "2026-04-11T10:45:05Z",
    "completed_at": "2026-04-11T10:47:30Z"
  }
}

Use Case: Feed into Plotly charts
- Pie chart: summary.passed vs failed
- Bar chart: by_column quality scores
- Line chart: trends over time
```

### 7.2 Get Plan Trend (Quality Over Time)
```
GET /plans/{plan_id}/trend?days=30

Response: 200 OK
{
  "plan_id": "uuid",
  "timeframe": {
    "start_date": "2026-03-12",
    "end_date": "2026-04-11",
    "days": 30
  },
  "trend": [
    {
      "date": "2026-03-12",
      "pass_rate": 0.92,
      "run_count": 1,
      "avg_duration_ms": 2500
    },
    {
      "date": "2026-03-13",
      "pass_rate": 0.91,
      "run_count": 2,
      "avg_duration_ms": 2450
    }
    # ...30 days of data
  ],
  "summary": {
    "avg_pass_rate": 0.91,
    "trend_direction": "stable"  # improving | stable | degrading
  }
}

Use Case: Line chart of pass rates over time
```

### 7.3 Get Quality Summary by Column (Overall)
```
GET /visualization/summary/quality-by-column

Query Params:
- connection_id: "uuid" (optional; default last 30 days across all)
- days: 30 (optional)

Response: 200 OK
{
  "timeframe": {
    "days": 30,
    "runs_analyzed": 42
  },
  "columns": [
    {
      "column_name": "id",
      "avg_quality_score": 1.0,
      "check_count": 15,
      "failed_check_count": 0,
      "issues": []
    },
    {
      "column_name": "email",
      "avg_quality_score": 0.85,
      "check_count": 18,
      "failed_check_count": 3,
      "issues": [
        {
          "check_name": "missing_count",
          "fail_rate": 0.15,
          "avg_affected_rows": 1200
        }
      ]
    }
  ]
}

Use Case: Dashboard scorecard view
```

---

## ERROR RESPONSE FORMAT

All error responses follow this pattern:

```json
{
  "error_code": "NOT_FOUND",
  "message": "Connection not found",
  "status": 404,
  "timestamp": "2026-04-11T10:50:00Z",
  "request_id": "req-uuid",
  "details": {  # optional; more context
    "connection_id": "missing-uuid"
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 400 | Request validation failed |
| `DUPLICATE` | 409 | Resource already exists |
| `CONFLICT` | 409 | Operation conflicts with current state |
| `INTERNAL_ERROR` | 500 | Server error |
| `UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Authentication (v1.1+)

Future: Add JWT Bearer token

```
Authorization: Bearer <token>
```

For now: All endpoints open (localhost dev assumption)

---

## Rate Limiting (v1.1+)

Future: Implement rate limits
- 100 requests / minute per client
- Return `X-RateLimit-*` headers

For now: No limits

---

## Implementation Checklist

- [ ] All endpoints implemented per this contract
- [ ] Error responses consistent (above format)
- [ ] Request validation (missing fields, type errors)
- [ ] Response validation against examples
- [ ] Integration tests for each endpoint
- [ ] API documentation auto-generated from code (FastAPI /docs)
- [ ] Examples in README match this contract
- [ ] Backward compatibility (if API changes)

---

**Version:** 1.0  
**Last Updated:** 2026-04-11  
**Status:** Ready for Backend Implementation
