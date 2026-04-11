# 🗄️ Database Schema Reference

**Version:** 1.0.0  
**Database:** PostgreSQL 16+  
**Processing Engine:** DuckDB 1.0.0 (embedded)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Tables](#tables)
3. [Indexes](#indexes)
4. [Entity Relationships](#entity-relationships)
5. [Migrations](#migrations)
6. [Views & Queries](#views--queries)

---

## Schema Overview

The data quality platform uses a **star schema** with:
- **Fact Table:** `runs` (check executions)
- **Dimension Tables:** `connections`, `check_plans`, `check_results`
- **Support Tables:** `metadata_snapshots`, `check_suggestions`, `job_queue`, `audit_logs`

**Key Principle:** All data is immutable (no updates; only inserts for audit trail)

---

## Tables

### connections

Stores data source configurations and credentials

```sql
CREATE TABLE connections (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,           -- 'postgres' | 'csv' | 'bigquery' | 'snowflake' | 'parquet'
    remote_url TEXT,                     -- Connection string or file path
    encrypted_secret TEXT,               -- Encrypted credentials (base64)
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID                      -- Optional: user ID
);
```

**Columns:**
- `id` - Unique identifier (UUID)
- `name` - User-friendly name (unique per platform)
- `type` - Connection type (enforced by CHECK constraint)
- `remote_url` - PostgreSQL: "postgresql://user:pass@host:5432/db" | CSV: "/path/to/file.csv"
- `encrypted_secret` - Encrypted credentials (TODO: implement encryption in v1.1)
- `created_at` - Timestamp of creation
- `updated_at` - Last modification time
- `created_by` - (Optional) User ID for multi-user environments

**Indexes:**
- `idx_connections_type` - Fast filtering by type

---

### metadata_snapshots

Versioned schema profiles (never deleted, audit trail)

```sql
CREATE TABLE metadata_snapshots (
    id UUID PRIMARY KEY,
    connection_id UUID NOT NULL,         -- FK: connections
    dataset_identifier VARCHAR(255),     -- Table name or dataset.table
    version INT DEFAULT 1,
    schema_json JSONB,                   -- Full schema definition
    profile_json JSONB,                  -- Column statistics & profiling
    row_count BIGINT,
    profile_duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `schema_json` - JSON array of column definitions
  ```json
  [
    {"name": "id", "data_type": "integer", "nullable": false},
    {"name": "email", "data_type": "string", "nullable": true}
  ]
  ```

- `profile_json` - JSON object with per-column statistics
  ```json
  {
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
    }
  }
  ```

**Unique Constraint:** `(connection_id, dataset_identifier, version)`

**Indexes:**
- `idx_metadata_snapshots_connection`
- `idx_metadata_snapshots_connection_dataset`

---

### check_plans

User-defined quality check configurations

```sql
CREATE TABLE check_plans (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL,         -- FK: connections
    dataset_identifier VARCHAR(255),
    description TEXT,
    checks_yaml TEXT,                    -- Soda Core YAML definition
    custom_checks_yaml TEXT,             -- User-written custom checks (v1.1)
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID
);
```

**Columns:**
- `checks_yaml` - Soda Core check definition (YAML format)
  ```yaml
  checks:
    - type: missing_count
      column: email
      warn_when: "> 1000"
    - type: duplicate_count
      column: id
      warn_when: "> 0"
  ```

- `enabled` - Soft delete flag (not deleted; just disabled)

**Unique Constraint:** `(connection_id, dataset_identifier, name)`

**Indexes:**
- `idx_check_plans_connection`
- `idx_check_plans_dataset`

---

### check_suggestions

AI-generated suggestions (populated by suggestion engine)

```sql
CREATE TABLE check_suggestions (
    id UUID PRIMARY KEY,
    metadata_snapshot_id UUID NOT NULL,  -- FK: metadata_snapshots
    suggestion_set_id UUID,              -- Grouping ID (all suggestions from one generation)
    rule_id VARCHAR(100),                -- 'rule-null-check', 'rule-pk-candidate', etc.
    check_name VARCHAR(255),             -- Which check this suggests
    check_type VARCHAR(50),              -- 'completeness', 'uniqueness', etc.
    rationale TEXT,                      -- Explanation for the suggestion
    suggested_check_yaml TEXT,           -- YAML snippet (copy-paste ready)
    confidence_score FLOAT,              -- 0.0 - 1.0 confidence
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `rule_id` - One of 12 rules:
  1. `rule-null-check` - Suggests NULL value check
  2. `rule-uniqueness-key` - Suggests primary key check
  3. `rule-duplicate-rows` - Suggests duplicate row check
  4. `rule-freshness` - Suggests freshness/staleness check
  5. `rule-pattern-match` - Suggests regex/pattern check
  6. `rule-range-check` - Suggests numeric range check
  7. `rule-referential-integrity` - Suggests FK check
  8. `rule-anomaly-detection` - Suggests outlier check
  9. `rule-schema-drift` - Suggests schema validation
  10. `rule-type-mismatch` - Suggests type conversion
  11. `rule-completeness` - Suggests field importance
  12. `rule-seasonality` - Suggests trend/seasonality check

- `confidence_score` - Higher = more confident in suggestion

**Indexes:**
- `idx_check_suggestions_snapshot`
- `idx_check_suggestions_type`

---

### runs

Execution instances (immutable audit trail)

```sql
CREATE TABLE runs (
    id UUID PRIMARY KEY,
    check_plan_id UUID NOT NULL,         -- FK: check_plans
    connection_id UUID NOT NULL,         -- Denormalized for fast queries
    status VARCHAR(50),                  -- 'pending' | 'queued' | 'running' | 'succeeded' | 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration_ms INT,
    pass_count INT,
    warn_count INT,
    fail_count INT,
    error_count INT,
    error_message TEXT,
    environment VARCHAR(50),             -- 'dev' | 'staging' | 'prod'
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `status` - Lifecycle:
  - `pending` - Created, waiting to run
  - `queued` - Job queued in worker
  - `running` - Currently executing
  - `succeeded` - Completed successfully
  - `failed` - Execution failed

- `total_duration_ms` - Wall-clock time from start to completion

**Indexes:**
- `idx_runs_plan` - Filter by check plan
- `idx_runs_status` - Filter by status
- `idx_runs_created_at` - Sort by recency

---

### check_results

Individual check results (one row per check executed)

```sql
CREATE TABLE check_results (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL,                -- FK: runs
    check_name VARCHAR(255),             -- 'missing_count', 'duplicate_count', etc.
    check_type VARCHAR(50),              -- 'completeness', 'uniqueness', etc.
    status VARCHAR(50),                  -- 'passed' | 'warned' | 'failed' | 'error'
    metric_name VARCHAR(255),            -- 'missing_percent', 'duplicate_count', etc.
    metric_value FLOAT,                  -- Calculated value
    metric_threshold FLOAT,              -- Expected threshold
    query_used TEXT,                     -- Actual SQL/DuckDB query
    execution_time_ms INT,               -- Time to execute this check
    sample_failing_rows JSONB,           -- JSON array of failing rows
    error_message TEXT,                  -- Error details (if status='error')
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `status` - Result:
  - `passed` - Check passed (value within threshold)
  - `warned` - Warning threshold exceeded
  - `failed` - Failure threshold exceeded
  - `error` - Check execution error

- `sample_failing_rows` - JSON array (max 10) of rows that failed
  ```json
  [
    {"id": 12345, "email": "duplicate@example.com"},
    {"id": 54321, "email": "another@duplicate.com"}
  ]
  ```

**Indexes:**
- `idx_check_results_run` - Filter by run
- `idx_check_results_status` - Filter by status

---

### job_queue

Background task queue (supporting async execution)

```sql
CREATE TABLE job_queue (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL,                -- FK: runs
    payload JSONB,                       -- Serialized job config
    status VARCHAR(50),                  -- 'pending' | 'processing' | 'completed' | 'failed'
    worker_id VARCHAR(100),              -- Which worker processing this
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `payload` - Serialized job config
  ```json
  {
    "check_plan_id": "uuid",
    "connection_id": "uuid",
    "dataset_identifier": "customers"
  }
  ```

**Indexes:**
- `idx_job_queue_status` - Filter pending jobs
- `idx_job_queue_run_id` - Filter by run

---

### audit_logs

Compliance trail (all user actions)

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100),                 -- 'create_connection', 'run_checks', etc.
    resource_type VARCHAR(100),          -- 'Connection', 'CheckPlan', 'Run'
    resource_id UUID,                    -- Which resource was affected
    details JSONB,                       -- Additional context
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Columns:**
- `action` - Standard operations:
  - `create_connection` - New data source registered
  - `upload_csv` - File uploaded
  - `profile_metadata` - Schema extracted
  - `create_check_plan` - Check plan created
  - `execute_checks` - Checks executed
  - `update_check_plan` - Plan modified
  - `delete_connection` - Source deleted

**Indexes:**
- `idx_audit_logs_created_at` - Recency queries
- `idx_audit_logs_user_id` - Filter by user

---

## Indexes

**Primary**
- Connections: `(name)` - Unique
- MetadataSnapshots: `(connection_id, dataset_identifier, version)` - Unique
- CheckPlans: `(connection_id, dataset_identifier, name)` - Unique

**Foreign Keys** (implicit indexes)
- All FK columns indexed automatically

**Query Optimization**
- `runs(status, created_at DESC)` - Recent runs by status
- `check_results(run_id, status)` - Results for visualization
- `metadata_snapshots(connection_id)` - All profiles for a source

---

## Entity Relationships

```mermaid
erDiagram
    CONNECTIONS ||--o{ METADATA_SNAPSHOTS : has
    CONNECTIONS ||--o{ CHECK_PLANS : has
    CONNECTIONS ||--o{ RUNS : executes
    METADATA_SNAPSHOTS ||--o{ CHECK_SUGGESTIONS : generates
    CHECK_PLANS ||--o{ RUNS : executes
    RUNS ||--o{ CHECK_RESULTS : produces
    RUNS ||--o{ JOB_QUEUE : queues
    CONNECTIONS ||--o{ AUDIT_LOGS : documents
    CHECK_PLANS ||--o{ AUDIT_LOGS : documents
```

---

## Migrations

### v1.0.0 - Initial Schema

```bash
# Apply initial schema
psql -U postgres -d data_quality -f backend/schema.sql

# Verify
psql -U postgres -d data_quality -c "\dt"
```

### Future Migrations (v1.1+)

- [ ] Add column-level encryption for secrets
- [ ] Add user table for multi-tenancy
- [ ] Add check_history table for check definition versioning
- [ ] Add custom_metrics table for extensibility

---

## Views & Queries

### View: Recent Run Summary

```sql
SELECT
    r.id,
    cp.name as check_plan,
    c.name as connection,
    r.status,
    r.pass_count,
    r.fail_count,
    r.total_duration_ms,
    r.created_at
FROM runs r
JOIN check_plans cp ON r.check_plan_id = cp.id
JOIN connections c ON r.connection_id = c.id
ORDER BY r.created_at DESC
LIMIT 10;
```

### View: Quality Scorecard (30 days)

```sql
SELECT
    c.name as connection,
    c.id,
    COUNT(r.id)::float / NULLIF(
        COUNT(CASE WHEN r.status = 'succeeded' THEN 1 END), 0
    ) * 100 as success_rate,
    AVG(r.total_duration_ms) as avg_duration_ms,
    MAX(r.created_at) as last_run
FROM runs r
JOIN check_plans cp ON r.check_plan_id = cp.id
JOIN connections c ON r.connection_id = c.id
WHERE r.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name
ORDER BY success_rate DESC;
```

### View: Failing Checks (Last 7 days)

```sql
SELECT
    cr.check_name,
    cr.check_type,
    COUNT(*) as fail_count,
    r.created_at,
    c.name as connection
FROM check_results cr
JOIN runs r ON cr.run_id = r.id
JOIN check_plans cp ON r.check_plan_id = cp.id
JOIN connections c ON r.connection_id = c.id
WHERE cr.status IN ('failed', 'error')
  AND r.created_at > NOW() - INTERVAL '7 days'
GROUP BY cr.check_name, cr.check_type, r.created_at, c.name
ORDER BY fail_count DESC;
```

---

## Backup & Recovery

### Backup

```bash
# Full backup
pg_dump -U postgres -h localhost data_quality > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U postgres -h localhost data_quality | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore

```bash
# From uncompressed backup
psql -U postgres -d data_quality < backup-20260411.sql

# From compressed backup
gunzip -c backup-20260411.sql.gz | psql -U postgres -d data_quality
```

---

## Performance Tuning

### Connection Pooling

In production, use a connection pool (not direct connections):
- **PgBouncer** or **pgpool-II**
- Configure for 50-100 concurrent connections
- Reuse connections to reduce overhead

### Statistics

Regularly update table statistics for query optimization:
```sql
ANALYZE;
```

### Vacuum

Regularly clean up dead rows:
```sql
VACUUM ANALYZE;
```

---

## Monitoring

### Monitor Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Slow Queries

Enable in `postgresql.conf`:
```
log_min_duration_statement = 1000  # Log queries > 1 second
```

### Monitor Replication Lag (Production)

```sql
SELECT 
    slot_name,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;
```

---

**Last Updated:** 2026-04-11  
**Maintained By:** Database Team  
**Next Review:** 2026-05-11
