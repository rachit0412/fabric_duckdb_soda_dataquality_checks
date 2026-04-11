# PROJECT MANAGEMENT TEAM SYSTEM — QUICK START GUIDE

*Get the virtual PM team up and running in 1 hour*

---

## WHAT IS THIS?

You now have **10 autonomous AI-powered agents** (skills) that will manage your project end-to-end:

1. **Product Owner Agent** → Manages requirements & scope
2. **Scrum Master Agent** → Runs ceremonies, unblocks team
3. **Project Manager Agent** → Maintains plan, RAID log, goes/no-goes
4. **Delivery Manager Agent** → Tracks throughput, quality, flow
5. **Technical Program Manager Agent** → Architecture, integration, tech decisions
6. **Backlog Curator Agent** → Refines stories, manages backlog health
7. **Risk & Compliance Agent** → Manages RAID log, risks, audit trail
8. **Documentation Maintainer Agent** → Keeps docs fresh, conflict-free
9. **Stakeholder Comms Agent** → Weekly digests, decision requests
10. **Release Manager Agent** → Release planning, go/no-go decisions

**These agents are designed to:**
- Keep project artifacts always in sync with reality (code, decisions, status)
- Operate on evidence only (no guessing; if data is missing, they say so)
- Produce audit-ready + actionable outputs (with diffs ready to paste)
- Require no human meeting to coordinate (evidence-driven automation)

---

## GETTING STARTED (TODAY)

### Step 1: Understand the Framework (5 min)

Read these sections of [PROJECT_MANAGEMENT_SYSTEM.md]:
- **TEAM CHARTER:** Why we're doing this, core principles
- **EVIDENCE SOURCES:** What documents the agents will read
- **ORCHESTRATION:** How agents hand off to each other

### Step 2: Set Up Initial Artifacts (10 min)

These files already exist in your workspace:

✅ **PROJECT_MANAGEMENT_SYSTEM.md** — Main system doc (full specs for all 10 agents)  
✅ **docs/RAID_LOG.md** — Risk tracker (uses weekly)  
✅ **docs/DECISION_LOG.md** — Decision tracker (ongoing)  

**Optional: Create if missing:**
- [ ] **/docs/ADRs/** folder (for architecture decisions) — if you have major tech decisions, put them here as ADR-001.md, ADR-002.md, etc.
- [ ] **docs/RUNBOOKS/** folder (for operational runbooks) — if you have deployment/incident procedures

### Step 3: Pick Your First Entrypoint (10 min)

Use the **ENTRYPOINT PROMPT** at the end of PROJECT_MANAGEMENT_SYSTEM.md. Copy it and fill in:

**Template:**
```
# PROJECT MANAGEMENT TEAM SYSTEM — ENTRYPOINT

**Date:** 2026-04-11
**Input Type:** routine-update  [Choose: new-feature | scope-change | risk-alert | blocker | release-prep | milestone | routine-update | escalation]
**Input Owner:** [Your name]

---

## INPUT

[Paste your situation here]

For routine-update, something like:
"Project just kicked off. Current state:
- Team size: 5 devs, 1 QA, 1 PM
- Sprint 1 starts Monday 2026-04-14
- MVP target: 2026-06-15 (9 weeks)
- Key unknowns: exact scope (3 stories sketched), deployment target (Azure?)
- Tech stack: Python, DuckDB, Soda, Fabric
- Blockers: Requirements clarification from customer pending"

...rest of template (see PROJECT_MANAGEMENT_SYSTEM.md)
```

**Send to Claude Copilot in VS Code with this prompt:**
```
You are the Project Management Team System (see PROJECT_MANAGEMENT_TEAM_SYSTEM.md in my workspace).

Process this entrypoint:
[PASTE THE ENTRYPOINT WITH YOUR INPUT ABOVE]

Provide:
1. Summary of what changed
2. Artifacts updated (file path + brief change)
3. Proposed diffs (copy-paste ready)
4. Next steps + owners

Use evidence only from my project files (docs/, code, requirements.txt, Docker files, etc.).
```

### Step 4: Run Weekly (Every Friday EOD)

**Friday Routine (30 min):**

1. **Scrum Master** publishes Sprint Review summary
2. **Delivery Manager** publishes execution health
3. **Project Manager** updates RAID log + status report
4. **Stakeholder Comms** publishes weekly digest
5. **Documentation Maintainer** flags any stale docs

*Use the same ENTRYPOINT PROMPT, input type = "routine-update", include latest status/metrics*

---

## QUICK REFERENCE: WHICH AGENT FOR WHAT?

| Situation | Input Type | Route To |
|-----------|-----------|----------|
| "We have a new feature request" | `new-feature` | Product Owner → Backlog Curator |
| "Stakeholder wants more scope" | `scope-change` | Product Owner → Project Manager |
| "Dev team is blocked on X" | `blocker` | Scrum Master → Risk & Compliance (log issue) |
| "We found a security issue" | `risk-alert` | Risk & Compliance → Project Manager |
| "We're ready to release" | `release-prep` | Release Manager → Technical PM (readiness) |
| "Milestone date is approaching" | `milestone` | Project Manager → Delivery Manager (readiness) |
| "Weekly check-in" | `routine-update` | All agents (read-only) |
| "Critical decision needed fast" | `escalation` | Project Manager → Stakeholder Comms |

---

## KEY TEMPLATES TO COPY-PASTE

All of these are in **PROJECT_MANAGEMENT_TEAM_SYSTEM.md**. Copy them as needed:

### For Sprint Work
- **Sprint Plan** (Scrum Master section)
- **Daily Standup Summary** (Scrum Master section)
- **Sprint Review Summary** (Scrum Master section)

### For Feature/Story Work
- **User Story Template** (Product Owner section)
- **Story Dependency Graph** (Backlog Curator section)

### For Project Health
- **RAID Log** (already created in docs/RAID_LOG.md; copy entries for your risks)
- **Project Status Report** (Project Manager section)

### For Decisions & Architecture
- **ADR Template** (Technical PM section)
- **Decision Log Entry** (Decision Log file)

### For Operations
- **Runbook Template** (Documentation Maintainer section)

### For Release
- **Release Plan** (Release Manager section)
- **Release Notes** (Release Manager section)
- **Go/No-Go Decision** (Release Manager section)

---

## COMMON WORKFLOWS

### 1. Accept a New Feature Request

**Step 1: Send Entrypoint**
```
**Input Type:** new-feature
**Input:**
"New request: Customer wants SLA monitoring (track p95 latency). 
Business value: $50K ARR if implement. Scope: TBD."
```

**Step 2: System Output**
- Product Owner: Creates user story draft w/ acceptance criteria
- Backlog Curator: Refines story, identifies dependencies (does it need telemetry setup? Check RAID)
- RAID log: Updated with any new assumptions/risks

**Step 3: Your Action**
- Copy proposed story into backlog file/Jira
- Schedule refinement session if dependencies are complex

---

### 2. You Hit a Blocker / Risk Escalation

**Step 1: Send Entrypoint**
```
**Input Type:** risk-alert
**Input:**
"Risk: DuckDB integration with Soda is failing in spike. 
Soda doesn't recognize DuckDB backend. 
Impact: Blocks MVP, may need alternative tool (Postgres? Custom checks?)"
```

**Step 2: System Output**
- Risk & Compliance: Scores risk (Medium+ likely); creates mitigation plan
- Technical PM: Evaluates alternatives (ADR draft if major); recommends path forward
- RAID log: Updated with risk, mitigation owner, target close date
- Project Manager: Re-forecasts milestones if risk impacts plan

**Step 3: Your Action**
- Assign mitigation to tech lead (e.g., "Evaluate Postgres alternative by 2026-04-15")
- Monitor risk; close once mitigated or decision made

---

### 3. Weekly Status Update (Friday EOB)

**Step 1: Send Entrypoint**
```
**Input Type:** routine-update
**Input:**
"Weekly update for week ending 2026-04-11:
- Sprint 1 in progress (Sprint goal: backlog refinement, DuckDB spike)
- Velocity: 13 points (stories: auth scaffolding, data connector prototype)
- Quality: All tests passing (95% pass rate)
- Blockers: None; on track
- RAID: 2 Medium risks (scope clarity, DuckDB integration); mitigation in progress
- Decisions: Tech stack approved (Python/DuckDB/Soda); waiting on MVP scope def
- Next: Sprint review Friday; release milestone on 2026-06-15"
```

**Step 2: System Output**
- Scrum Master: Sprint review summary
- Delivery Manager: Execution health report (velocity, quality trends)
- Project Manager: Status report + RAID update
- Stakeholder Comms: Weekly digest for stakeholders (plain language summary)

**Step 3: Your Action**
- Share weekly digest with stakeholders (copy-paste from output)
- Update RAID log with any new items (paste diffs into docs/RAID_LOG.md or Jira)
- Plan next week's work based on Project Manager forecast

---

## ARTIFACTS IN YOUR WORKSPACE

**Core System File:**
- `PROJECT_MANAGEMENT_SYSTEM.md` ← **START HERE** (all 10 agent specs + templates)

**Tracking Files:**
- `docs/RAID_LOG.md` ← Track risks, assumptions, issues, dependencies (update weekly)
- `docs/DECISION_LOG.md` ← Track decisions and architecture choices (update as needed)

**Existing Project Files (used as evidence by agents):**
- `README.md` — Project overview
- `main.py`, `requirements.txt`, `Dockerfile` — Implementation
- `docker-compose.yml` — Local dev environment
- `CHANGELOG.md` — Release history
- `/docs/` folder — Architecture, deployment guides, etc.

---

## TIPS & BEST PRACTICES

✅ **DO:**
- Store artifacts in version control (Git). Docs are source of truth.
- Use the ENTRYPOINT PROMPT every time you have new info (daily = daily updates)
- Copy proposed diffs into your files; commit with a message linking to decision/issue
- Review proposed changes before committing (agents are smart but not infallible)
- Link every decision to evidence (code, ADR, or prior decision)

❌ **DON'T:**
- Invent status or timelines. If agents don't have data, they'll say "Not found in artifacts."
- Override a decision without logging the new decision in DECISION_LOG.md
- Keep duplicate documentation. If two docs contradict, escalate; use Evidence Controller logic
- Ignore RAID log items. Reviews them weekly; close or escalate.

---

## ESCALATION & GETTING HELP

**If system output is unclear:**
1. Check if the ENTRYPOINT prompt was specific enough
2. Look at the "Evidence Controller" section in ORCHESTRATION (PROJECT_MANAGEMENT_SYSTEM.md)
3. If docs conflict, system will say so; resolve per precedence (Code > ADR > Decision > Status)

**If agents keep saying "Not found in artifacts":**
- Create the missing artifact (e.g., ADRs folder, MVP scope doc)
- Add it to the workspace; re-run entrypoint

**If you're not sure what agent to use:**
- See "WHICH AGENT FOR WHAT?" table above
- Or: send entrypoint with wide scope; system will route appropriately

---

## EXAMPLE: FULL WORKFLOW (New Feature → Release)

**Week 1: Feature Request Comes In**
```
Entrypoint: Input Type = "new-feature"
Output: Story template + backlog refinement + dependencies mapped → Backlog ready for sprint
```

**Week 2-3: Sprint Execution**
```
Entrypoint: Input Type = "routine-update" (weekly Friday)
Output: Sprint review summary, delivery health, RAID update, stakeholder digest
```

**Week 4: Approaching Release**
```
Entrypoint: Input Type = "release-prep"
Output: Release plan, technical readiness checklist, go/no-go decision, runbook update
```

**Release Day: Go/No-Go**
```
Entrypoint: Input Type = "release-prep" (final check)
Output: Go/no-go decision with evidence + release notes + deploy validated
```

---

## NEXT STEPS

1. **Read** PROJECT_MANAGEMENT_SYSTEM.md (30 min) — understand the 10 agents
2. **Pick one scenario** from CommonWorkflows above
3. **Fill in the ENTRYPOINT PROMPT** with your project's actual situation
4. **Send it to Claude** (paste in VS Code or chat)
5. **Review outputs & copy diffs** into your project files
6. **Commit changes** with a decision log reference
7. **Run weekly** (Friday routine-update) to keep artifacts fresh

---

## SUPPORT

**Questions about how to use this system?**
- See PROJECT_MANAGEMENT_SYSTEM.md section for the agent you're curious about
- Check ORCHESTRATION section for how agents coordinate
- Look at templates to see expected formats

**Found a gap or bug in the system?**
- Update PROJECT_MANAGEMENT_SYSTEM.md or template
- Re-run entrypoint; system will use updated version

**Want to customize for your team?**
- Add team-specific fields to templates
- Update evidence sources (note if you use Jira instead of GitHub issues, etc.)
- Adjust cadence (e.g., daily standups instead of weekly if you're fast-moving)

---

**You're ready. Your first entrypoint awaits. 🚀**
