# 🏗️ System Architecture Overview

**Version:** 1.0.0  
**Last Updated:** 2026-04-11  
**Format:** Canonical reference for all architecture decisions

---

## Executive Summary

The **Enterprise Data Quality Platform** is a modern, cloud-native application that provides end-to-end data quality monitoring and validation. It enables organizations to:

- ✅ **Register data sources** (CSV, PostgreSQL, BigQuery, Snowflake)
- ✅ **Profile data** (extract schema, statistics, data types)
- ✅ **Define quality checks** (from suggestions or custom rules)
- ✅ **Execute checks** (via Soda Core + DuckDB)
- ✅ **Visualize results** (dashboards, trends, anomalies)
- ✅ **Track quality over time** (historical analysis, scorecards)

**Tech Stack:**
- **Backend:** Python 3.11, FastAPI, SQLAlchemy, Soda Core 3.4.3
- **Database:** PostgreSQL 16 (persistence), DuckDB 1.0.0 (processing)
- **Frontend:** React 18, TypeScript, Plotly (charts), Vite
- **Deployment:** Docker Compose, GitHub Actions, AWS (optional)

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Web Dashboard (React)                   │
│  - Upload connections / CSVs                                    │
│  - Select rules from catalog or suggestions                     │
│  - View real-time quality results & trends                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ REST API (FastAPI)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│              FastAPI Backend (Python 3.11)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routers (Async)                                     │  │
│  │  ├─ /connections (CRUD, upload)                         │  │
│  │  ├─ /metadata (profile, extract)                        │  │
│  │  ├─ /check-plans (catalog, suggestions, CRUD)           │  │
│  │  ├─ /runs (execute, poll, results)                      │  │
│  │  ├─ /results (historical, by-column)                    │  │
│  │  └─ /visualization (metrics, trends, scorecards)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │ │ │                                     │
│  ┌────────────────────┼─┼─┼──────────────────────────────────┐ │
│  │  Services Layer    │ │ │                                  │ │
│  │  ├─ ProfilerService (schema extraction)                  │ │
│  │  ├─ SuggestionEngine (12-rule analyzer)                  │ │
│  │  ├─ ExecutorService (Soda + DuckDB)                      │ │
│  │  └─ ReportingService (metrics aggregation)               │ │
│  └────────────────────┼─┼─┼──────────────────────────────────┘ │
│                       │ │ │                                     │
│  ┌────────────────────┼─┼─┼──────────────────────────────────┐ │
│  │  Background Worker │ │ │                                  │ │
│  │  (APScheduler)     │ │ │                                  │ │
│  │  - Execute runs    │ │ │                                  │ │
│  │  - Store results   │ │ │                                  │ │
│  │  - Process metrics │ │ │                                  │ │
│  └────────┬───────────┼─┼─┼──────────────────┬───────────────┘ │
│           │           │ │ │                  │                 │
└───────────┼───────────┼─┼─┼──────────────────┼─────────────────┘
            │           │ │ │                  │
┌───────────▼───────────▼─▼─▼──────────────────▼─────────────────┐
│                      Data Layer                                │
│  ┌────────────────────────────────┐                            │
│  │  PostgreSQL (Persistence)      │                            │
│  │  ├─ connections                │ Store data source configs  │
│  │  ├─ metadata_snapshots         │ Schema + statistics        │
│  │  ├─ check_plans                │ Quality check definitions  │
│  │  ├─ runs                       │ Execution history          │
│  │  ├─ check_results              │ Per-check results          │
│  │  └─ check_suggestions          │ ML-generated suggestions   │
│  └────────────────────────────────┘                            │
│                                                                │
│  ┌────────────────────────────────┐                            │
│  │  DuckDB (Execution)            │                            │
│  │  ├─ Load CSV/Parquet data      │ In-process analytics      │
│  │  ├─ Run Soda Core checks       │ Fast quality validation    │
│  │  └─ Generate profiles          │ Schema discovery           │
│  └────────────────────────────────┘                            │
│                                                                │
│  ┌────────────────────────────────┐                            │
│  │  External Data Sources         │                            │
│  │  ├─ PostgreSQL databases       │ Query via JDBC/psycopg    │
│  │  ├─ CSV/Parquet files          │ Upload to platform        │
│  │  ├─ BigQuery tables            │ Future integration        │
│  │  └─ Snowflake warehouses       │ Future integration        │
│  └────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Layer (`/backend/src/api/routes/`)

**Responsibility:** Handle HTTP requests, validate inputs, return JSON responses

**Routers:**
- `connection.py` - Connection CRUD, file upload, validation
- `metadata.py` - Schema extraction, profile statistics
- `checks.py` - Check catalog, CRUD operations
- `suggestions.py` - Generate rule suggestions from metadata
- `runs.py` - Execute check plans, track status
- `results.py` - Retrieve historical results, per-column analysis
- `visualization.py` - Metrics, trends, quality scorecards

**Features:**
- Async/await for concurrency
- Input validation with Pydantic models
- Error handling with standard HTTP status codes
- CORS support for cross-origin requests

---

### 2. Service Layer (`/backend/src/services/`)

**Responsibility:** Business logic, data processing, external service calls

**Key Services:**
- `profiler.py` - Extract schema + statistics from data
  - Detect column types, nullability, distinct counts
  - Generate data quality hints (e.g., "column looks like date")
  
- `suggestion_engine.py` - Generate quality check suggestions (12 rules)
  - Rule 1: Null check (if column has NULLs)
  - Rule 2: Uniqueness (if column has high distinct/count ratio)
  - Rule 3-12: Additional checks (duplicates, freshness, patterns, etc.)
  
- `executor.py` - Execute checks via Soda Core
  - Load data from connection
  - Parse check definitions (YAML)
  - Execute against DuckDB
  - Store results in PostgreSQL
  
- `reporting.py` - Aggregate metrics, generate reports
  - Calculate pass/fail/warning counts
  - Compute quality trends over time
  - Format data for visualization

---

### 3. Data Layer (`/backend/src/storage/`)

**Responsibility:** Database access, ORM models, transactions

**Models (SQLAlchemy):**
```python
Connection      # Data source definition (type, credentials, path)
MetadataSnapshot # Schema + statistics at a point in time
CheckPlan       # Definition of quality checks to run
CheckSuggestion # ML-generated suggestion (confidence, rule)
Run             # Execution instance (status, start_time, end_time)
CheckResult     # Result of one check (status, fail_count, error_msg)
```

**Database Choice:**
- **PostgreSQL** for persistence (ACID, relationships)
- **DuckDB** for execution (fast, serverless, in-process)

---

### 4. Worker (`/backend/src/worker/`)

**Responsibility:** Background job execution, async task processing

**Features:**
- APScheduler for task scheduling
- Long-running check execution (can take minutes)
- Automatic retry on failure
- Logging and error handling

**Flow:**
1. API creates `Run` record with PENDING status
2. Worker picks up Run from queue
3. Executes checks (loads data, runs Soda, stores results)
4. Updates Run status → COMPLETED/FAILED
5. Frontend polls to get results

---

### 5. Frontend (`/frontend/`)

**Responsibility:** User interface, state management, real-time updates

**Architecture:**
- **Framework:** React 18 + TypeScript
- **State:** Context API (or Redux if needed)
- **Routing:** React Router v6
- **Charts:** Plotly for interactive visualizations
- **HTTP:** Axios for API calls

**UI Components:**
- Wizard (5-step flow)
  - Step 1: Connection selection + CSV upload
  - Step 2: Schema viewer
  - Step 3-4: Check selection + suggestions
  - Step 5: Results + visualizations
  
- Dashboard
  - Quality scorecard
  - Historical trends
  - Anomaly alerts

---

## Data Model

### Connection
```
id                UUID
name              String          # User-friendly name
type              Enum            # csv, postgres, bigquery, snowflake
remote_url        String          # Optional: for remote sources
secret            String          # Encrypted credentials
created_at        Timestamp
created_by        String          # Optional: user ID
```

### MetadataSnapshot
```
id                UUID
connection_id     UUID (FK)
column_name       String
data_type         String          # INT, STRING, FLOAT, DATE, etc.
is_nullable       Boolean
distinct_count    Integer
null_count        Integer
min_value         String          # For numeric/date columns
max_value         String
created_at        Timestamp
updated_at        Timestamp
```

### CheckPlan
```
id                UUID
connection_id     UUID (FK)
name              String
description       String
checks_yaml       Text            # Soda YAML definition
status            Enum            # DRAFT, ACTIVE, DISABLED
created_at        Timestamp
updated_at        Timestamp
```

### CheckSuggestion
```
id                UUID
metadata_snapshot_id  UUID (FK)
rule_name         String          # Rule 1: Null Check, etc.
confidence_score  Float [0, 1]
suggested_yaml    Text            # YAML snippet to copy
priority          Integer         # Ranking (1 = highest)
created_at        Timestamp
```

### Run
```
id                UUID
check_plan_id     UUID (FK)
status            Enum            # PENDING, RUNNING, COMPLETED, FAILED
started_at        Timestamp
completed_at      Timestamp
error_message     String          # If FAILED
created_at        Timestamp
```

### CheckResult
```
id                UUID
run_id            UUID (FK)
check_name        String
status            Enum            # PASS, FAIL, WARN, ERROR
passed_count      Integer         # Rows passed
failed_count      Integer         # Rows failed
error_message     String
sample_failures   JSON            # Sample failing rows
created_at        Timestamp
```

---

## Key Features

### ✅ Feature 1: Connection Management
- Register multiple data sources (CSV, PostgreSQL, BigQuery, etc.)
- Store connection metadata (name, type, credentials)
- Support both file uploads and remote database connections
- Connectionencryption for credentials (TODO: v1.1)

### ✅ Feature 2: Metadata Profiling
- Extract schema (columns, types, nullability)
- Calculate statistics (distinct count, null count, min/max)
- Generate data quality hints (e.g., "column looks like email")
- Enable AI-powered suggestions

### ✅ Feature 3: Check Suggestions (12 Rules)
- Analyze metadata to suggest appropriate checks
- Rank by confidence (machine learning approach)
- Provide pre-filled YAML code for one-click adoption
- Support custom check YAML definitions

### ✅ Feature 4: Execute Quality Checks
- Parse user-defined checks (YAML format)
- Execute against Soda Core + DuckDB backend
- Track execution status (PENDING → RUNNING → COMPLETED)
- Store results for historical analysis

### ✅ Feature 5: Visualization & Analytics
- Quality scorecards (per-column pass rates)
- Trend analysis (quality over time)
- Anomaly detection (statistical outliers)
- Interactive charts (Plotly: pie, bar, line)

### ✅ Feature 6: Historical Tracking
- Store all results in PostgreSQL
- Query historical trends
- Generate audit trails
- Support result drill-down (by check, column, date)

---

## Security Architecture

### 🔒 Authentication & Authorization
- **MVP (v1.0):** No authentication (internal use)
- **Future (v1.1+):** JWT tokens, OAuth, RBAC

### 🔒 Data Protection
- **Secrets:** Credentials encrypted at-rest (TODO: v1.1)
- **Transmission:** HTTPS enforced in production
- **Database:** PostgreSQL with user permissions, read-only replicas for analytics

### 🔒 Network Isolation
- Docker Compose with custom network (no external exposure by default)
- API behind reverse proxy (nginx) in production
- DuckDB runs in-process (no network exposure)

### 🔒 Input Validation
- Pydantic models validate all inputs
- File upload size limits (100MB max)
- SQL injection protection via SQLAlchemy ORM
- YAML parsing validation

---

## Scalability & Performance

### Current Architecture (v1.0)
- **Single-node** FastAPI deployment
- **DuckDB** in-process (no shared state)
- **PostgreSQL** as persistence layer
- **Suitable for:** Single team, <1TB data, <100 concurrent users

### Scaling Path (Future)
- **Horizontal scaling:** Multiple API instances (behind load balancer)
- **Distributed execution:** Celery for distributed check execution
- **Caching:** Redis for expensive computations
- **Analytics DB:** Snowflake / BigQuery for large-scale analysis

---

## Deployment Model

### Local Development
```bash
docker compose up -d      # Start postgres + API + frontend
npm run dev              # Frontend dev server
pytest                   # Run tests
```

### Production Deployment
```bash
# Build & push to registry
docker build -t myorg/dq-api:1.0.0 .
docker push myorg/dq-api:1.0.0

# Deploy to Kubernetes / AWS ECS / Azure Container Instances
# See DEPLOYMENT.md for infrastructure setup
```

---

## Decision Log & Future Roadmap

### Approved Decisions
- ✅ **ADR-001:** Use Soda Core (vs Great Expectations) for v1.0
  - Rationale: Simpler API, DuckDB integration, lighter footprint
  - Great Expectations deferred to v1.1

- ✅ **ADR-002:** DuckDB for execution (vs Spark, Pandas)
  - Rationale: Serverless, fast, supports SQL, local files
  - No infrastructure to manage

- ✅ **ADR-003:** FastAPI + SQLAlchemy (vs Django, Flask)
  - Rationale: Modern async, auto-generated docs, performance

### Pending Decisions
- ⏳ **ADR-004:** Great Expectations integration (v1.1)
- ⏳ **ADR-005:** Multi-tenancy support (v1.1+)
- ⏳ **ADR-006:** Distributed execution (v2.0)

See [DECISION_LOG.md](DECISION_LOG.md) for details.

---

## See Also

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - How to set up and run the system
- **[API.md](API.md)** - Complete REST API specification
- **[DATABASE.md](DATABASE.md)** - Database schema and migrations
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Detailed ADRs and technical decisions
- **[../SECURITY.md](../SECURITY.md)** - Security implementation details

---

**Last Reviewed:** 2026-04-11  
**Maintained By:** Architecture Team  
**Next Review:** 2026-04-30
