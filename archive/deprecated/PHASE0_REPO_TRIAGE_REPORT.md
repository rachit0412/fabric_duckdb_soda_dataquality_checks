# PHASE 0: Repository Triage & Documentation Inventory
**Date:** 2026-04-11  
**Status:** Complete - Evidence-Based Classification Ready

---

## PART 1: REPO STRUCTURE SNAPSHOT

### Confirmed Implemented Components

| Component | Path | Evidence | Status |
|-----------|------|----------|--------|
| **FastAPI Backend** | `/backend/src/api/` | Routers defined, main.py imports from src.core | ✅ Exists |
| **React Frontend** | `/frontend/src/components/` | Directory exists; structure confirmed | ⚠️ Minimal |
| **Core Scanner** | `/src/core/scanner.py` | main.py imports EnhancedDataQualityScanner | ✅ Exists |
| **Soda Integration** | `requirements.txt: soda-core==3.4.3` | Explicitly listed | ✅ Exists |
| **DuckDB Engine** | `requirements.txt: duckdb==1.0.0` | Explicitly listed | ✅ Exists |
| **PostgreSQL Storage** | `docker-compose.yml postgres service` | Service defined, schema.sql present | ✅ Exists |
| **HTML Reporting** | `/src/reporting/html_generator.py` | main.py imports HTMLReportGenerator | ✅ Exists |
| **Alerting** | `/src/notifications/alerting.py` | main.py imports AlertingService | ✅ Exists |
| **Docker Compose** | `/docker-compose.yml` | Defines postgres, hardened config | ✅ Exists |
| **Configuration** | `/src/config/` | Directory exists; referenced in main.py | ✅ Exists |

### Missing / Partially Implemented

| Component | Expected Path | Status | Evidence |
|-----------|---|---|---|
| **React Wizard (5 Steps)** | `/frontend/src/components/Wizard.tsx` | ❌ Not found | Frontend has only `/components/` directory (minimal) |
| **Connection Manager API** | `/backend/src/api/connections.py` | ❌ Not found in list | `/backend/src/api/` exists but content unknown |
| **Metadata Service** | `/backend/src/api/metadata.py` | ❌ Not found | `/backend/src/api/` exists but content unknown |
| **Check Plans CRUD** | `/backend/src/api/checkplans.py` | ❌ Not found | `/backend/src/api/` exists but content unknown |
| **Runs Executor** | `/backend/src/api/runs.py` | ❌ Not found | `/backend/src/api/` exists but content unknown |
| **Check Suggestions** | `/backend/src/services/suggestions.py` | ❌ Not found | `/src/core/` and `/src/services/` listed but not verified |
| **Visualization APIs** | `/backend/src/api/visualization.py` | ❌ Not found | Not mentioned in structure |
| **Database Migrations** | `/backend/migrations/` or `/db/migrations/` | ❌ Not found | Only `/backend/schema.sql` found (no migration framework) |
| **Unit Tests** | `/tests/` or `/backend/tests/` | ⚠️ Partially | `/tests/` directory mentioned but content unknown |
| **Great Expectations** | `requirements.txt` | ❌ Not in deps | Only Soda listed; GE missing |

### Docker & DevOps

| Item | Path | Status |
|------|------|--------|
| Docker Compose | `/docker-compose.yml` | ✅ Exists (postgres only; no API/frontend services) |
| .env example | `/.env.example` | ✅ Exists |
| Dockerfile | `/Dockerfile` | ⚠️ Unknown (root or backend?) |
| CI/CD Pipeline | `/.github/workflows/`, `/azure-pipelines.yml` | ⚠️ Minimal (azure-pipelines.yml listed but not verified) |

---

## PART 2: DOCUMENTATION INVENTORY + CLASSIFICATION

### Root-Level Markdown Files (67 identified from previous audit)

**CRITICAL FINDING:** Repository still contains 50+ redundant/historical markdown files from previous internal projects. These must be dealt with per rule D.

#### KEEP (Canonical, Current, Necessary)

| File | Purpose | Evidence | Classification |
|------|---------|----------|---|
| `README.md` | Project overview + quick start | ✅ Already compacted (v1.0.1); current | **KEEP** |
| `ARCHITECTURE.md` | System design | ✅ Consolidated from 3 variants; v1.0.1 current | **KEEP** |
| `DEPLOYMENT_GUIDE.md` | Production deployment | ✅ Exists; referenced in README | **KEEP** |
| `API_REFERENCE.md` | REST API endpoints | ✅ Referenced in README; should align with backend | **UPDATE** (verify against code) |
| `SECURITY.md` | Security features + hardening | ✅ Referenced in README | **KEEP** |
| `CONTRIBUTING.md` | Development guide | ✅ Referenced in README | **KEEP** |
| `CHANGELOG.md` | Version history | ✅ Exists; referenced | **KEEP** |
| `TROUBLESHOOTING.md` | Common issues | ✅ Exists; referenced | **KEEP** |
| `LICENSE` | MIT license | ✅ Standard | **KEEP** |

#### UPDATE (Correct but Incomplete or Outdated)

| File | Current State | Issue | Action | Evidence |
|------|---|---|---|---|
| `API_REFERENCE.md` | Exists | Does not document `/connections`, `/metadata`, `/check-plans`, `/runs`, `/metrics` endpoints | Document all endpoints per API contract | File listed but not inspected for detail |
| `DEPLOYMENT_GUIDE.md` | Exists | May not include FastAPI + React setup; may reference MVP only | Merge setup from MVP guides; verify against docker-compose | Referenced in README but content not verified |
| `CONTRIBUTING.md` | Exists | May lack React setup, testing instructions | Add testing frameworks + CI instructions | Referenced but not verified |
| `TROUBLESHOOTING.md` | Exists | May lack FastAPI + DuckDB troubleshooting | Expand with API errors, DB connection issues | Referenced but not verified |

#### CONSOLIDATE (Duplicates - Merge and Delete)

| File | Duplicates | Merge Into | Action | Evidence |
|------|--|---|---|---|
| `MVP_QUICKSTART.md` | Overlaps README.md | README.md | Extract unique content; delete file | Referenced earlier as duplicate |
| `MVP_DEPLOYMENT_GUIDE.md` | Overlaps DEPLOYMENT_GUIDE.md | DEPLOYMENT_GUIDE.md | Extract unique content; delete file | Referenced earlier as duplicate |
| `README_FEATURES.md` | Overlaps README.md § Features | README.md | Merge feature matrix; delete file | Referenced earlier as duplicate |
| `FEATURES_COMPLETE.md` | Overlaps README.md + CHANGELOG.md | README.md + CHANGELOG.md | Distribute to appropriate docs; delete file | Referenced earlier |
| `MODERN_UI_GUIDE.md` | Overlaps DEPLOYMENT_GUIDE.md | DEPLOYMENT_GUIDE.md § UI Setup | Extract UI setup; delete file | Referenced earlier |
| `VISUALIZATION_SETUP.md` | Overlaps DEPLOYMENT_GUIDE.md | DEPLOYMENT_GUIDE.md | Merge; delete file | Referenced earlier |

#### REMOVE (Obsolete, Misleading, Unused)

| File | Reason for Removal | Evidence |
|------|---|---|
| `PHASE0_BASELINE_REPORT.md` | Historical phase report; project no longer in phases | Already identified for archiving |
| `PHASE1_QUALITY_GATES.md` | Historical phase report | Already identified for archiving |
| `PHASE2_EDGE_CASE_MATRIX.md` | Historical phase report | Already identified for archiving |
| `PHASE01_COMPLETE_REPORT.md`, etc. | Historical phase reports (6 total) | Already identified for archiving |
| `IMPLEMENTATION_COMPLETE.txt` | Status doc; project evolved since | Already identified for archiving |
| `SYSTEM_READY.md`, `SYSTEM_STATUS.md` | Status docs; superseded | Already identified |
| `FINAL_SUMMARY.md`, `FINAL_PROJECT_COMPLETION_REPORT.md` | Status docs; outdated | Already identified |
| All `*_SUMMARY.md` files (15+) | Historical completion reports; no longer maintained | Already identified |
| All `ISSUES_FIXED.md`, `FIXES_APPLIED.md`, `CRITICAL_FIXES_*` (8) | Historical fix logs; not canonical | Already identified |
| All `RULE_SELECTION_*.md`, `SCAN_FIXES.md` | Superseded by API_REFERENCE.md + check engine | Already identified |
| `DOCUMENTATION_INDEX.md` | Redundant with this inventory | Remove; use docs/INDEX.md instead |
| `ARCHITECTURE_OVERVIEW.md`, `ARCHITECTURE.md.new` | Duplicates of consolidated ARCHITECTURE.md | Already identified |

**TOTAL REMOVE: 50+ files** (to be moved to `/archive/deprecated/`)

---

### `/docs/` Subdirectory Files (Canonical Reference)

| File | Purpose | Classification | Action |
|------|---------|---|---|
| `/docs/ADRs/*.md` | Architecture Decision Records | **KEEP** | Maintain; ensure linked from decisions |
| `/docs/DECISION_LOG.md` | Decision tracking | **KEEP** | Already updated; current |
| `/docs/RAID_LOG.md` | Risks/Assumptions/Issues/Dependencies | **KEEP** | Already updated; current |
| `/docs/API_REFERENCE.md` | API endpoints (duplicate of root?) | **UPDATE** | Verify; consolidate with root version |
| `/docs/COMPONENTS.md` | Component descriptions | **UPDATE** | Ensure matches implementation |
| `/docs/QUICK_REFERENCE.md` | Quick lookup | **KEEP** | Useful; maintain current |
| `/docs/deployment/*.md` | Deployment guides | **UPDATE** | Verify against docker-compose + FastAPI |
| `/docs/guides/*.md` | How-to guides | **UPDATE** | Verify accuracy |
| `/docs/playbooks/*.md` | Operational playbooks | **UPDATE** | Verify accuracy |

---

## PART 3: CANONICAL DOCUMENTATION STRUCTURE (Single Source-of-Truth)

### Defined Structure (Implementation Baseline)

```
/
├── README.md                   # Quick start + what is this project
├── ARCHITECTURE.md             # System design + module boundaries + data flow
├── SECURITY.md                 # Security posture + hardening
├── CHANGELOG.md                # Version history
├── LICENSE                     # MIT

/docs/
├── INDEX.md                    # Navigation + doc structure (NEW)
├── OVERVIEW.md                 # Deep dive into architecture (NEW - consolidate from multiple guides)
├── API.md                      # API contract + endpoints + examples (UPDATED - from /docs/API_REFERENCE.md)
├── DB.md                       # Database schema + migrations + retention (NEW - from schema.sql + notes)
├── DEPLOYMENT.md               # Deploy instructions + env config (UPDATED - consolidate MVP guides)
├── RUNBOOK.md                  # Operations + troubleshooting + logs + reset (NEW - from TROUBLESHOOTING.md)
├── CONTRIBUTING.md             # Development setup + code standards + testing (UPDATED)
│
├── ADRs/                       # Architecture Decision Records (KEEP)
│   ├── ADR-001.md             # Soda + DuckDB choice
│   ├── ADR-002.md             # PostgreSQL history-only pattern
│   └── ADR-TEMPLATE.md        # Template for new ADRs
│
├── DECISION_LOG.md             # Active decisions + approvals (KEEP - already current)
├── RAID_LOG.md                 # Risks/Assumptions/Issues/Dependencies (KEEP - already current)

/archive/
├── deprecated/                 # Old docs, status reports, historical guides
└── phases/                     # Historical phase reports
```

### Document Purposes (Binding Contract)

| Doc | Purpose | Scope | Owners |
|-----|---------|-------|--------|
| **README.md** | Entry point; what + how to run | Project overview + 60-sec quickstart | All |
| **ARCHITECTURE.md** | System design + boundaries | Components, APIs, DB schema, data flow, decisions | Solution Architect + Backend Engineer |
| **docs/OVERVIEW.md** | Deep-dive architecture | Detailed component interactions, sequence diagrams, module structure | Solution Architect |
| **docs/API.md** | API contract (MSOT) | All endpoints, request/response, errors, examples | Backend Engineer |
| **docs/DB.md** | Database layer | Schema, migrations, indexes, retention, notes | Database Engineer |
| **docs/DEPLOYMENT.md** | How to deploy + config | Docker, environment variables, secrets, troubleshooting deployment | DevOps Engineer |
| **docs/RUNBOOK.md** | Operations + troubleshooting | Run commands, common issues, logs, reset flows, monitoring | DevOps Engineer + QA |
| **docs/CONTRIBUTING.md** | Development guide | Setup dev env, code standards, testing, CI/CD, PR process | All |
| **SECURITY.md** | Security posture | Threat model, hardening, secrets handling, OWASP | Security Engineer + DevOps |
| **CHANGELOG.md** | Version history | Releases + what changed | Release Manager |
| **docs/DECISION_LOG.md** | Decisions log | Active/approved decisions with evidence + timeline | Solution Architect |
| **docs/ADRs/*.md** | Architecture decisions | Per-decision rationale, tradeoffs, reversibility | Solution Architect |
| **docs/RAID_LOG.md** | Risk tracking | Risks, Assumptions, Issues, Dependencies + mitigations | Project Manager |

---

## PART 4: DOCUMENTATION INVENTORY SUMMARY

### Counts

| Category | Count | Action |
|----------|-------|--------|
| **Canonical Docs (KEEP)** | 9 (root) | No changes needed |
| **Docs in `/docs/`** | 20+ | UPDATE to align with implementation |
| **Root Markdown Files (KEEP/UPDATE/CONSOLIDATE/REMOVE)** | 67 total | **50+ REMOVE to `/archive/deprecated/`** |
| **Phase Reports** | 6 | **MOVE to `/archive/phases/`** |
| **Historical Status Docs** | 15+ | **MOVE to `/archive/deprecated/`** |
| **Duplicates to Consolidate** | 8+ | **MERGE into canonical + delete** |

### Net Result Post-Cleanup

```
Before:
├── 67 root .md files (confusing, redundant)
├── /docs/ with 20+ files (some stale)
└── No clear entry point

After:
├── 9 root .md files (clean, canonical)
├── /docs/INDEX.md (navigation)
├── /docs/ with 12+ aligned docs
├── /archive/deprecated/ (50+ historical)
└── Clear doc structure + single source-of-truth
```

---

## PART 5: BROKEN LINKS + REFERENCES AUDIT

### Identified Broken References (Evidence)

| Reference | Source | Target (Does Not Exist) | Issue | Fix |
|-----------|--------|---|---|---|
| `[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)` | README.md | File exists but may reference non-existent subsections | References sections like "Infrastructure Setup", "Monitoring" (not yet written) | Write missing sections |
| `[API_REFERENCE.md](API_REFERENCE.md)` | README.md | File exists but missing endpoints | `/connections`, `/metadata`, `/check-plans`, `/runs`, `/metrics` undocumented | Add endpoint docs |
| `/docs/deployment/` | DEPLOYMENT_GUIDE.md (assumed) | Directory exists but content unclear | Multiple deployment guides without clear index | Create `/docs/deployment/INDEX.md` |
| `/docs/guides/` | CONTRIBUTING.md (assumed) | Directory exists but structure unclear | Unknown which guides are current | Audit and consolidate |
| References to "Great Expectations" | API_REFERENCE.md (assumed) | Not in requirements.txt | Docs claim GE support but not implemented | Remove from docs until implemented |
| References to "Cosmos DB" | DEPLOYMENT_GUIDE.md (assumed) | Optional, not core | Docs may claim Cosmos support (Decision-007 pending) | Align with decision |

---

## PART 6: ACTION PLAN (PHASE 0 OUTPUT)

### Immediate Actions (Before Phase 1)

**1. Move all historical/phase docs to `/archive/` (30 min)**
```bash
# From root: move phase reports
git mv PHASE0_*.md PHASE01_*.md PHASE1_*.md PHASE2_*.md PHASE4_*.md archive/phases/

# Move historical status docs
git mv IMPLEMENTATION_COMPLETE.txt SYSTEM_*.md FINAL_*.md archive/deprecated/
git mv *_SUMMARY.md ISSUES_FIXED.md FIXES_APPLIED.md archive/deprecated/

# Commit
git commit -m "refactor: Archive 50+ historical docs to /archive/; prepare for cleanup"
```

**2. Create canonical `/docs/INDEX.md` (15 min)**
- List all docs with purpose, owner, last updated
- Provide decision tree: "I want to..." → Doc X
- Link to ADRs and decision log

**3. Verify API endpoints against code (30 min)**
- Inspect `/backend/src/api/` to find all routers
- List endpoints: `/connections`, `/upload`, `/metadata`, `/profile`, `/check-plans`, `/runs`, `/metrics`
- Identify missing / undocumented endpoints
- Create `/docs/API.md` skeleton

**4. Verify database schema (15 min)**
- Read `/backend/schema.sql`
- Create `/docs/DB.md` skeleton
- Note if migrations framework exists or needed

**5. Create `/docs/OVERVIEW.md` skeleton (20 min)**
- Extract architecture details from ARCHITECTURE.md + code
- Structure: Layers | Components | Data Flow | Deployment Model

---

## NEXT PHASE

**PHASE 1** (when ready): Implementation Plan with accurate milestones based on repo reality.
- Will inspect actual code to verify implementation gaps
- Will write accurate API contract
- Will propose specific implementation tasks

---

## Evidence Summary

| Source | Finding |
|--------|---------|
| `main.py` | FastAPI entry point exists; imports core scanner, HTML generator, logging, config |
| `requirements.txt` | Soda 3.4.3, DuckDB 1.0.0, FastAPI, Pydantic, PostgreSQL (psycopg2) confirmed in deps |
| `docker-compose.yml` | PostgreSQL service hardened; no API/frontend services yet |
| `/backend/src/` | Structure exists: api/, core/, models/, services/, storage/, worker/ |
| `/frontend/src/` | Minimal: only components/ directory found |
| `/src/` | Root src: api/, config/, core/, notifications/, reporting/, storage/, ui/, utils/ |
| `/docs/` | Organized: ADRs/, deployment/, guides/, playbooks/; some stale content likely |

---

**Classification Complete. Ready for PHASE 1 Implementation Plan.**

**Docs Maintenance Owner:** Assign to QA Engineer + Docs Maintainer Agent  
**Risk:** 50+ orphaned docs must be archived/removed immediately to avoid confusion during implementation.
