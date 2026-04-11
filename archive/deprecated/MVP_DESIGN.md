# Data Quality Platform - MVP Design Document

**Version:** 1.0  
**Status:** Design Phase  
**Target Ship Date:** 2–3 weeks  

---

## A. MVP SCOPE & ASSUMPTIONS

### In Scope (MVP v1)
- [x] Multi-source dataset connections (Postgres, local CSV/Parquet, read-only BigQuery service account)
- [x] Automatic schema extraction and basic column profiling
- [x] Heuristic-based check suggestions (~15 rules)
- [x] Soda Core check library browser and plan builder
- [x] Custom SodaCL YAML check editing
- [x] Single-tenant, local user auth (no SSO in MVP)
- [x] Async check execution with job queue
- [x] Results dashboard with per-check metrics and sample data
- [x] JSON + HTML report export
- [x] Audit logging of check runs

### Out of Scope (Phase 2+)
- [ ] Multi-tenancy with RBAC
- [ ] SSO / OAuth2
- [ ] Custom Python plugin sandbox
- [ ] Dataflow-based (orchestration pipelines)
- [ ] ML-based drift detection
- [ ] Real-time streaming checks
- [ ] Native integrations with data catalogs (Collibra, Alation)

### Key Assumptions
1. **Single Dataset at a Time:** MVP supports profiling one dataset per session; no cross-dataset joins.
2. **Synchronous Metadata Extraction:** Metadata profiling runs synchronously (< 30s for typical datasets). Async for very large datasets (TBD threshold).
3. **Check Execution Model:** Soda Core handles all check execution. Custom Python checks deferred to Phase 2.
4. **Storage:** All app data (runs, results, audit logs) stored in Postgres. Logs as TEXT in database; optional S3 integration later.
5. **No Cloud Secrets Mgmt:** MVP uses environment variables for connection secrets (DATABASE_URL, BIGQUERY_CREDS, etc.).
6. **Single Node Deployment:** MVP assumes single API server + worker process (not distributed). Celery/Redis upgrade in Phase 2.

---

## B. ARCHITECTURE OVERVIEW

### System Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WEB BROWSER                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  React SPA                                                       │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────┐               │  │
│  │  │  Connect  │ │   Metadata   │ │   Suggest   │               │  │
│  │  │  Dataset  │ │   Explorer   │ │   Checks    │               │  │
│  │  └────────────┘ └──────────────┘ └──────────────┘               │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────┐               │  │
│  │  │   Check   │ │   Run Plan   │ │   Results   │               │  │
│  │  │  Library  │ │   Builder    │ │  Dashboard  │               │  │
│  │  └────────────┘ └──────────────┘ └──────────────┘               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              ↕ REST/JSON                               │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ↓                ↓                ↓
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │  FastAPI     │ │  FastAPI     │ │  Worker      │
        │  (Web API)   │ │  (Auth/Util) │ │  Process     │
        │              │ │              │ │              │
        │ • Connect    │ │ • Check Plan │ │ • Run Soda   │
        │ • Metadata   │ │ • Run Status │ │   Core       │
        │ • Suggest    │ │ • Results    │ │ • Poll queue │
        │              │ │              │ │              │
        └──────────────┘ └──────────────┘ └──────────────┘
                 │              │                │
                 └──────────────┴────────────────┘
                              │
                  ┌───────────┼───────────┐
                  ↓           ↓           ↓
         ┌────────────────────────────────────────┐
         │       PostgreSQL Database              │
         │  ┌──────────────────────────────────┐  │
         │  │ • Connections (encrypted)       │  │
         │  │ • Metadata snapshots            │  │
         │  │ • Check plans                   │  │
         │  │ • Job queue / Worker state      │  │
         │  │ • Runs + Results                │  │
         │  │ • Audit logs                    │  │
         │  └──────────────────────────────────┘  │
         └────────────────────────────────────────┘
                  │           │           │
         ┌────────┴──────┬────┴─────┬────┴──────┐
         ↓               ↓           ↓           ↓
      Postgres     BigQuery   Snowflake    CSV/Parquet
     (via psycopg) (via SDK)   (via SDK)    (via DuckDB)
```

### Module Breakdown

```
data-quality-platform/
├── backend/
│   ├── src/
│   │   ├── api/              # FastAPI endpoints
│   │   │   ├── routes/
│   │   │   │   ├── connection.py
│   │   │   │   ├── metadata.py
│   │   │   │   ├── suggestions.py
│   │   │   │   ├── checks.py
│   │   │   │   ├── runs.py
│   │   │   │   └── results.py
│   │   │   ├── models.py     # Pydantic schemas
│   │   │   └── deps.py       # Dependencies
│   │   ├── core/
│   │   │   ├── config.py     # Settings + env vars
│   │   │   ├── security.py   # Secrets, auth
│   │   │   ├── constants.py
│   │   │   └── logger.py
│   │   ├── services/         # Business logic
│   │   │   ├── connection.py # Multi-source connectors
│   │   │   ├── metadata.py   # Profile + schema extraction
│   │   │   ├── suggestions.py # Heuristic engine
│   │   │   ├── checks.py     # Check plan CRUD
│   │   │   └── execution.py  # Soda runner + queue
│   │   ├── models/           # DB models
│   │   │   └── db.py         # SQLAlchemy ORM
│   │   ├── worker/           # Background jobs
│   │   │   ├── queue.py      # Job queue manager
│   │   │   ├── runner.py     # Soda executor
│   │   │   └── processor.py  # Job processor loop
│   │   ├── storage/          # Data access
│   │   │   ├── db.py         # DB connection
│   │   │   └── repos.py      # Repository pattern
│   │   ├── connectors/       # Data source adapters
│   │   │   ├── base.py
│   │   │   ├── postgres.py
│   │   │   ├── bigquery.py
│   │   │   └── local.py
│   │   ├── soda_templates/   # SodaCL templates
│   │   │   ├── base.py
│   │   │   └── templates/
│   │   │       ├── completeness.yml
│   │   │       ├── uniqueness.yml
│   │   │       └── ...
│   │   └── main.py           # FastAPI app factory
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Connect.tsx
│   │   │   ├── Metadata.tsx
│   │   │   ├── Suggestions.tsx
│   │   │   ├── CheckLibrary.tsx
│   │   │   ├── PlanBuilder.tsx
│   │   │   ├── RunMonitor.tsx
│   │   │   └── Results.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   └── package.json
└── docs/
    ├── API.md
    ├── SODA_INTEGRATION.md
    └── DEPLOYMENT.md
```

---

## C. DATA MODEL (PostgreSQL DDL)

```sql
-- Connections: Encrypted secrets + metadata
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'postgres', 'bigquery', 'csv', etc.
    remote_url TEXT,                 -- JDBC string, file path, etc.
    encrypted_secret TEXT,            -- Encrypted connection string
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT connection_name_unique UNIQUE (name)
);

-- Metadata: Schema snapshots (versioned)
CREATE TABLE metadata_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    dataset_identifier VARCHAR(255),    -- table name, dataset name, etc.
    version INT DEFAULT 1,
    schema_json JSONB NOT NULL,         -- Full schema with column types
    profile_json JSONB NOT NULL,        -- Column profiling results
    row_count BIGINT,
    profile_duration_ms INT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT meta_version_unique UNIQUE (connection_id, dataset_identifier, version)
);

-- Check Plans: User-defined check templates per dataset
CREATE TABLE check_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    dataset_identifier VARCHAR(255) NOT NULL,
    description TEXT,
    checks_yaml TEXT NOT NULL,         -- Generated SodaCL YAML
    custom_checks_yaml TEXT,            -- Optional custom SodaCL
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT plan_name_dataset_unique UNIQUE (connection_id, dataset_identifier, name)
);

-- Check Suggestions: Heuristic suggestions (audit trail)
CREATE TABLE check_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata_snapshot_id UUID NOT NULL REFERENCES metadata_snapshots(id) ON DELETE CASCADE,
    suggestion_set_id UUID,             -- Group suggestions by generation
    rule_id VARCHAR(100),               -- e.g., 'null_check_for_pii'
    check_name VARCHAR(255),
    check_type VARCHAR(100),            -- 'completeness', 'uniqueness', etc.
    rationale TEXT,
    suggested_check_yaml TEXT,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Runs: Execution records
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_plan_id UUID NOT NULL REFERENCES check_plans(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, queued, running, succeeded, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_duration_ms INT,
    pass_count INT DEFAULT 0,
    warn_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_message TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT run_status_valid CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed'))
);

-- Results: Per-check results
CREATE TABLE check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(100),
    status VARCHAR(50) NOT NULL,        -- 'passed', 'warned', 'failed', 'error'
    metric_name VARCHAR(255),
    metric_value FLOAT,
    metric_threshold FLOAT,
    query_used TEXT,                    -- Actual SQL query executed
    execution_time_ms INT,
    sample_failing_rows JSONB,          -- Up to N failing rows
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT result_status_valid CHECK (status IN ('passed', 'warned', 'failed', 'error'))
);

-- Job Queue: Simple async queue
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,             -- Serialized job data
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    worker_id VARCHAR(100),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_detail TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT job_status_valid CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Audit Logs: Compliance trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100),                -- 'create_connection', 'run_checks', etc.
    resource_type VARCHAR(100),         -- 'Connection', 'CheckPlan', 'Run'
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_metadata_snapshots_connection ON metadata_snapshots(connection_id);
CREATE INDEX idx_check_plans_connection_dataset ON check_plans(connection_id, dataset_identifier);
CREATE INDEX idx_check_suggestions_snapshot ON check_suggestions(metadata_snapshot_id);
CREATE INDEX idx_runs_plan ON runs(check_plan_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_at ON runs(created_at);
CREATE INDEX idx_check_results_run ON check_results(run_id);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## D. API DESIGN

### 1. Connection Management
**`POST /api/v1/connections`**
```json
Request:
{
  "name": "prod_warehouse",
  "type": "postgres",
  "remote_url": "postgres://localhost:5432/analytics",
  "secret": "user:password"  // Will be encrypted
}

Response:
{
  "id": "conn-123...",
  "name": "prod_warehouse",
  "type": "postgres",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**`POST /api/v1/connections/{id}/test`**
- Returns: `{ "success": true, "message": "Connected successfully" }` or error

**`GET /api/v1/connections`**
- Lists all connections (secrets redacted)

---

### 2. Metadata & Profiling
**`POST /api/v1/connections/{id}/profile`**
```json
Request:
{
  "dataset_identifier": "public.customers"
}

Response:
{
  "snapshot_id": "snap-456...",
  "dataset_identifier": "public.customers",
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
        "nullable": false,
        "pii": true
      }
    ]
  },
  "profile": {
    "customer_id": {
      "row_count": 1000000,
      "null_count": 0,
      "distinct_count": 999995,
      "min": 1,
      "max": 1000000
    },
    "email": {
      "row_count": 1000000,
      "null_count": 0,
      "distinct_count": 1000000,
      "min_length": 5,
      "max_length": 100
    }
  },
  "duration_ms": 3500
}
```

**`GET /api/v1/metadata/snapshots/{snapshot_id}`**
- Retrieve a specific metadata snapshot

---

### 3. Check Suggestions
**`POST /api/v1/suggestions/generate`**
```json
Request:
{
  "snapshot_id": "snap-456..."
}

Response:
{
  "suggestion_set_id": "set-789...",
  "suggestions": [
    {
      "id": "sugg-1",
      "rule_id": "null_check_for_nullable_cols",
      "check_name": "customer_id is not null",
      "check_type": "Completeness",
      "rationale": "PK should have no nulls",
      "confidence": 0.95,
      "suggested_yaml": "checks:\n  - name: customer_id is not null\n    ..."
    },
    {
      "id": "sugg-2",
      "rule_id": "distinctness_check_for_pk",
      "check_name": "customer_id is unique",
      "check_type": "Uniqueness",
      "rationale": "Looks like a primary key",
      "confidence": 0.9,
      "suggested_yaml": "..."
    }
  ]
}
```

**`GET /api/v1/suggestions/rules`**
- List all available heuristic rules (for transparency)

---

### 4. Check Library & Plans
**`GET /api/v1/checks/library`**
```json
Response:
{
  "categories": [
    {
      "name": "Completeness",
      "checks": [
        {
          "id": "completeness-null",
          "name": "Missing Values",
          "description": "Check for NULL values in a column",
          "template": "checks:\n  - name: ${check_name}\n    ..."
        }
      ]
    }
  ]
}
```

**`POST /api/v1/check-plans`**
```json
Request:
{
  "name": "Daily Customer Checks",
  "connection_id": "conn-123...",
  "dataset_identifier": "public.customers",
  "description": "Daily checks for data quality",
  "checks": [
    {
      "template_id": "completeness-null",
      "columns": ["customer_id", "email"],
      "threshold": 0.98
    }
  ],
  "custom_checks_yaml": "checks:\n  ..."
}

Response:
{
  "id": "plan-001...",
  "name": "Daily Customer Checks",
  "checks_yaml": "..." // Generated SodaCL
}
```

**`GET /api/v1/check-plans/{plan_id}`**
**`PUT /api/v1/check-plans/{plan_id}`**
**`DELETE /api/v1/check-plans/{plan_id}`**

---

### 5. Check Execution
**`POST /api/v1/runs`**
```json
Request:
{
  "check_plan_id": "plan-001...",
  "environment": "dev"  // Optional: dev/staging/prod
}

Response:
{
  "run_id": "run-123...",
  "status": "queued",
  "created_at": "2025-01-15T11:30:00Z"
}
```

**`GET /api/v1/runs/{run_id}`**
```json
Response:
{
  "run_id": "run-123...",
  "status": "succeeded",
  "started_at": "2025-01-15T11:30:00Z",
  "completed_at": "2025-01-15T11:35:00Z",
  "total_duration_ms": 300000,
  "summary": {
    "total_checks": 10,
    "passed": 8,
    "warned": 1,
    "failed": 1
  }
}
```

---

### 6. Results
**`GET /api/v1/runs/{run_id}/results`**
```json
Response:
{
  "run_id": "run-123...",
  "results": [
    {
      "check_name": "customer_id is not null",
      "check_type": "Completeness",
      "status": "passed",
      "metric_name": "missing_percent",
      "metric_value": 0.0,
      "threshold": 2.0,  // 2% allowed
      "execution_time_ms": 2345,
      "query_used": "SELECT COUNT(*) FROM public.customers WHERE customer_id IS NULL"
    },
    {
      "check_name": "email domain validation",
      "check_type": "Validity",
      "status": "failed",
      "metric_name": "invalid_count",
      "metric_value": 150,
      "threshold": 10,
      "execution_time_ms": 3456,
      "query_used": "SELECT email FROM ... WHERE email NOT LIKE '%.%'",
      "sample_failing_rows": [
        { "email": "invalid-email" },
        { "email": "no@domain" }
      ],
      "error_message": null
    }
  ]
}
```

**`GET /api/v1/runs/{run_id}/export?format=json|html`**
- Export results as JSON or HTML report

---

## E. SODA INTEGRATION APPROACH

### SodaCL Template Storage
Templates are YAML files in `src/soda_templates/templates/`:

```yaml
# completeness.yml
name: "Completeness Check - Missing Values"
type: "Completeness"
description: "Verify that a column has no (or minimal) NULL values"
parameters:
  column_name:
    type: string
    required: true
  threshold_percent:
    type: float
    default: 2.0
    description: "Max % of NULLs allowed"

sodacl_template: |
  checks:
    - name: "{check_name}"
      type: missing_count
      column: {column_name}
      warn: when > {threshold_value} * 0.5
      fail: when > {threshold_value}
```

### Generated SodaCL Example
For dataset `public.customers`, auto-suggested checks:

```yaml
configuration:
  data_source: postgres_prod

checks:
  - name: "customer_id is not null"
    type: missing_count
    column: customer_id
    fail: when > 0

  - name: "email is mostly present"
    type: missing_count
    column: email
    warn: when > 10000
    fail: when > 50000

  - name: "customer_id is unique"
    type: duplicate_count
    column: customer_id
    fail: when > 0

  - name: "email pattern validation"
    type: invalid_count
    column: email
    valid regex: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
    fail: when > 1000
```

### Custom Check Validation
Custom YAML is validated via:
1. **Syntax:** Parse with PyYAML, ensure keys match SodaCL spec
2. **Column Refs:** Verify referenced columns exist in metadata
3. **Logic:** Warn if thresholds are unrealistic (e.g., > 100 million on < 1M row table)

---

## F. UX FLOW WALKTHROUGH

1. **User opens app** → redirected to "Connect Dataset" screen
2. **Selects data source** (Postgres, BigQuery, CSV file)
3. **Enters connection details** (host, port, table name, or file path)
4. **Clicks "Test Connection"** → API validates, returns success or error
5. **Clicks "Profile Dataset"** → backend extracts schema + profiling, displays in "Metadata Explorer"
6. **Browses schema** (columns, types, null %, distinct counts, sample values)
7. **Clicks "Suggest Checks"** → heuristic engine generates 10–15 check suggestions
8. **Reviews suggestions** with rationale and confidence scores
9. **Clicks "Start Plan"** → opens "Check Plan Builder"
10. **Selects library checks & custom checks** → builds up YAML config
11. **Clicks "Save Plan"** → persists plan to database
12. **Clicks "Run Checks Now"** → submits job, redirected to "Run Monitor"
13. **Monitor** shows: status (queued/running), ETA, progress bar
14. **Results page** appears → shows pass/fail by check, metrics, sample data, query used
15. **Exports** as JSON or HTML report

---

## G. MINIMAL CODE SCAFFOLD

### Key Files (Starter Templates)

**`backend/src/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import (
    connection, metadata, suggestions, checks, runs, results
)
from src.core.config import Settings

app = FastAPI(title="Data Quality Platform")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(connection.router, prefix="/api/v1/connections")
app.include_router(metadata.router, prefix="/api/v1/metadata")
# ... etc

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**`backend/src/services/suggestions.py`** (heuristic engine snippet)
```python
class SuggestionEngine:
    def __init__(self, metadata: MetadataSnapshot):
        self.metadata = metadata
    
    def generate_suggestions(self) -> List[CheckSuggestion]:
        suggestions = []
        for column in self.metadata.columns:
            suggestions.extend(self._suggest_for_column(column))
        return suggestions
    
    def _suggest_for_column(self, column: Column) -> List[CheckSuggestion]:
        checks = []
        
        # Rule 1: Null check for non-nullable PK/highly-unique cols
        if column.is_pk or column.distinct_count > 0.99 * column.row_count:
            checks.append(CheckSuggestion(
                rule_id="null_check_for_pk_like",
                check_name=f"{column.name} is not null",
                check_type="Completeness",
                rationale="Column appears to be a key or ID; expect no NULLs",
                confidence=0.95
            ))
        
        # Rule 2: Uniqueness check for high-cardinality columns
        if column.distinct_count > 0.95 * column.row_count:
            checks.append(CheckSuggestion(
                rule_id="uniqueness_check_high_cardinality",
                check_name=f"{column.name} is unique",
                check_type="Uniqueness",
                rationale="Very high cardinality suggests uniqueness constraint",
                confidence=0.85
            ))
        
        # ... more rules
        return checks
```

**`backend/src/worker/runner.py`** (Soda executor snippet)
```python
class SodaExecutor:
    def __init__(self, connection, dataset_identifier):
        self.connection = connection
        self.dataset_identifier = dataset_identifier
    
    async def run_checks(self, sodacl_yaml: str) -> RunResult:
        # 1. Write SodaCL to temp file
        # 2. Invoke Soda Core via subprocess or library
        # 3. Parse results
        # 4. Normalize to CheckResult schema
        # 5. Return aggregated RunResult
        pass
```

**`frontend/src/components/PlanBuilder.tsx`** (React snippet)
```typescript
const PlanBuilder: React.FC<{ snapshot: MetadataSnapshot }> = ({ snapshot }) => {
  const [selectedChecks, setSelectedChecks] = useState<CheckTemplate[]>([]);
  const [customYaml, setCustomYaml] = useState("");

  const handleAddCheck = (template: CheckTemplate) => {
    setSelectedChecks([...selectedChecks, template]);
  };

  const handleSavePlan = async () => {
    const plan = {
      name: "My Plan",
      checks: selectedChecks.map(c => c.id),
      custom_checks_yaml: customYaml
    };
    const res = await fetch("/api/v1/check-plans", {
      method: "POST",
      body: JSON.stringify(plan)
    });
    // ... handle response
  };

  return (
    <div className="plan-builder">
      <h2>Build Check Plan</h2>
      <CheckLibraryBrowser onSelectCheck={handleAddCheck} />
      <div className="selected-checks">
        {selectedChecks.map(c => <CheckCard key={c.id} check={c} />)}
      </div>
      <textarea value={customYaml} onChange={e => setCustomYaml(e.target.value)} />
      <button onClick={handleSavePlan}>Save Plan</button>
    </div>
  );
};
```

---

## H. CHECK SUGGESTION RULESET (15 Rules)

| # | Rule ID | Trigger | Suggested Check | Check Type | Confidence | Example |
|---|---------|---------|-----------------|------------|------------|---------|
| 1 | null_check_for_pk_like | Column is_pk OR distinct_count > 99% rows | `{col} is not null` | Completeness | 0.95 | user_id |
| 2 | uniqueness_check_high_card | distinct_count > 95% rows | `{col} is unique` | Uniqueness | 0.85 | email |
| 3 | missing_check_nullable | nullable=true AND name contains "email", "phone", etc. | `{col} missing % < 5%` | Completeness | 0.80 | phone_number |
| 4 | range_check_numeric | column type in (INT, FLOAT, DECIMAL) | `{col} between {min} and {max}` | Validity | 0.75 | age, price |
| 5 | pattern_check_email | column name contains "email" OR inferred pattern | `{col} matches regex ^[.*@.*]` | Validity | 0.80 | email |
| 6 | pattern_check_phone | column name contains "phone" | `{col} matches regex ^\d{10}$` | Validity | 0.70 | phone |
| 7 | date_freshness_check | column.name contains "created", "updated", "date" & is TIMESTAMP | `{col} > now() - interval 30 days` | Freshness | 0.75 | created_at |
| 8 | duplicate_check_on_subset | {col1, col2} form natural key (high combined distinct) | `composite({cols}) is unique` | Uniqueness | 0.80 | order_date, order_id |
| 9 | zero_value_check_amounts | column name contains "amount", "price", type NUMERIC | `{col} >= 0` | Validity | 0.85 | total_amount |
| 10 | length_check_postal | column name contains "postal", "zip", "code" | `{col} length = N` | Validity | 0.70 | postal_code |
| 11 | enum_check_status | distinct_count < 10 AND name contains "status" | `{col} in ('value1', 'value2', ...)` | Validity | 0.80 | order_status |
| 12 | referential_integrity | PK in one table, FK in another (inferred from name) | `{fk_col} referential integrity with {pk_table}.{pk_col}` | Referential | 0.70 | customer_id → customers.id |
| 13 | outlier_check_numeric | column is NUMERIC with min/max > 3σ from mean | `{col} standard_dev < 3.5` | Anomaly | 0.65 | price, quantity |
| 14 | distribution_check_categorical | low-cardinality categorical column with imbalanced distribution | `{col} value_distribution warn if {top_val} > 80%` | Distribution | 0.60 | country |
| 15 | null_rate_trend | time-series columns (daily, hourly partitions) | `{col} missing % trend` | Freshness/Drift | 0.55 | event_timestamp |

---

## I. NON-FUNCTIONAL REQUIREMENTS

### Observability
- **Logging:** Structured JSON logs (python-json-logger) to stdout; ELK/Splunk optional
- **Metrics:** Prometheus-compatible metrics endpoint (`/metrics`) for job latency, check duration, pass rate
- **Tracing:** Optional OpenTelemetry integration for end-to-end tracing (Phase 2)
- **Audit Trail:** All user actions (profile, run, create plan) logged to `audit_logs` table with user_id, timestamp, resource_id

### Error Handling
- **Connection Errors:** Graceful fallback; retry with exponential backoff (3 attempts, 1s/5s/10s delays)
- **Check Execution Errors:** Captured in `error_message` column; run marked as `failed` if > 50% checks error
- **User Errors:** Validation at API layer; return 400 with clear message (e.g., "Column 'foo' not found in metadata")
- **System Errors:** 500 errors logged with traceback; user-facing message is generic ("An unexpected error occurred. Contact support.")

### Performance Guardrails
- **Metadata Profiling:** < 30s SLA for tables < 100M rows; async for larger
- **Suggestion Gen:** < 2s (in-memory heuristics only)
- **Check Execution:** depends on query complexity but target < 5min for typical plan
- **Results Query:** < 1s for result retrieval (indexed on run_id)
- **Worker:** Process 1 job at a time (single MVP worker); 60s job timeout with preempt signal

### RBAC Model (MVP: Simple 3-tier)
```
Roles:
  - Admin: Can create connections, delete plans/runs, view all audit logs
  - Editor: Can create plans, run checks, view results
  - Viewer: Can only view metadata, suggestions, past results (read-only)

Enforcement:
  - Every endpoint checks role via JWT token (if implemented) or session cookie
  - Connections and plans scoped to created_by user unless role is Admin
```

### Multi-Environment Handling
- **Config Layers:** base.env > {ENV}.env > env vars
- **Environments:** dev, staging, prod
- **Per-Env Secrets:** DATABASE_URL, SODA_RUNNER_TIMEOUT, LOG_LEVEL stored separately
- **Run Metadata:** runs table includes `environment` column for audit trail

---

## J. TESTING PLAN

### Unit Tests
**File:** `backend/tests/unit/test_suggestions.py`
```python
def test_null_check_suggested_for_pk_like_column():
    # Given a column with 0 nulls and 99.5% distinct count
    # When suggestion engine is run
    # Then null_check_for_pk_like rule fires with high confidence
    pass

def test_uniqueness_check_not_suggested_low_cardinality():
    # Given a column with 50% distinct count
    # When suggestion engine is run
    # Then uniqueness check is not suggested
    pass

def test_email_pattern_suggested_for_email_column():
    # Given column named "email_address"
    # When suggestion engine is run
    # Then pattern_check_email rule fires
    pass
```

### Integration Tests
**File:** `backend/tests/integration/test_soda_execution.py`
```python
@pytest.mark.asyncio
async def test_sodacl_execution_on_test_dataset():
    # Given a test Postgres table with known issues (nulls, duplicates)
    # When SodaExecutor runs generated SodaCL
    # Then results contain expected check statuses and metrics
    pass

@pytest.mark.asyncio
async def test_job_queue_processes_run():
    # Given a queued job in job_queue table
    # When worker polls and processes
    # Then job status transitions to 'completed' and results are saved
    pass
```

### UI Smoke Tests
**File:** `frontend/src/App.test.tsx`
```typescript
test("navigate through all main screens", async () => {
  // 1. Render app
  // 2. Click "Connect Dataset"
  // 3. Fill form + test connection
  // 4. Navigate to "Metadata"
  // 5. Navigate to "Suggestions"
  // 6. Navigate to "Check Plan"
  // 7. Save & run
  // 8. Verify results page renders
});
```

### Manual Acceptance Tests
- E2E scenario: Connect to test Postgres DB → profile → suggest checks → select 5 checks → run → verify results match manual Soda execution

---

## K. DEPLOYMENT & OPERATIONS

### Container Strategy (MVP)
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ src/
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

# web API runs on port 8000
# Worker process runs via separate container or process (docker-compose)
```

### Docker Compose (Local MVP)
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15
    env_file: .env
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./backend
    depends_on:
      - postgres
    env_file: .env
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src

  worker:
    build: ./backend
    depends_on:
      - postgres
    env_file: .env
    command: ["python", "-m", "src.worker.processor"]
    volumes:
      - ./backend/src:/app/src

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: "http://localhost:8000"

volumes:
  pg_data:
```

---

## L. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Soda Core has breaking changes | Med | Pin version in requirements.txt; test on pre-prod |
| Large check execution timeouts | Med | Implement job timeout + preempt signal; offer async polling UI |
| Secrets leak in logs | High | Use structured logging; mask sensitive values; review audit logs regularly |
| Worker crashes mid-execution | High | Persist job state; implement worker health checks; retry failed jobs |
| API becomes bottleneck | Med | Defer to Phase 2 scaling: add Celery/Redis queue; horizontal API scaling |

---

## M. SUCCESS METRICS (Ship Readiness Checklist)

- [x] Metadata extraction works for Postgres + CSV (>=2 sources)
- [x] Suggestion engine fires >= 10 rules with rationale
- [x] Check library has >= 20 templates (standard Soda patterns)
- [x] UI renders all 7 screens without crashes
- [x] API endpoints respond < 1s (p95)
- [x] Check execution completes successfully on test dataset
- [x] Results displayed with metrics + sample data
- [x] Audit logs capture all user actions
- [x] Tests cover core services (>= 70% coverage)
- [x] Deployment guide written; MVP runs locally in < 5 min

---

End of MVP Design Document

