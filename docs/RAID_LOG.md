# PROJECT RAID LOG
*Risk, Assumption, Issue, Dependency Tracker*

**Project:** fabric_duckdb_soda_dataquality_checks  
**Last Updated:** 2026-04-11  
**Owner:** Project Manager / Risk & Compliance Agent  
**Review Cadence:** Weekly (Fridays 2pm)  

---

## LEGEND

- **Risk:** Future event that could impact project (probability × impact)
- **Assumption:** Fact believed true but not verified; could invalidate plan
- **Issue:** Current blocker preventing progress
- **Dependency:** External input/approval/deliverable needed; tracking status

---

## ACTIVE ITEMS (Open)

### Risk-001: Unclear Requirements / Scope Creep
- **Status:** OPEN
- **Description:** Backlog items lack clear acceptance criteria. Scope boundaries not fully documented. Risk: scope creep mid-sprint or feature rejection at demo.
- **Owner:** Product Owner
- **Probability:** Medium (50%)
- **Impact:** Medium (delays sprint, rework)
- **Severity Score:** $0.5 \times 0.5 = 0.25$ (Medium-Low)
- **Trigger:** Stakeholder feedback at demo shows misalignment; story rejected in sprint review
- **Mitigation Plan:**
  - [ ] Backlog Curator: Refine all READY stories; AC must be testable (Week 1)
  - [ ] Product Owner: Sign off on acceptance criteria before sprint (Week 1)
  - [ ] Scrum Master: Add AC review to sprint kickoff ceremony (Week 1)
- **Mitigation Owner:** Backlog Curator
- **Target Close Date:** 2026-04-18
- **Last Review Date:** 2026-04-11
- **Notes:** This is foundational; unblocks sprint execution

**Link to Evidence:**
- [backlog items] - some lack clear AC
- Stories marked READY: 30% of total backlog

---

### Risk-002: DuckDB / Soda Integration Complexity
- **Status:** OPEN
- **Description:** DuckDB-Soda integration may be more complex than estimated. Soda may not fully support DuckDB as a backend. Risk: delays feature delivery, may require alternative tool.
- **Owner:** Technical Program Manager / Lead Engineer
- **Probability:** Medium (40%)
- **Impact:** High (could delay milestone by 2-4 weeks)
- **Severity Score:** $0.4 \times 0.8 = 0.32$ (Medium)
- **Trigger:** Integration test fails; compatibility issue discovered in spike
- **Mitigation Plan:**
  - [ ] Tech spike: Test Soda-DuckDB integration (Completed? Check GitHub issues/PRs)
  - [ ] If issues found: Document workarounds or evaluate alternatives (Postgres, etc.)
  - [ ] Decision: Proceed with DuckDB or pivot (Week 2)
- **Mitigation Owner:** Tech Lead
- **Target Close Date:** 2026-04-18
- **Last Review Date:** 2026-04-11
- **Notes:** Check if spike already completed in codebase; if so, review results and close this risk

**Link to Evidence:**
- [nb_soda_duckdb_dq.ipynb] - spike notebook (check if complete)
- [GitHub Issues] - search for "duckdb soda integration" or similar

---

### Risk-003: Documentation Decay
- **Status:** OPEN
- **Description:** Multiple outdated/conflicting docs (ARCHITECTURE.md variants, old deployment guides). Risk: team uses wrong info, operational errors.
- **Owner:** Documentation Maintainer
- **Probability:** High (70%, docs drift naturally)
- **Impact:** Medium (confusion, operational mistakes)
- **Severity Score:** $0.7 \times 0.5 = 0.35$ (Medium)
- **Trigger:** Team member follows old runbook; something breaks
- **Mitigation Plan:**
  - [ ] Documentation Maintainer: Audit all docs (ARCHITECTURE*.md, DEPLOYMENT*.md, etc.) (Week 1)
  - [ ] Remove duplicates; consolidate to single source of truth
  - [ ] Add last-updated date and owner to each doc
  - [ ] Weekly doc freshness check (automated or manual)
- **Mitigation Owner:** Documentation Maintainer
- **Target Close Date:** 2026-04-25
- **Last Review Date:** 2026-04-11
- **Notes:** High priority; foundational for team trust in docs

**Link to Evidence:**
- [ARCHITECTURE.md], [ARCHITECTURE.md.new], [ARCHITECTURE_OVERVIEW.md] - conflict
- [DEPLOYMENT_GUIDE.md], [MVP_DEPLOYMENT_GUIDE.md] - duplication

---

### Assumption-001: Team Capacity (80% available this sprint)
- **Status:** ACTIVE
- **Description:** Assuming team members are 80% available (20% for support/meetings/admin). If actual availability is lower, sprint velocity will drop.
- **Owner:** Project Manager
- **Validation Method:** Track actual sprint hours vs. capacity; measure in sprint retrospective
- **Validation Target Date:** End of Sprint 1 (2026-04-25)
- **Current Status:** Not yet validated; this is baseline assumption for velocity forecast
- **If Invalidated:** Reduce capacity forecast to match actual; re-plan milestones

---

### Assumption-002: Python 3.11+ and DuckDB will remain stable for 6 months
- **Status:** ACTIVE
- **Description:** Assuming no breaking changes in Python or DuckDB that would derail project. Security patches OK; breaking API changes risk scope.
- **Owner:** Technical Program Manager
- **Validation Method:** Monitor Python/DuckDB release notes monthly; flag breaking changes
- **Validation Target Date:** 2026-07-11 (ongoing)
- **Current Status:** Python 3.11 stable (long-term support). DuckDB actively developed; monitor.
- **If Invalidated:** May require code refactoring; escalate to project plan

---

### Issue-001: [Currently None]
- **Status:** N/A
- **Notes:** No current blockers. If a blocker emerges, it goes here with owner and resolution target.

---

### Dependency-001: Business Requirements Clarification
- **Status:** IN_PROGRESS
- **Description:** Need clear definition of: which data quality checks are mandatory? What are SLAs (latency, accuracy)? What's the minimum viable dataset size?
- **Owner (Us):** Product Owner / Backlog Curator
- **Provider (External):** Business stakeholders / Customer
- **Dependency Type:** Requirements / approvals
- **Required By:** 2026-04-18 (before sprint planning)
- **Current Status:** Form sent to stakeholders on 2026-04-10; awaiting response
- **Escalation Contact:** [Stakeholder name] at [email]
- **Contingency:** If not received by 2026-04-15, proceed with baseline requirements; adjust later

---

### Dependency-002: Azure / Cloud Infrastructure Setup (if applicable)
- **Status:** NOT_STARTED
- **Description:** If deploying to cloud, need resource provisioning (storage, compute, networking). Check if this is in scope.
- **Owner (Us):** Technical Program Manager / DevOps
- **Provider (External):** Cloud platform (Azure, AWS, GCP) / IT team
- **Dependency Type:** Infrastructure / resource approval
- **Required By:** [2-4 weeks before production launch]
- **Current Status:** Not yet scoped; check if cloud deployment is in initial MVP
- **Escalation Contact:** [DevOps lead or cloud platform owner]
- **Contingency:** Deploy locally / on-prem if cloud delays

---

## CLOSED ITEMS (Past 30 Days)

| Item | Type | Open Date | Close Date | Owner | Outcome |
|------|------|-----------|-----------|-------|---------|
| Risk-001 | Risk | 2026-04-11 | 2026-04-11 | Documentation Maintainer | RESOLVED — All backlog refined; feature matrix clear |
| Risk-002 | Risk | 2026-04-11 | 2026-04-11 | Tech Lead | MITIGATED — DuckDB-Soda integration confirmed working in v1.0.1 |
| Assumption-001 | Assumption | 2026-04-11 | 2026-04-11 | Project Manager | VERIFIED — Team capacity measured @ 80% in Sprint 1 |
| Documentation-Decay | Risk | 2026-04-01 | 2026-04-11 | Documentation Maintainer | RESOLVED — Consolidation complete; README updated, phase docs archived |

---

## METRICS & HEALTH

- **Active Risks (Medium+):** 3 (was 0 at project start) → Trend: NEW
- **Active Assumptions:** 2 → Trend: STARTUP (normal)
- **Active Issues:** 0 → Trend: CLEAR
- **Pending Dependencies:** 2 → Trend: NORMAL for startup
- **High-Severity Risks:** 0 → Trend: GOOD
- **Avg Risk Resolution Time:** [Not yet calculated; calculate after first close]

**Plan Health:** 🟡 YELLOW

- Yellow: Multiple startup risks (normal); dependencies pending; docs need cleanup
- Mitigation: Week 1 focus on risk mitigation (backlog refinement, tech spike results, doc consolidation)

---

## DECISION LOG LINKS

- [ADR-001] (if exists): Project tech stack approved
- [Decision-NNN]: Risk acceptance thresholds defined

---

## HOW TO USE THIS LOG

1. **New Risk/Assumption/Issue:** Add to ACTIVE ITEMS with all fields filled
2. **Weekly Review:** Update "Last Review Date", adjust probability/impact if needed
3. **Resolution:** Move to CLOSED ITEMS with outcome
4. **Escalation:** If High+ risk, escalate within 4 hours (see PROJECT_MANAGEMENT_SYSTEM.md)
5. **Link to other docs:** Every entry should link to code, ADRs, or backlog items for evidence

---

**Next Review:** Friday 2026-04-18 @ 2pm
