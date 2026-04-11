# DECISION LOG / ADR Registry
*Architectural & Project Decisions*

**Project:** fabric_duckdb_soda_dataquality_checks  
**Last Updated:** 2026-04-11  
**Owner:** Technical Program Manager / Project Manager  
**Review Cadence:** Weekly (as part of status review)  

---

## LEGEND

- **ADR (Architecture Decision Record):** Technical design decisions. See [PROJECT_MANAGEMENT_SYSTEM.md - Technical PM section] for full ADR template.
- **Decision Entry:** Non-technical decision (scope, priority, process, resource allocation, risk acceptance, etc.)

---

## ACTIVE DECISIONS (Open, Pending Approval)

### Decision-001: Project Tech Stack Approval
- **ID:** D-001
- **Title:** Approved Tech Stack: Python 3.11, DuckDB, Soda, Fabric, FastAPI
- **Date Submitted:** 2026-04-10
- **Status:** PENDING APPROVAL
- **Decision Owner (to Approve):** Technical Steering Committee / Lead Architect
- **Options Evaluated:**
  - Option A: Python (DuckDB + Soda + Fabric) ← **RECOMMENDED**
    - Pro: Soda native support, DuckDB in-process, lightweight
    - Con: Python ecosystem dependency
  - Option B: .NET (Cosmos DB + custom checks)
    - Pro: Strong typing, Azure ecosystem
    - Con: Custom checker development effort, Soda not first-class
  - Option C: Go (microservices architecture, Chi framework)
    - Pro: Fast, concurrent, cloud-native
    - Con: Missing Soda integration, rebuild from scratch
  
- **Rationale:** Option A balances speed-to-market (Soda + DuckDB ready to go) with team skillset (Python-heavy)

- **Timeline:**
  - Decision Needed By: 2026-04-15
  - If not approved: Sprint planning delayed, milestone slip
  
- **Links:**
  - Main.py, requirements.txt - implementation started in Python
  - Docker file, docker-compose.yml - shows Python focus

- **How to Approve:**
  - [ ] Reply "APPROVED" in decision log
  - [ ] Or comment in [GitHub Issue / Jira ticket if exists]
  - Or: Forward this decision log and reply "ACK"

- **Approval Chain:**
  - [ ] Lead Architect: [Sign-off date]
  - [ ] Technical Steering: [Date]

---

### Decision-002: MVP Scope Definition
- **ID:** D-002
- **Title:** MVP Scope: Phase 0 Baseline → Minimal Data Quality Checks
- **Date Submitted:** 2026-04-05
- **Status:** PENDING PRODUCT OWNER SIGN-OFF
- **Decision Owner:** Product Owner
- **Question:** What is the MVP? (Minimal viable scope to ship and gather feedback?)
  - Option 1: Basic rule validation (null checks, range checks, format checks) ← **Team recommendation**
  - Option 2: Full Soda catalog (all checks, all integrations)
  - Option 3: Pivot: Fabric built-in quality checks only (no custom Soda)

- **Recommendation:** Option 1 (basic rules MVP; iterate to full feature set after customer feedback)

- **Timeline:**
  - Needed By: 2026-04-15 (for sprint planning)
  - If unclear: Backlog Curator can't finalize stories; Sprint 1 delayed

- **Links:**
  - [PHASE0_BASELINE_REPORT.md] - research summary
  - [README_FEATURES.md], [FEATURES_COMPLETE.md] - feature inventory
  - Check if backlog.md or Jira has story breakdown

- **Approval:**
  - [ ] Product Owner: [Name]: [Sign-off date]
  - [ ] Business Stakeholder: [Name]: [Date]

---

## APPROVED DECISIONS (Implemented)

### ADR-001: Use DuckDB as In-Process Data Engine
- **Status:** APPROVED
- **Approved Date:** 2026-03-15 (inferred from code)
- **Rationale:** Lightweight, in-process, perfect for data quality evaluation without external DB
- **Evidence:** Codebase uses DuckDB (requirements.txt, Docker file)
- **Implications:** Deployment is single-container; scales horizontally via Fabric workers
- **Mitigation:** Integration risk with Soda (see RAID-002 ongoing verification)

---

### ADR-002: Soda as Data Quality Framework
- **Status:** APPROVED
- **Approved Date:** 2026-03-10 (inferred from spike notebooks)
- **Rationale:** Soda provides declarative quality rules, pre-built checks, multi-data-source support
- **Evidence:** Spike notebook (nb_soda_duckdb_dq.ipynb) completed
- **Implications:** Data quality rules defined in YAML/JSON; checks logged with metadata
- **Mitigation:** Must verify DuckDB backend full compatibility (RAID-002 ongoing)

---

### Decision-003: Development Environment = Local + Docker Compose
- **Status:** APPROVED
- **Approved Date:** 2026-04-01 (inferred from docker-compose files)
- **Rationale:** Speed development; easy onboarding; production-like environment
- **Evidence:** docker-compose.yml, docker-compose.dev.yml present; start-postgres.ps1 available
- **Implications:** Every dev runs full stack locally; reduces integration surprises
- **Links:** [docker-compose.yml], [Dockerfile], [manage.ps1]

---

### Decision-004: Data Lineage / Audit Trail via Metadata Tables
- **Status:** APPROVED
- **Approved Date:** 2026-02-20 (inferred from COLUMN_LEVEL_RESULTS_GUIDE.md)
- **Rationale:** Track which checks ran, when, against which data, with what results; supports compliance/audit
- **Evidence:** Detailed results implementation docs, column-level tracking in backlog
- **Implications:** Results API must return rich metadata (check ID, rule version, severity, timestamp, lineage)
- **Links:** [COLUMN_LEVEL_RESULTS_GUIDE.md], [DETAILED_RESULTS_GUIDE.md]

---

## PENDING DECISIONS (Awaiting Input)

### Decision-005: Release Cadence & Deployment Strategy
- **ID:** D-005
- **Title:** How often do we release? (weekly sprints, CI/CD, canary, rolling?)
- **Options:**
  - Option A: Weekly sprint + manual deployment ← **Default assumption**
  - Option B: Continuous deployment (every merged PR)
  - Option C: Monthly milestones + blue-green deployment
- **Needed By:** 2026-04-18 (before Release Manager finalizes schedule)
- **Owner to Decide:** Technical PM + Ops
- **Link to Evidence:** CI/CD config (azure-pipelines.yml) - see what's currently configured

---

### Decision-006: On-Premises vs. Cloud Deployment
- **ID:** D-006
- **Title:** Primary deployment target (on-prem servers, Azure, AWS, GCP, hybrid?)
- **Options:**
  - Option A: On-premises Fabric cluster (customer hosts)
  - Option B: Azure (if customer is Microsoft-aligned)
  - Option C: AWS (if customer is AWS-aligned)
  - Option D: SaaS offering (Cloud-hosted, multi-tenant)
- **Needed By:** 2026-04-25 (impacts MVP scope, infrastructure costs)
- **Owner to Decide:** Product Owner + Customer / Business
- **Timeline Impact:** Infrastructure setup could take 2-4 weeks
- **Link to Evidence:** Check if deployment target is documented in project charter or customer contract

---

### Decision-007: Azure Cosmos DB — Keep or Remove?
- **ID:** D-007
- **Title:** Azure Cosmos DB optional support — continue or remove from codebase?
- **Status:** PENDING DECISION
- **Date Submitted:** 2026-04-11
- **Decision Owner:** Technical PM
- **Context:** 
  - Currently commented out in `requirements.txt` (not installed by default)
  - No customer requests for Cosmos DB integration yet
  - PostgreSQL handles scan history use case effectively
  - Adds complexity to codebase & documentation
- **Options:**
  - **Option A: KEEP Optional**
    - Pro: Future flexibility; Azure customers may request it
    - Con: Adds code maintenance burden; unclear ROI at MVP
    - Effort: Moderate (document when/why to use, test integration)
  - **Option B: REMOVE Entirely** ← **RECOMMENDED**
    - Pro: Simplifies codebase, reduces dependencies, cleaner docs
    - Con: Would need to re-add if customer demands it (minimal effort)
    - Effort: Low (remove from requirements.txt, cleanup code comments)
- **Recommendation:** **Option B (REMOVE)**
  - Rationale: PostgreSQL satisfies all MVP requirements. Cosmos DB adds no MVP value. Can add back in v1.1 if customer requests it.
  - Timeline Impact: None (not used in v1.0.1)
  - Code Impact: Remove ~20 lines from `src/storage/cosmos_repository.py` or entire file
- **Timeline:** Decision needed by 2026-04-20
- **Implementation:** If Option B approved, remove from codebase; update requirements.txt and DEPLOYMENT_GUIDE.md
- **Links:** 
  - [requirements.txt](requirements.txt) — lines with azure-cosmos (commented)
  - [ARCHITECTURE.md](ARCHITECTURE.md) — update if Cosmos removed
  - [src/storage/cosmos_repository.py](src/storage/cosmos_repository.py) — affected code

---

### Decision-008: Documentation Archive Location & Structure
- **ID:** D-008
- **Title:** Archive old phase reports & deployment guides; establish archive structure
- **Status:** APPROVED (implemented 2026-04-11)
- **Decision:** Move PHASE*.md files and old MVPdeployment guides to `/archive/` folder
- **Rationale:** 
  - Phase reports clutter repo; mislead new users about current status
  - CHANGELOG.md already captures release history
  - Archive preserves historical context without active code paths
- **Implementation:**
  - Create `/archive/phases/` folder with README explaining historical context
  - Move PHASE0*.md, PHASE1*.md, PHASE2*.md, PHASE4*.md to archive
  - Create `/archive/deprecated/` for old deployment guides  
  - Update root README to not reference archived docs
  - Commit message: "Archive: Move phase reports & old guides to archive/"
- **Timeline:** Completed 2026-04-11
- **Verification:** All `.md` files in root or `/docs/` are current; no orphaned phase files in active tree

---

### ADR-009: Docs-as-Code Baseline — Canonical Documentation
- **ID:** ADR-009
- **Title:** Establish single source of truth for documentation; docs-as-code workflow
- **Status:** APPROVED (implemented 2026-04-11)
- **Approved By:** Technical PM, Documentation Lead
- **Approved Date:** 2026-04-11
- **Decision:** Consolidate 50+ documentation files into 6 canonical documents in `/docs/`; establish update discipline
- **Rationale:**
  - Multiple doc versions create confusion and inconsistency
  - Docs must stay in sync with code changes
  - Documentation is as important as code; treat with same rigor
  - Single source of truth enables reliable reference for team and customers
- **Approved Implementation:**
  1. **Canonical Docs (in `/docs/`):**
     - `INDEX.md` - Navigation hub and single entry point
     - `OVERVIEW.md` - Architecture deep-dive with diagrams
     - `API.md` - Complete REST API specification
     - `DATABASE.md` - Schema reference, migrations, queries
     - `DEPLOYMENT.md` - Setup for local dev, Docker, production
     - `RUNBOOK.md` - Operations guide, troubleshooting, incident response
  2. **Process:**
     - Every code change must include doc update (same PR)
     - Weekly docs audit (Friday)
     - Link validation before merge
     - ADRs for any doc structure changes
  3. **Archive** (`/archive/`)
     - `/archive/deprecated/` - Old deployment guides, variants
     - `/archive/phases/` - Phase reports (historical)
     - `/archive/README.md` - Retention policy and search guide
  4. **Verification:**
     - No broken internal links (automated check)
     - All API endpoints documented within 24 hours of code merge
     - All decision reasons documented in DECISION_LOG.md or ADRs

- **What Replaced:**
  - ~~PHASE0_BASELINE_REPORT.md~~ → docs/OVERVIEW.md (high-level summary) + ARCHITECTURE.md (decisions)
  - ~~PHASE1_QUALITY_GATES.md~~ → docs/INDEX.md (nav) + PHASE1_IMPLEMENTATION_PLAN.md (in root, temporary reference)
  - ~~PHASE2_API_CONTRACT.md~~ → docs/API.md (normative spec)
  - ~~PHASE2_EDGE_CASE_MATRIX.md~~ → Removed (test details, not customer-facing)
  - ~~MVP_QUICKSTART.md~~ → docs/DEPLOYMENT.md
  - ~~ARCHITECTURE_OVERVIEW.md~~ → docs/OVERVIEW.md + ARCHITECTURE.md
  - All test guides → CONTRIBUTING.md (dev instructions only)

- **Key Principle:** Documentation is a first-class artifact; if code changes but docs don't, it's a bug

- **Timeline:** Completed in M1 (2026-04-11)

- **Evidence:**
  - Created: `/docs/INDEX.md`, `/docs/OVERVIEW.md`, `/docs/API.md`, `/docs/DATABASE.md`, `/docs/DEPLOYMENT.md`, `/docs/RUNBOOK.md`
  - Updated: `.env.example` with comprehensive configuration reference
  - Created: `/archive/deprecated/README.md` with retention policy
  - Updated: `/backend/src/main.py` health check to return `database: connected`

- **Impact:**
  - Team now has single entry point: [docs/INDEX.md](INDEX.md)
  - New contributors follow canonical docs only
  - Support and operations use RUNBOOK.md for procedures
  - API consumers use API.md as source of truth

- **Future Extensions (v1.1+):**
  - [ ] Add WIZARD_GUIDE.md when React wizard implemented
  - [ ] Add CHECKS_GUIDE.md when suggestions engine complete
  - [ ] Update DEPLOYMENT.md with production checklists
  - [ ] Create troubleshooting guides for common errors

- **Related ADRs:**
  - ADR-001 (DuckDB)
  - ADR-002 (Soda)
  - ADR-003 (FastAPI + SQLAlchemy)

- **Related Files:**
  - [docs/INDEX.md](INDEX.md) - Navigation hub
  - [archive/deprecated/README.md](../../archive/deprecated/README.md) - Archive policy
  - [CONTRIBUTING.md](../../CONTRIBUTING.md) - Developer setup

---

## DECISION TEMPLATE (For New Decisions)

**Use this format when recording a new decision:**

```markdown
### Decision-NNN: [Title]
- **ID:** D-NNN
- **Title:** [Clear decision statement]
- **Date Submitted:** [ISO date]
- **Status:** PENDING | APPROVED | REJECTED | SUPERSEDED
- **Decision Owner:** [Who decides]
- **Options:**
  - Option A: [Description + pros/cons]
  - Option B: [Description + pros/cons]
  - Option C: [Description + pros/cons]
- **Recommendation:** [Which option + why]
- **Timeline:** [Decision needed by; impact if delayed]
- **Links:** [Evidence: code, ADRs, backlog, etc.]
- **Approval:** [ ] [Name/stakeholder] on [date]
- **If APPROVED:** [Date], [Approved by who], [Link to any implementation PR/story]
- **If REJECTED:** [Why], [Alternative chosen], [Feedback channel]
```

---

## SUPERSEDED / CLOSED DECISIONS

[None yet; once decisions are replaced, they move here]

| Decision ID | Title | Status | Superseded By | Date |
|-------------|-------|--------|---|---|
| [None yet] | — | — | — | — |

---

## METRICS

- **Decisions Pending Approval:** 3 (D-001, D-002, D-005, D-006)
- **Decisions Approved (Active):** 4 (ADRs 1-2, Decisions 3-4)
- **Avg Approval Time:** [To be calculated after first decision closes]
- **Blocked Decisions:** 1 (D-002 waiting on PO input)

**Health:** 🟡 YELLOW

- Pending decisions not blocking MVP (D-005 can be defaulted; D-006 escalated to stakeholders)
- Critical path: D-001, D-002 must be approved by 2026-04-15

---

## RELATED ARTIFACTS

- [PROJECT_MANAGEMENT_SYSTEM.md] - Full decision framework and rules
- [RAID_LOG.md] - Risk and assumption tracking
- [docs/ADRs/] - Detailed architecture decision records (if folder exists)

---

**Next Review:** Fridays @ 2pm (with weekly status)

---

## HOW TO USE THIS LOG

1. **New Decision?** Add a PENDING DECISION entry with all fields
2. **Ready to Decide?** Fill in Options, Rationale, Timeline
3. **Approved?** Move to APPROVED section with signature/date
4. **Need to Escalate?** Flag in RAID_LOG.md as a Dependency or Issue
5. **Link Everything:** Every decision should cite code, ADRs, or backlog evidence
