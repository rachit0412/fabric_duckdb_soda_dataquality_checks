# ADR-XXXX: [TITLE — Replace with your decision title]

**Date:** [ISO date, e.g., 2026-04-11]  
**Status:** PROPOSED | APPROVED | SUPERSEDED | DEPRECATED  
**Owner / Author:** [Your name/team]  
**Reviewer:** [Tech lead / CTO name]  

---

## CONTEXT

*What is the issue we're facing? Why does this matter? What are the constraints or requirements driving this decision?*

[1-2 paragraphs describing the business/technical context, the problem statement, constraints]

### Example:
> We need to store data quality check results (pass/fail counts, rule violations, etc.) for audit trails and customer dashboards. 
> 
> Constraints: Must support >10k checks/day. Schema may evolve as we add new metadata fields. Need to query results quickly (sub-second latency for dashboards). Team is Python-heavy; prefer tools/languages we already know.

---

## PROBLEM STATEMENT

*What specific problem are we solving with this decision?*

[Clear, focused statement of the issue]

### Example:
> How do we persistently store data quality check results such that we can:
> 1. Support audit/compliance queries (who ran which checks, when, against what data?)
> 2. Provide real-time dashboards (P95 latency <1s for 90-day query range)
> 3. Scale to >10k checks/day without infrastructure overload
> 4. Evolve the schema without service downtime

---

## OPTIONS CONSIDERED

### Option 1: [Title — e.g., DuckDB (In-Process)]

**Description:**  
[What is this option? How would it work?]

**Pros:**
- Pro 1: [Specific benefit]
- Pro 2: [Specific benefit]
- Pro 3: [Specific benefit]

**Cons:**
- Con 1: [Specific drawback and why it matters]
- Con 2: [Specific drawback]

**Effort Estimate:** [S/M/L/XL or specific hours/days]

**Risk Level:** Low / Medium / High

---

### Option 2: [Title — e.g., PostgreSQL]

**Description:**
[...]

**Pros:**
- Pro 1: [...]
- Pro 2: [...]

**Cons:**
- Con 1: [...]
- Con 2: [...]

**Effort Estimate:** [...]

**Risk Level:** [...]

---

### Option 3: [Title — e.g., Azure Cosmos DB]

**Description:**
[...]

**Pros:**
- Pro 1: [...]

**Cons:**
- Con 1: [...]

**Effort Estimate:** [...]

**Risk Level:** [...]

---

## DECISION

**We will implement: [Option X — which one and why it's selected]**

---

## RATIONALE / TRADE-OFF ANALYSIS

*Why did we choose Option X over the others? What are the key trade-offs?*

[2-3 paragraphs explaining the decision reasoning]

### Example:
> **We chose Option 1 (DuckDB)** as our primary result store because:
> 
> 1. **Speed to Market:** DuckDB is battle-tested for OLAP (analytical) queries; requires no separate service deployment. Soda already supports DuckDB as a results backend.
> 2. **Team Fit:** Our team knows Python. DuckDB integrates seamlessly with Python (no ORM friction). Fast iteration.
> 3. **Scale:** DuckDB can handle 10k checks/day in a single process (or distributed via Fabric workers). No operational overhead.
> 
> **Trade-off accepted:** DuckDB is in-process, so if the process dies, results in-flight are lost. **Mitigation:** We'll flush results to cloud storage (ADLS/S3) after batches complete, with 100% durability. Audit compliance still met.
>
> We rejected Option 2 (PostgreSQL) because it adds an external dependency (another database to operate and scale). Option 3 (Cosmos DB) is viable for scale but adds Azure cost/lock-in; DuckDB achieves the same performance cheaper at MVP scale.

---

## CONSEQUENCES

### Positive Outcomes
- ✅ [Expected benefit and impact]
- ✅ [Expected benefit]
- ✅ [Expected benefit]

### Negative Outcomes / Costs
- ⚠️ [Drawback and mitigation strategy]
- ⚠️ [Drawback and mitigation]

### Action Items (To Implement This Decision)
- [ ] [Task]: [Description] — Owner: [Name] — Target: [date]
- [ ] [Task]: [Description] — Owner: [Name] — Target: [date]
- [ ] [Task]: [Description] — Owner: [Name] — Target: [date]

---

## ALTERNATIVES REJECTED (AND WHY)

### Why Not Option 2: [...]
Short explanation of rejection rationale. This helps future readers understand the full context without re-litigating the decision.

### Why Not Option 3: [...]
[...]

---

## RELATED DECISIONS & CONTEXT

- **Related ADR:** [ADR-NNN link] — [What it decided]
- **Related ADR:** [ADR-NNN link] — [What it decided]
- **Depends On:** [ADR / decision that must be made first]
- **Depends On:** [External dependency, approval, etc.]

---

## IMPLEMENTATION CHECKLIST

- [ ] Code changes / POC started
  - [ ] Spike notebook or branch: [link]
  - [ ] Test results: [link/notes on success criteria]
  
- [ ] Design review completed
  - [ ] Reviewed by: [Tech lead name] on [date]
  - [ ] Feedback: [Any adjustments needed]

- [ ] Documentation updated
  - [ ] ARCHITECTURE.md: [Updated to reflect decision]
  - [ ] Runbook created (if operational): [Link]
  - [ ] API docs updated (if applicable): [Link]

- [ ] Team/stakeholder communication
  - [ ] Communicated to team: [Date]
  - [ ] Stakeholder approval (if required): [Approval date]

---

## EVIDENCE & REFERENCES

- [Link to GitHub issue / spike] — Investigation/spike results
- [Link to benchmark / performance test] — If you have numbers, cite them
- [Link to design document] — If detailed design exists
- [Link to related codebase PR] — If implementation started

### Example:
- [GitHub Issue #42] - DuckDB vs PostgreSQL comparison spike
- [Notebook: nb_soda_duckdb_dq.ipynb] - Spike proof of concept
- [PR #128] - DuckDB integration prototype
- [Architecture Diagram] - Shows result store in system context

---

## DECISION RECORD

**Proposed By:** [Your name] on [date]  
**Type:** Technical / Architectural / Infrastructure / Process  
**Priority:** P0 Critical / P1 High / P2 Medium / P3 Low  

**Approval Sign-Off:**
- [ ] **Author / Proposer:** [Name] — [date]
- [ ] **Technical Reviewer / Lead:** [Name] — [date]
- [ ] **Product Owner (if scope/cost impact):** [Name] — [date]
- [ ] **Stakeholder Approval (if required):** [Name] — [date]

**Final Status:** ✅ APPROVED | 🔴 REQUEST CHANGES | ⏸️ DEFERRED

**Approval Decision Details:**
> [If approved: Summary of approval and any conditions]  
> [If request changes: Feedback and revision needed]  
> [If deferred: Reason for deferral and when to revisit]

---

## REVISION HISTORY

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-11 | [Name] | Initial draft |
| 1.1 | 2026-04-15 | [Name] | Incorporated feedback from tech review |

---

## HOW TO USE THIS TEMPLATE

1. **Copy this file** to `/docs/ADRs/ADR-NNN.md` (replace NNN with next sequence number)
2. **Fill in all sections** (CONTEXT, PROBLEM, OPTIONS, DECISION, RATIONALE, CONSEQUENCES)
3. **Get reviewed** by tech lead / architect; update based on feedback
4. **Add approval signatures** when ready
5. **Link from related docs**: ARCHITECTURE.md, DECISION_LOG.md, README.md (as appropriate)
6. **Keep it short:** 1-3 pages if possible. Save detailed analysis for linked docs.

---

## LINKS TO PROJECT MANAGEMENT ARTIFACTS

- **Decision Log:** See [docs/DECISION_LOG.md] - tracks this ADR plus other non-technical decisions
- **Project Status:** See [PROJECT_MANAGEMENT_SYSTEM.md] - full framework for decision making
- **RAID Log:** See [docs/RAID_LOG.md] - if this decision exposes risks or dependencies, log them there

---

**This is a TEMPLATE. Delete this section once you've filled in the sections above.**
