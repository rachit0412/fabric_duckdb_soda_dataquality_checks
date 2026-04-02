# API Specification - Data Quality Platform MVP

**Base URL:** `http://localhost:8000/api/v1`  
**Auth:** JWT token in `Authorization: Bearer <token>` header (MVP: optional, enforced in Phase 2)

---

## 1. Connection Management

### POST /connections
Create a new data source connection.

**Request:**
```json
{
  "name": "prod_warehouse",
  "type": "postgres",
  "remote_url": "postgresql://localhost:5432/analytics",
  "secret": "user:password"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "prod_warehouse",
  "type": "postgres",
  "created_at": "2025-01-15T10:00:00Z",
  "created_by": null
}
```

**Error (400):**
```json
{
  "detail": "Connection name already exists"
}
```

---

### GET /connections
List all connections (secrets redacted).

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "prod_warehouse",
    "type": "postgres",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

---

### GET /connections/{connection_id}
Get a specific connection.

**Response (200):** Same as above.

---

### POST /connections/{connection_id}/test
Test connection validity.

**Response (200):**
```json
{
  "success": true,
  "message": "Connection test successful",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Connection refused at localhost:5432",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### DELETE /connections/{connection_id}
Delete a connection.

**Response (200):**
```json
{
  "message": "Connection deleted"
}
```

---

## 2. Metadata & Profiling

### POST /metadata/profile
Extract schema and profile statistics.

**Request:**
```json
{
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "public.customers"
}
```

**Response (200):**
```json
{
  "snapshot_id": "650e8400-e29b-41d4-a716-446655440001",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "public.customers",
  "version": 1,
  "schema": {
    "columns": [
      {
        "name": "customer_id",
        "type": "BIGINT",
        "nullable": false
      },
      {
        "name": "email",
        "type": "VARCHAR(255)",
        "nullable": false
      }
    ]
  },
  "profile": {
    "customer_id": {
      "row_count": 1000000,
      "null_count": 0,
      "null_percent": 0.0,
      "distinct_count": 999995,
      "min": 1,
      "max": 1000000
    },
    "email": {
      "row_count": 1000000,
      "null_count": 0,
      "null_percent": 0.0,
      "distinct_count": 1000000,
      "min_length": 5,
      "max_length": 100
    }
  },
  "duration_ms": 3500,
  "created_at": "2025-01-15T10:05:00Z"
}
```

---

### GET /metadata/snapshots/{snapshot_id}
Retrieve a specific metadata snapshot.

**Response (200):** Same structure as profile response.

---

## 3. Check Suggestions

### POST /suggestions/generate
Generate AI-driven check suggestions.

**Request:**
```json
{
  "snapshot_id": "650e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**
```json
{
  "suggestion_set_id": "750e8400-e29b-41d4-a716-446655440002",
  "total_suggestions": 8,
  "suggestions": [
    {
      "id": "sugg-001",
      "rule_id": "null_check_for_pk_like",
      "check_name": "customer_id is not null",
      "check_type": "Completeness",
      "rationale": "PK should have no nulls",
      "confidence": 0.95,
      "suggested_yaml": "checks:\n  - name: customer_id is not null\n    type: missing_count\n    column: customer_id\n    fail: when > 0"
    },
    {
      "id": "sugg-002",
      "rule_id": "email_pattern_check",
      "check_name": "email format validation",
      "check_type": "Validity",
      "rationale": "Column name suggests email; validate format",
      "confidence": 0.80,
      "suggested_yaml": "checks:\n  - name: email format\n    ..."
    }
  ]
}
```

---

### GET /suggestions/rules
List all available suggestion rules.

**Response (200):**
```json
{
  "total_rules": 15,
  "rules": [
    {
      "rule_id": "null_check_for_pk_like",
      "name": "Null Check for PK-like Columns",
      "check_type": "Completeness",
      "description": "Suggest null check for key-like columns",
      "trigger_conditions": ["is_pk OR distinct_count > 99% rows"]
    }
  ]
}
```

---

## 4. Check Library & Plans

### GET /check-plans/library
Browse standard SodaCL check templates.

**Response (200):**
```json
{
  "categories": {
    "Completeness": [
      {
        "id": "completeness-null",
        "name": "Missing Values",
        "description": "Check for NULL values in a column",
        "template": "checks:\n  - name: ${check_name}\n    type: missing_count\n    column: ${column_name}\n    fail: when > ${fail_threshold}"
      }
    ],
    "Uniqueness": [
      {
        "id": "uniqueness-duplicate",
        "name": "Duplicate Values",
        "description": "Check for duplicate values",
        "template": "checks:\n  - name: ${check_name}\n    type: duplicate_count\n    column: ${column_name}\n    fail: when > ${fail_threshold}"
      }
    ]
  }
}
```

---

### POST /check-plans
Create a new check plan.

**Request:**
```json
{
  "name": "Daily Customer Checks",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "public.customers",
  "description": "Daily checks for customer data quality",
  "checks": [
    {
      "template_id": "completeness-null",
      "columns": ["customer_id", "email"],
      "threshold": 0.98
    },
    {
      "template_id": "uniqueness-duplicate",
      "columns": ["customer_id"]
    }
  ],
  "custom_checks_yaml": "checks:\n  - name: custom email length\n    type: invalid_count\n    column: email\n    valid_max_length: 100"
}
```

**Response (201):**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440003",
  "name": "Daily Customer Checks",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "dataset_identifier": "public.customers",
  "checks_yaml": "configuration:\n  data_source: public.customers\n\nchecks:\n  - name: customer_id is not null\n    type: missing_count\n    column: customer_id\n    fail: when > 0\n  - name: email is not null\n    type: missing_count\n    column: email\n    fail: when > 20000\n  - name: customer_id is unique\n    type: duplicate_count\n    column: customer_id\n    fail: when > 0\n\n  - name: custom email length\n    type: invalid_count\n    column: email\n    valid_max_length: 100",
  "custom_checks_yaml": "...",
  "enabled": true,
  "created_at": "2025-01-15T10:10:00Z"
}
```

---

### GET /check-plans
List all check plans.

**Response (200):**
```json
[
  {
    "id": "850e8400-e29b-41d4-a716-446655440003",
    "name": "Daily Customer Checks",
    "connection_id": "550e8400-e29b-41d4-a716-446655440000",
    "dataset_identifier": "public.customers",
    "created_at": "2025-01-15T10:10:00Z"
  }
]
```

---

### GET /check-plans/{plan_id}
Get a specific check plan.

**Response (200):** Single plan object.

---

### PUT /check-plans/{plan_id}
Update a check plan.

**Request:** Same as POST /check-plans.

**Response (200):** Updated plan object.

---

### DELETE /check-plans/{plan_id}
Delete a check plan.

**Response (200):**
```json
{
  "message": "Check plan deleted"
}
```

---

## 5. Check Execution

### POST /runs
Execute a check plan.

**Request:**
```json
{
  "check_plan_id": "850e8400-e29b-41d4-a716-446655440003",
  "environment": "dev"
}
```

**Response (201):**
```json
{
  "run_id": "950e8400-e29b-41d4-a716-446655440004",
  "check_plan_id": "850e8400-e29b-41d4-a716-446655440003",
  "status": "queued",
  "created_at": "2025-01-15T10:15:00Z"
}
```

---

### GET /runs
List all runs.

**Query Parameters:**
- `plan_id` (optional): Filter by plan
- `status` (optional): Filter by status (pending, queued, running, succeeded, failed)
- `limit` (default: 20)
- `offset` (default: 0)

**Response (200):**
```json
{
  "total": 45,
  "runs": [
    {
      "run_id": "950e8400-e29b-41d4-a716-446655440004",
      "check_plan_id": "850e8400-e29b-41d4-a716-446655440003",
      "status": "running",
      "started_at": "2025-01-15T10:15:30Z",
      "created_at": "2025-01-15T10:15:00Z"
    }
  ]
}
```

---

### GET /runs/{run_id}
Get run status and summary.

**Response (200):**
```json
{
  "run_id": "950e8400-e29b-41d4-a716-446655440004",
  "check_plan_id": "850e8400-e29b-41d4-a716-446655440003",
  "status": "succeeded",
  "started_at": "2025-01-15T10:15:30Z",
  "completed_at": "2025-01-15T10:18:45Z",
  "total_duration_ms": 195000,
  "summary": {
    "total_checks": 4,
    "passed": 3,
    "warned": 0,
    "failed": 1,
    "errored": 0
  },
  "created_at": "2025-01-15T10:15:00Z"
}
```

---

## 6. Results

### GET /runs/{run_id}/results
Get all results for a run.

**Query Parameters:**
- `limit_samples` (default: 5): Number of failing rows to include

**Response (200):**
```json
{
  "run_id": "950e8400-e29b-41d4-a716-446655440004",
  "total_checks": 4,
  "passed": 3,
  "warned": 0,
  "failed": 1,
  "errored": 0,
  "results": [
    {
      "check_name": "customer_id is not null",
      "check_type": "Completeness",
      "status": "passed",
      "metric_name": "missing_count",
      "metric_value": 0,
      "metric_threshold": 0,
      "execution_time_ms": 2345,
      "query_used": "SELECT COUNT(*) FROM public.customers WHERE customer_id IS NULL",
      "sample_failing_rows": null,
      "error_message": null
    },
    {
      "check_name": "customer_id is unique",
      "check_type": "Uniqueness",
      "status": "failed",
      "metric_name": "duplicate_count",
      "metric_value": 15,
      "metric_threshold": 0,
      "execution_time_ms": 4567,
      "query_used": "SELECT customer_id, COUNT(*) FROM public.customers GROUP BY customer_id HAVING COUNT(*) > 1",
      "sample_failing_rows": [
        { "customer_id": 12345, "count": 2 },
        { "customer_id": 67890, "count": 3 }
      ],
      "error_message": null
    }
  ]
}
```

---

### GET /runs/{run_id}/export
Export results.

**Query Parameters:**
- `format`: "json" or "html" (default: json)

**Response (200) - JSON:**
```json
{
  "export_id": "exp-001",
  "run_id": "950e8400-e29b-41d4-a716-446655440004",
  "format": "json",
  "content_type": "application/json",
  "data": "[...]"
}
```

**Response (200) - HTML:**
Headers:
```
Content-Type: text/html
Content-Disposition: attachment; filename="run-950e8400-results.html"
```

Body: HTML report (TBD formatting).

---

## 7. Audit Logs

### GET /audit-logs
List audit logs.

**Query Parameters:**
- `action` (optional): Filter by action
- `limit` (default: 100)

**Response (200):**
```json
[
  {
    "id": "a50e8400-e29b-41d4-a716-446655440005",
    "user_id": null,
    "action": "create_connection",
    "resource_type": "Connection",
    "resource_id": "550e8400-e29b-41d4-a716-446655440000",
    "details": {
      "name": "prod_warehouse",
      "type": "postgres"
    },
    "created_at": "2025-01-15T10:00:00Z"
  },
  {
    "id": "a50e8400-e29b-41d4-a716-446655440006",
    "user_id": null,
    "action": "run_checks",
    "resource_type": "Run",
    "resource_id": "950e8400-e29b-41d4-a716-446655440004",
    "details": {
      "plan_id": "850e8400-e29b-41d4-a716-446655440003",
      "environment": "dev"
    },
    "created_at": "2025-01-15T10:15:00Z"
  }
]
```

---

## Error Responses

All errors return JSON with `detail` field.

### 400 Bad Request
```json
{
  "detail": "Invalid request format or missing required fields"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "An unexpected error occurred"
}
```

---

## Rate Limiting (Phase 2)

`X-RateLimit-Limit: 1000`  
`X-RateLimit-Remaining: 999`  
`X-RateLimit-Reset: 1705329300`

---

## Pagination

List endpoints support:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

Response includes:
```json
{
  "total": 1000,
  "limit": 20,
  "offset": 0,
  "items": [...]
}
```

---

End of API Specification
