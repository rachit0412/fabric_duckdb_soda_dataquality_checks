# PHASE 1: Implementation Plan (Milestones + Acceptance Criteria + Doc Updates)

**Status:** Ready for Execution  
**Based On:** PHASE0_REPO_TRIAGE_REPORT.md  
**Date:** 2026-04-11

---

## Executive Summary

**Repository Status:** 70% implemented
- ✅ Backend API routers exist (connection, metadata, checks, runs, results, visualization, suggestions)
- ✅ Database schema fully designed (Connection, MetadataSnapshot, CheckPlan, CheckSuggestion, Run, CheckResult)
- ✅ Soda Core + DuckDB integration present in requirements
- ✅ Docker Compose with PostgreSQL + API hardened
- ⚠️ **Frontend minimal** (only `/components/` directory; no wizard, no React app entry)
- ⚠️ **Missing:** Great Expectations integration, full suggestions engine (12 rules), complete checks catalog
- ⚠️ **Missing:** React wizard (5 steps), visualization tabs
- ⚠️ **Missing:** Tests, CI/CD, database migrations
- ⚠️ **Missing:** Fresh API documentation, deployment guide updates

**Outcome:** Consolidate 2-3 weeks of focused work into 6 milestones with clear gates.

---

## MILESTONE BREAKDOWN

### M1: Foundation + Health Checks + Docs Baseline (3 days)
**Goal:** Prove end-to-end connectivity; establish canonical docs

**Deliverables:**
1. ✅ Archive/remove 50+ historical docs (→ `/archive/`)
2. ✅ Create canonical docs skeleton:
   - `/docs/INDEX.md` (navigation)
   - `/docs/OVERVIEW.md` (architecture deep-dive)
   - `/docs/API.md` (endpoints + examples)
   - `/docs/DB.md` (schema + migrations)
   - `/docs/DEPLOYMENT.md` (setup instructions)
   - `/docs/RUNBOOK.md` (ops + troubleshooting)
3. ✅ Update README.md (reference canonical docs)
4. ✅ Update CONTRIBUTING.md (development setup)
5. Add health endpoint (`GET /health`) to FastAPI
6. Add database initialization script (`init-scripts/01-schema.sql` if not exists)
7. Update docker-compose.yml to include React frontend service (scaffold only)
8. Create `.env.example` with all required vars

**Impacted Files:**
- `/README.md` (update links)
- `/docs/INDEX.md` (new)
- `/docs/OVERVIEW.md` (new)
- `/docs/API.md` (new)
- `/docs/DB.md` (new)
- `/docs/DEPLOYMENT.md` (new - from existing)
- `/docs/RUNBOOK.md` (new)
- `/src/api/health.py` (new - health endpoint)
- `/docker-compose.yml` (add react service)
- `/backend/src/main.py` (add health route)
- Multiple files moved to `/archive/`

**Acceptance Criteria:**
- [ ] `GET /health` returns `{"status": "ok", "version": "1.0.0", "db": "connected"}`
- [ ] `docker compose up -d` starts postgres + API without errors
- [ ] `/docs/INDEX.md` lists all canonical docs with links + purposes
- [ ] `README.md` has single entry point ("docs-as-code" note)
- [ ] No broken links in any doc
- [ ] All historical docs removed from root (moved to `/archive/`)

**Doc Updates Required:**
- [ ] `/docs/INDEX.md` created
- [ ] `/docs/OVERVIEW.md` created with architecture diagram
- [ ] `/docs/API.md` skeleton created (endpoints list)
- [ ] `/docs/DB.md` created with schema reference
- [ ] `/docs/DEPLOYMENT.md` created with quick start
- [ ] `/README.md` simplified to reference `/docs/INDEX.md`
- [ ] Record doc changes in `/docs/DECISION_LOG.md` → ADR (docs-as-code baseline)

**Risks/Assumptions:**
- Assume `/init-scripts/` directory does not have migrations
- Docker Compose may need adjustment for frontend networking
- React scaffold needed (Vite or Create React App minimal)

**Time Estimate:** 3 days (foundation + doc work is parallel)

---

### M2: Connection + Upload + Metadata Service (4 days)
**Goal:** Enable data source registration + schema extraction

**Deliverables:**
1. ✅ Verify `/connections` CRUD endpoints (connection.py exists)
2. ✅ Verify `/upload` CSV upload endpoint (connection.py partial)
3. Implement full `/metadata` profile extraction:
   - `/metadata/extract` → call Soda profile or custom Python profiler
   - Return: schema (columns, types, nullability), stats (row count, distinct, etc.)
4. Implement `/metadata/list` → list all profiles for a connection
5. Test end-to-end: upload CSV → extract metadata → verify in DB
6. Add file upload security (virus scan stub, size limits, temp cleanup)
7. Add connection type validation (csv, postgres, bigquery, etc.)

**Impacted Files:**
- `/backend/src/api/routes/connection.py` (complete upload + validation)
- `/backend/src/api/routes/metadata.py` (implement profile extraction)
- `/backend/src/services/profiler.py` (new - schema profiling logic)
- `/backend/src/core/security.py` (new - file upload validation)
- `/src/storage/db.py` (add connection query helpers)
- `/tests/integration/test_upload_metadata.py` (new - e2e test)

**Acceptance Criteria:**
- [ ] `POST /connections/upload` accepts CSV; returns `ConnectionResponse` with connection ID
- [ ] `GET /metadata/extract/{connection_id}` triggers profile; returns schema + stats
- [ ] Metadata saved to `metadata_snapshots` table
- [ ] File size limit enforced (>100MB rejected)
- [ ] File cleanup on error
- [ ] E2E test: upload CSV → query metadata → verify DB entries

**Doc Updates Required:**
- [ ] `/docs/API.md` updated with `/connections` + `/metadata` endpoint docs + examples
- [ ] `/docs/RUNBOOK.md` § "Upload Data" with screenshots/curl examples
- [ ] `/docs/DB.md` § "migrations" note: "Metadata snapshots created on first profile"

**Risks/Assumptions:**
- Profiler performance on large files (10M+ rows)
- Temp file cleanup on delete
- Connection secret encryption (TODO in code; document later)

**Time Estimate:** 4 days (profile extraction logic + testing)

---

### M3: Check Catalog + Suggestions Engine (5 days)
**Goal:** Surface all available checks + generate suggestions (12 rules)

**Deliverables:**
1. Verify check catalog from Soda Core:
   - List supported checks: volume, completeness, uniqueness, validity, freshness, duplicate, outliers, pattern, schema drift, etc.
   - Document parameters for each check
2. Implement `/checks/catalog` endpoint:
   - Returns all available checks with description + parameters
3. **Implement suggestions engine** (12 rules):
   - Rule 1: Null Check (if column has NULLs → suggest NOT NULL check)
   - Rule 2: Uniqueness (if column has high distinct/count → suggest UNIQUE check)
   - Rule 3: Duplicate Rows (if row count unstable → suggest duplicate check)
   - Rule 4: Freshness (if temporal column exists → suggest freshness check)
   - Rule 5: Pattern Match (if string column with patterns → suggest regex check)
   - Rule 6: Range Check (if numeric column → suggest min/max range check)
   - Rule 7: Referential Integrity (if FK candidate → suggest foreign key check)
   - Rule 8: Anomaly Detection (if numeric column → suggest statistical outlier check)
   - Rule 9: Schema Drift (if schema likely to change → suggest schema validation)
   - Rule 10: Data Type Mismatch (if string looks like numeric → suggest type conversion)
   - Rule 11: Completeness (if column important-looking → suggest completeness check)
   - Rule 12: Seasonality/Trend (if temporal data → suggest trend check)
4. Implement `/check-suggestions/{metadata_snapshot_id}` endpoint:
   - Call suggestions engine
   - Return ranked list of CheckSuggestion objects with confidence scores
5. Implement custom check support:
   - `/check-plans/{id}/custom-checks` PATCH endpoint
   - Accept YAML or JSON custom check definitions

**Impacted Files:**
- `/backend/src/api/routes/checks.py` (add catalog endpoint)
- `/backend/src/api/routes/suggestions.py` (implement 12-rule engine)
- `/backend/src/services/suggestion_engine.py` (new - rule implementations)
- `/backend/src/models/check_definitions.py` (new - UnifiedCheckModel)
- `/tests/unit/test_suggestions.py` (new - test each rule)
- `/docs/API.md` (add check endpoints)
- `/docs/RUNBOOK.md` § "Check Selection" with rule descriptions

**Acceptance Criteria:**
- [ ] `GET /checks/catalog` returns ≥20 checks with descriptions
- [ ] `POST /check-suggestions/{metadata_snapshot_id}` returns ≥5 suggestions with confidence_score ∈ [0, 1]
- [ ] Each suggestion includes `suggested_check_yaml` that can be copied to check plan
- [ ] Custom checks accepted via PATCH `/check-plans/{id}/custom-checks`
- [ ] Unit tests verify each rule produces correct suggestions for mock data
- [ ] Suggestions ranked by confidence (highest first)

**Doc Updates Required:**
- [ ] `/docs/API.md` § "Checks Catalog" with list of all checks
- [ ] `/docs/API.md` § "Suggestions" with rule descriptions + confidence meaning
- [ ] `/docs/RUNBOOK.md` § "Suggestion Confidence" explanation
- [ ] Create `/docs/CHECKS_GUIDE.md` (new) listing all 12 rules + examples

**Risks/Assumptions:**
- Rule effectiveness depends on data profile quality
- Confidence scoring may need tuning after tests
- Great Expectations NOT integrated (v1.0 Soda-only; log as decision)

**Time Estimate:** 5 days (logic + testing rules)

---

### M4: Execution Engine + Run Polling (4 days)
**Goal:** Execute check plans; track runs; store results

**Deliverables:**
1. Complete `/runs` POST endpoint (execute check plan):
   - Parse checks_yaml from CheckPlan
   - Call Soda Core with DuckDB backend
   - Create Run record with PENDING status
   - Queue async execution (background task or worker)
2. Implement background task worker:
   - Load data from connection (CSV, PostgreSQL, etc.)
   - Execute Soda checks against DuckDB
   - Store results in `check_results` table
   - Update Run status → COMPLETED/FAILED
3. Implement `/runs/{run_id}` GET endpoint:
   - Return run status + progress
4. Implement `/runs/{run_id}/results` GET endpoint:
   - Return all CheckResult records for this run
5. Implement `/runs/{run_id}/poll` endpoint (alternative to WebSocket):
   - Long-poll status until completion
6. Add retry logic + error handling:
   - Failed runs can be re-executed
   - Errors logged and visible in `/runs/{run_id}/errors`

**Impacted Files:**
- `/backend/src/api/routes/runs.py` (complete execute + polling)
- `/backend/src/worker/executor.py` (new - Soda execution logic)
- `/backend/src/core/executor.py` (new - run execution orchestration)
- `/src/reporting/html_generator.py` (generate report from results)
- `/tests/integration/test_execution.py` (new - e2e run execution)

**Acceptance Criteria:**
- [ ] `POST /runs` with valid check_plan_id returns Run with id + PENDING status
- [ ] Background task executes checks within 60sec (for small CSV)
- [ ] `GET /runs/{run_id}` shows status transition: PENDING → RUNNING → COMPLETED
- [ ] `GET /runs/{run_id}/results` returns CheckResult array with all columns populated
- [ ] Failed check shows `status=fail` + `error_message` + sample failing rows
- [ ] Integration test: upload CSV → create check plan → execute → verify results

**Doc Updates Required:**
- [ ] `/docs/API.md` § "Runs" endpoints documented
- [ ] `/docs/RUNBOOK.md` § "Running Checks" with polling example
- [ ] `/docs/RUNBOOK.md` § "Debugging Failed Runs" with log location

**Risks/Assumptions:**
- DuckDB local file path handling for uploads
- Soda Core stability with dynamic check definitions
- Background task framework (APScheduler or Celery candidates)

**Time Estimate:** 4 days (executor + worker + testing)

---

### M5: Visualization APIs + React Wizard Integration (6 days)
**Goal:** Return charts-ready data; build React wizard (5 steps)

**Deliverables:**

**Backend (Visualization APIs):** (2 days)
1. Implement `/metrics/{run_id}` endpoint:
   - Return aggregated pass/fail/warn/error counts
   - Return per-check status breakdown
   - Format for Plotly pie/bar charts
2. Implement `/quality/{connection_id}` endpoint:
   - Quality scorecard: per-column pass rate + trend
3. Implement `/trends/{connection_id}?days=30` endpoint:
   - Return time series of pass rates (for line chart trend)
4. Data format contracts (finalize in `/docs/API.md`):
   ```json
   {
     "overview": {"passed": 10, "failed": 2, "warnings": 1},
     "by_check": [{"check_name": "...", "status": "pass/fail"}],
     "scorecard": [{"column": "...", "pass_rate": 0.95, "issues": [...]}],
     "trends": [{"date": "2026-04-11", "pass_rate": 0.92}]
   }
   ```

**Frontend (React Wizard):** (4 days)
1. Scaffold React app:
   - Create-React-App OR Vite
   - Setup routing, state management (Context or Redux)
   - Install Plotly for charts
2. Implement Wizard component with 5 steps:
   - **Step 1:** Connection Selection + CSV Upload
     - Form: select connection type (CSV, Postgres, etc.)
     - File input: drag-drop CSV
     - Submit: POST `/connections/upload`
   - **Step 2:** Schema + Profile Viewer
     - Display schema from `/metadata`
     - Show column stats, nullability, distinct count
   - **Step 3-4:** Check Plan Builder (combined)
     - Fetch `/checks/catalog` + `/check-suggestions`
     - Checkbox grid: select checks
     - Display suggested checks with confidence
     - Allow custom check YAML input
     - Submit: POST `/check-plans`
   - **Step 5:** Visualization + Results
     - Fetch `/runs/{run_id}` (poll until complete)
     - Tabs: Overview (pie/bar) | Details (scorecard) | Trends (line chart)
3. Add error handling + loading states
4. Add local dev: `npm start` proxies to `http://localhost:8000`

**Impacted Files:**
- `/backend/src/api/routes/visualization.py` (implement endpoints)
- `/frontend/src/components/Wizard.tsx` (new - step components)
- `/frontend/src/pages/WizardPage.tsx` (new - page wrapper)
- `/frontend/src/api/client.ts` (new - API client)
- `/frontend/src/context/WizardContext.tsx` (new - state)
- `/frontend/package.json` (add dependencies)
- `/frontend/src/index.tsx` (app entry)
- `/docker-compose.yml` (add frontend service + ports)

**Acceptance Criteria:**
- [ ] `/metrics/{run_id}` returns object with keys: `overview`, `by_check`, `scorecard`, `trends`
- [ ] `GET /quality/{connection_id}` returns scorecard with per-column pass rates
- [ ] React Wizard loads without errors on `http://localhost:3000`
- [ ] Step 1: Upload CSV → verify in network tab `POST /connections/upload`
- [ ] Step 2: Schema displays; columns + types visible
- [ ] Step 3-4: Suggestions appear with confidence scores; can select/deselect checks
- [ ] Step 5: Charts render (pie + bar + line); polling shows completion
- [ ] E2E test (Playwright): user uploads → sees results → charts render

**Doc Updates Required:**
- [ ] `/docs/API.md` § "Visualization Endpoints" with examples
- [ ] `/docs/RUNBOOK.md` § "Using the Web Dashboard" with screenshots
- [ ] `/docs/CONTRIBUTING.md` § "Frontend Setup" with `npm install` + `npm start`
- [ ] Create `/docs/WIZARD_GUIDE.md` (new) explaining each step + requirements

**Risks/Assumptions:**
- React version compatibility with Plotly
- Polling timeout if run takes >5 min
- Chart rendering performance with large result sets

**Time Estimate:** 6 days (backend API fast; frontend components slower due to UX/testing)

---

### M6: Tests + CI/CD + Final Docs (5 days)
**Goal:** Production-ready: full test coverage, docs audit, CI pipeline

**Deliverables:**

**Testing (2 days):**
1. Unit tests (backend services):
   - `/tests/unit/test_profiler.py` (schema extraction)
   - `/tests/unit/test_suggestions.py` (suggestion rules)
   - `/tests/unit/test_executor.py` (Soda execution)
   - Target: ≥70% backend code coverage
2. Integration tests:
   - `/tests/integration/test_e2e_flow.py`:
     - Given: CSV file
     - When: upload → profile → create plan → execute → fetch results
     - Then: all tables populated, charts available
3. Frontend smoke tests (Playwright):
   - Wizard loads
   - Each step navigation works
   - Charts render after results

**CI/CD (1 day):**
1. Setup GitHub Actions (`.github/workflows/ci.yml`):
   - On PR/push to main:
     - Lint (black, flake8 for Python; ESLint for React)
     - Unit tests + coverage report
     - Integration tests (Docker Compose)
     - Build Docker image
2. Pre-commit hooks (`.pre-commit-config.yaml`):
   - Format check (black)
   - Type check (mypy)
   - Link validation (docs)

**Final Docs Audit + Cleanup (2 days):**
1. Audit all docs against implementation:
   - [ ] API endpoints documented?
   - [ ] Database schema up-to-date?
   - [ ] Deployment instructions work (manual test)?
   - [ ] All links valid?
   - [ ] Examples executable?
2. Remove any remaining dead references:
   - Search for: "Great Expectations" (if not implemented)
   - Search for: "Azure Cosmos" (if Decision-007 removes it)
   - Search for: deprecated endpoint names
3. Create final "Docs Cleanup Report" (see Phase 9 output format):
   - Files removed (with evidence)
   - Files consolidated (from → to + link)
   - Broken links fixed
   - Reason for each change
4. Update CHANGELOG.md:
   - Record v1.0.0 release with all features
5. Update README.md final version:
   - Add badge for CI status
   - Link to `/docs/INDEX.md` for full docs
   - Quick start: `docker compose up && open http://localhost:3000`

**Impacted Files:**
- `/tests/unit/*.py` (new)
- `/tests/integration/test_e2e_flow.py` (new)
- `/tests/frontend/wizard.spec.ts` (new - Playwright)
- `.github/workflows/ci.yml` (new or update)
- `.pre-commit-config.yaml` (new)
- All docs (validation + cleanup)

**Acceptance Criteria:**
- [ ] Unit tests pass; coverage ≥70%
- [ ] Integration test passes: upload → execute → results
- [ ] CI pipeline runs on PR (lint + test)
- [ ] Docker image builds without warnings
- [ ] `docker compose up` starts all services
- [ ] All docs links valid (no 404 in internal links)
- [ ] Docs Cleanup Report created and reviewed
- [ ] README.md has CI badge + links to docs
- [ ] CHANGELOG.md records v1.0.0 completion

**Doc Updates Required:**
- [ ] `/docs/CONTRIBUTING.md` § "Running Tests" with pytest commands
- [ ] `/docs/CONTRIBUTING.md` § "CI/CD" explaining GitHub Actions
- [ ] `/docs/DEPLOYMENT.md` § "Production Deployment" with registry, env vars
- [ ] `CHANGELOG.md` updated with v1.0.0 release notes
- [ ] `README.md` simplified, links to `/docs/`

**Risks/Assumptions:**
- CI pipeline may be slow (Docker builds)
- Pre-commit hooks may need tuning (project conventions)
- Docs cleanup may reveal inconsistencies (expected; fix as found)

**Time Estimate:** 5 days (tests + CI + doc audit)

---

## TIMELINE SUMMARY

| Milestone | Days | End Date | Gate | Owner |
|-----------|------|----------|------|-------|
| M1: Docs + Infra | 3 | +3d | All historical docs archived; health check green | Docs Maintainer + DevOps |
| M2: Upload + Metadata | 4 | +7d | E2E upload → profile works | Backend Engineer |
| M3: Checks + Suggestions | 5 | +12d | 12 rules tested; suggestions ranked | Data Quality Engineer |
| M4: Execution Engine | 4 | +16d | Run complete → results in DB | Backend Engineer |
| M5: Frontend + Charts | 6 | +22d | Wizard loads; charts render | Frontend Engineer |
| M6: Tests + CI + Docs | 5 | +27d | CI green; docs audit complete; v1.0.0 ready | QA + Docs Maintainer |
| **Total** | **27 days** | **~5-6 weeks** | Ready for production | All |

---

## Risks + Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Soda Core integration issues | M3-M4 blocked (~8 days) | Unit test Soda execution early (M2 + 1 day) |
| React/Plotly incompatibility | M5 blocker | Spike integration in parallel (M4 end) |
| Docker Compose networking | M1 blocker | Test locally before milestones |
| Database migration complexity | M6 blocker | Start migration framework in M1 |
| Docs inconsistency with code | M6 gate fails | Weekly doc audit (owner: Frontend/Backend per section) |

---

## Assumptions

1. **Team Skills:** Backend (Python/FastAPI) + Frontend (React/TS) + Data Quality (Soda/Python) available in parallel
2. **Infrastructure:** Docker, GitHub, PostgreSQL 16+ available
3. **Timeline:** 5-6 weeks continuous focus (no context switches)
4. **Scope:** v1.0.0 MVP only (no OAuth, no multi-tenancy, no advanced reporting)
5. **Great Expectations:** Deferred (v1.1); log as ADR-003
6. **Secrets Management:** Stubs OK for v1.0; encrypt in v1.1 (log as decision)

---

## Next Step: PHASE 2 (API Contract)

When M1 completes, execute PHASE 2:
- Write complete OpenAPI contract in `/docs/API.md`
- Include all endpoint signatures (from code inspection)
- Add error codes + examples
- Backend team uses as development source-of-truth

---

**Prepared by:** Solution Architect + Backend Lead  
**Approval:** Ready for sign-off by Project Manager
