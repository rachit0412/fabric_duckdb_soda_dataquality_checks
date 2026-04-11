# PROJECT MANAGEMENT TEAM SYSTEM — ACTIVATION GUIDE

**Date Created:** 2026-04-11  
**Status:** Ready for Immediate Activation  
**Owner:** Project Management Framework  

---

## ✅ SYSTEM DEPLOYED — YOU NOW HAVE 10 AUTONOMOUS AGENTS

Your project now has a **virtual project management team** (10 agents/skills) that work continuously to keep your project artifacts in sync, evidence-based, and audit-ready.

**What was created for you:**

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `PROJECT_MANAGEMENT_SYSTEM.md` | **Master system doc** — Full specs for all 10 agents, templates, orchestration | Reference / weekly review |
| `QUICKSTART_PM_SYSTEM.md` | **Getting started** — Quick reference, workflows, tips | Read first! |
| `docs/RAID_LOG.md` | **Risk tracking** — Risks, assumptions, issues, dependencies | Weekly update |
| `docs/DECISION_LOG.md` | **Decision record** — Decisions pending & approved | As needed |
| `docs/ADRs/ADR-TEMPLATE.md` | **Architecture decision template** — Copy to create ADR-001.md, ADR-002.md, etc. | Per major decision |

---

## 🚀 START HERE (5 MINUTES)

### Step 1: Read the Quick Start
Open [QUICKSTART_PM_SYSTEM.md] in your workspace right now. It's a 5-minute overview with common workflows and templates.

### Step 2: Understand the 10 Agents
Each agent has a specific mission. See the table below.

### Step 3: Send Your First Entrypoint
Copy the **ENTRYPOINT PROMPT** from [PROJECT_MANAGEMENT_SYSTEM.md] (at the end, section "Entrypoint Prompt"), fill it in with your project's actual situation, and send it to Claude Copilot.

**Example first input:**
```
Input Type: routine-update

We just kicked off the fabric_duckdb_soda_dataquality_checks project. 

Current state:
- Team: 5 engineers, 1 QA, 1 PM
- Sprint 1 starts Monday 2026-04-14
- MVP release target: 2026-06-15 (9 weeks away)
- Key scope: Data quality checks via Soda on DuckDB
- Blockers: Customer hasn't clarified exact scope; DuckDB-Soda integration needs spike
- Tech stack: Python, Soda SaaS SDK, DuckDB, Fabric, FastAPI

What should I focus on first? Where are the risks?
```

**System will respond with:**
- What to prioritize (backlog, risks, decisions)
- Artifacts to update (with copy-paste diffs)
- Next steps + owners

---

## 📋 YOUR 10-AGENT TEAM

The system includes autonomous agents for these roles:

### 1. **Product Owner Agent** 🎯
**Mission:** Maintain scope, requirements, business value alignment  
**Key Outputs:** User stories with AC, scope change analysis, backlog prioritization  
**When to Use:** New feature requests, scope change requests, prioritization questions  
**Template:** User Story Template (in PROJECT_MANAGEMENT_SYSTEM.md)

### 2. **Scrum Master Agent** 🔄
**Mission:** Run ceremonies, remove blockers, maintain sprint health  
**Key Outputs:** Sprint plans, daily standup summaries, sprint reviews, retro action items  
**When to Use:** Sprint planning, daily standups, sprint reviews, blocker escalation  
**Template:** Sprint Plan, Daily Standup, Sprint Review (in PROJECT_MANAGEMENT_SYSTEM.md)

### 3. **Project Manager Agent** 📅
**Mission:** Maintain master timeline, track milestones, manage RAID log, health declarations  
**Key Outputs:** Master plan updates, RAID log, weekly status reports, milestone go/no-go  
**When to Use:** Weekly status updates, milestone checks, plan deviations, escalations  
**Template:** RAID Log, Weekly Status Report (in PROJECT_MANAGEMENT_SYSTEM.md)

### 4. **Delivery Manager Agent** ⚡
**Mission:** Track execution health (throughput, quality, cycle time, flow)  
**Key Outputs:** Execution health reports, cycle time dashboards, quality trends, bottleneck alerts  
**When to Use:** Weekly health checks, quality trend analysis, flow bottleneck investigation  
**Template:** Execution Health Report (in PROJECT_MANAGEMENT_SYSTEM.md)

### 5. **Technical Program Manager Agent** 🏗️
**Mission:** Manage architecture, cross-team integration, tech decisions, release tech readiness  
**Key Outputs:** ADR review/approval, integration designs, tech readiness checklists, tech debt assessment  
**When to Use:** Major tech decisions, architecture alignment, cross-team dependencies, release verification  
**Template:** ADR Template, Technical Readiness Checklist (in PROJECT_MANAGEMENT_SYSTEM.md)

### 6. **Backlog Curator Agent** 📚
**Mission:** Keep backlog refined, prioritized, dependencies clear, ready-for-sprint queue healthy  
**Key Outputs:** Refined backlog, dependency maps, ready-for-sprint queue, refinement metrics  
**When to Use:** Backlog refinement, story clarity, dependency discovery, ready-for-sprint preparation  
**Template:** Story Template, Dependency Map (in PROJECT_MANAGEMENT_SYSTEM.md)

### 7. **Risk & Compliance Agent** 🛡️
**Mission:** Identify/track/mitigate risks; maintain compliance evidence; prepare audit artifacts  
**Key Outputs:** Risk assessments, mitigation plans, compliance checklists, audit trails  
**When to Use:** Risk identification, escalation, compliance questions, audit preparation  
**Template:** Risk Mitigation Plan, Compliance Checklist (in PROJECT_MANAGEMENT_SYSTEM.md)

### 8. **Documentation Maintainer Agent** 📖
**Mission:** Keep docs accurate, fresh, consistent; enforce docs-as-code discipline  
**Key Outputs:** Updated documentation, audit reports, broken links fixes, runbook updates  
**When to Use:** Documentation drift detection, conflict resolution, doc quality checks  
**Template:** Runbook Template, Documentation Audit Report (in PROJECT_MANAGEMENT_SYSTEM.md)

### 9. **Stakeholder Comms Agent** 📢
**Mission:** Communicate project health, decisions, blockers to stakeholders  
**Key Outputs:** Weekly digests, decision requests, milestone announcements, escalation alerts  
**When to Use:** Weekly stakeholder updates, decision approvals, milestone announcements  
**Template:** Weekly Digest, Decision Request (in PROJECT_MANAGEMENT_SYSTEM.md)

### 10. **Release Manager Agent** 🚢
**Mission:** Coordinate release planning, verify readiness, manage cutover, produce release artifacts  
**Key Outputs:** Release plans, release notes, go/no-go decisions, deployment checklists  
**When to Use:** Release planning, readiness verification, go/no-go decision, post-release validation  
**Template:** Release Plan, Release Notes, Go/No-Go Decision (in PROJECT_MANAGEMENT_SYSTEM.md)

---

## 🎯 HOW TO USE (Daily/Weekly)

### Daily (Optional, If You Want Real-Time Updates)
```
Input Type: routine-update
Input: Current blockers, velocity so far, any new risks/decisions this morning
System: Updated RAID, status snapshot, blockers escalation if needed
```

### Weekly (Recommended Minimum — Friday EOD)
```
Input Type: routine-update
Input: Sprint review summary, metrics (velocity, quality, deployment), current risks, decisions pending
System: 
  - Sprint review summary
  - Execution health report
  - RAID log updates
  - Weekly stakeholder digest
  - Next week forecast
```

### Per Major Event
```
Input Type: new-feature / scope-change / risk-alert / blocker / release-prep / milestone / escalation
Input: [Details about the event]
System: Routed to appropriate agent(s), artifacts updated, next steps
```

---

## 📂 ARTIFACT FILES (WHERE THINGS LIVE)

**In Your Workspace:**
```
/
├── PROJECT_MANAGEMENT_TEAM_SYSTEM.md ← MAIN FILE (all agent specs + templates)
├── QUICKSTART_PM_SYSTEM.md ← START HERE (5-min intro)
├── README.md ← Project overview (existing)
├── main.py, requirements.txt, Dockerfile ← Code (evidence source)
├── docker-compose.yml ← Dev environment (evidence source)
├── CHANGELOG.md ← Release history (existing)
├── docs/
│   ├── RAID_LOG.md ← Risk/assumption/issue/dependency tracking (UPDATE WEEKLY)
│   ├── DECISION_LOG.md ← Decisions & architecture (UPDATE AS NEEDED)
│   ├── ARCHITECTURE*.md ← Architecture docs (existing; evidence source)
│   ├── ADRs/
│   │   └── ADR-TEMPLATE.md ← Copy to create ADR-001.md, ADR-002.md, etc.
│   ├── (runbooks, deployment guides, etc.) ← Evidence sources
```

**Evidence sources the agents will read:**
- Code (main.py, requirements.txt, Dockerfile, docker-compose.yml)
- Architecture docs (ARCHITECTURE*.md, API_REFERENCE.md)
- RAID_LOG.md, DECISION_LOG.md
- ADRs (if you create them)
- Deployment procedures (runbooks)
- CHANGELOG.md
- Any GitHub issues, PRs, or project board data

---

## 🔗 THE ENTRYPOINT PROMPT (HOW TO INVOKE THE SYSTEM)

**Every time you have an update, use this:**

1. **Open PROJECT_MANAGEMENT_SYSTEM.md**
2. **Go to section: "ENTRYPOINT PROMPT"** (at the end)
3. **Copy the template**
4. **Fill in:**
   - `**Date:**` today's date
   - `**Input Type:**` Choose one: new-feature | scope-change | risk-alert | blocker | release-prep | milestone | routine-update | escalation
   - `**Input Owner:**` Your name
   - `**INPUT:**` Paste or describe your situation (1-2 paragraphs)

5. **Create a chat message to Claude in VS Code:**
   ```
   You are the Project Management Team System (see PROJECT_MANAGEMENT_TEAM_SYSTEM.md in my workspace).

   Process this entrypoint:
   [PASTE YOUR FILLED ENTRYPOINT HERE]

   Provide:
   1. Summary of what's changed/decided
   2. Artifacts updated (file path + brief change)
   3. Proposed diffs (ready to copy-paste)
   4. Next steps + owners + due dates

   Use ONLY evidence from my project files (docs/, code, requirements.txt, Docker files, RAID_LOG.md, DECISION_LOG.md, ADRs, etc.).
   If data is missing: "Not found in artifacts" — don't guess.
   ```

6. **Copy the proposed diffs** into your project files
7. **Commit with message:** Links to the decision log entry or issue

---

## ⚡ QUICK EXAMPLES

### Example 1: New Feature Request
```
Input Type: new-feature
Input:
"Stakeholder request: Add data profiling feature (min/max/cardinality for columns). 
Business value: Help customers understand their data before QC.
Rough scope: 2-3 engineer-weeks. 
Dependencies: Need data connector (DB schema analysis) first.
When needed: Nice-to-have for v2 (not MVP)"
```

**System Response:**
- Product Owner: Creates story template with AC
- Backlog Curator: Identifies dependency on data connector; flags as blocker
- RAID log: Logs dependency "Data connector required by 2026-04-25"
- Project Manager: Assesses impact (low, since its v2; no milestone impact)

**Your Action:** Copy story into backlog, assign dependency owner

---

### Example 2: Critical Risk
```
Input Type: risk-alert
Input:
"CRITICAL: DuckDB-Soda integration failing. Soda queries DuckDB table 
but returns zero results even though data loads successfully.
This blocks entire data QC pipeline. Impact: MVP at risk.
Need decision by tomorrow EOD: Continue with DuckDB (debug)? Or pivot to Postgres?"
```

**System Response:**
- Risk & Compliance: Scores as HIGH (near-certain, MVP-blocking impact)
- Tech PM: Creates ADR draft or decision log entry with options (debug vs pivot)
- Project Manager: Re-forecasts milestone; escalates to stakeholders
- RAID log: Logs as Issue-001 with hourly resolution target
- Stakeholder Comms: Sends escalation alert to exec sponsor

**Your Action:** Assign debug to tech lead; track mitigation; make decision by EOD

---

### Example 3: Weekly Status (Most Common)
```
Input Type: routine-update
Input:
"Weekly status week ending 2026-04-11:
- Sprint 1: On track. Completed 13 story points (auth scaffolding, data connector prototype).
- Quality: 95% test pass rate. No critical bugs.
- Blockers: None currently open.
- RAID: Scope clarity in progress (PO clarifying MVP requirements). DuckDB-Soda spike underway (results by 2026-04-15).
- Next week: Sprint review Friday; start Sprint 2 Monday if milestone on track.
- Decisions pending: Tech stack approval (waiting stakeholder sign-off), MVP scope definition."
```

**System Response:**
- Scrum Master: Sprint review summary template
- Delivery Manager: Health report (velocity trending, quality stable, cycle time good)
- Project Manager: Status report + RAID log updates
- Stakeholder Comms: Weekly digest for leadership (plain language, 1-page)

**Your Action:** Share digest with stakeholders; update RAID/decision logs; review next week forecast

---

## 🔑 KEY PRINCIPLES

### 1. Evidence-Only Reasoning
The system **only cites facts from your project artifacts** (code, docs, decisions, status reports).  
If something is not documented: **"Not found in artifacts."**  
No invented timelines, risks, or status. This ensures audit trail + accuracy.

### 2. Docs-as-Code
Documentation **lives in Git**, is versioned, and is the source of truth.  
Configuration, status, and decisions flow **from docs**, not vice versa.

### 3. One Source of Truth
If two docs contradict (e.g., ARCHITECTURE.md says "Auth via JWT" but API_REFERENCE.md says "API key"):  
- System flags conflict
- Evidence Controller applies precedence: **Code > ADR > Decision Log > Status Report**
- Winner is source of truth; others updated to align

### 4. Actionable Outputs
Every agent produces **proposed diffs** (copy-paste ready), not vague recommendations.  
Every decision is **traceable** (linked to evidence, owner, date).

### 5. Audit-Ready
All work is logged for compliance, post-mortem, and external audit:
- RAID log (risk decisions)
- DECISION_LOG.md (architecture, scope, releases)
- CHANGELOG.md (what shipped, when)
- Runbooks & procedures (ops evidence)

---

## 🏁 GET STARTED NOW

### Right Now (5 min)
1. [ ] Open `QUICKSTART_PM_SYSTEM.md` and read it
2. [ ] Understand the 10 agents (see table above)

### Today (30 min)
1. [ ] Read `PROJECT_MANAGEMENT_SYSTEM.md` sections for agents relevant to YOUR role
2. [ ] Fill in your first ENTRYPOINT PROMPT
3. [ ] Send to Claude; review outputs
4. [ ] Copy proposed diffs into your project files

### This Week (ongoing)
1. [ ] Use ENTRYPOINT PROMPT every Friday for weekly status
2. [ ] Log decisions in `docs/DECISION_LOG.md`
3. [ ] Track risks in `docs/RAID_LOG.md`
4. [ ] Create ADRs (`docs/ADRs/ADR-001.md`, etc.) for major tech decisions

### Ongoing (weekly/daily)
1. [ ] Maintain artifacts (diffs from system outputs)
2. [ ] Weekly ENTRYPOINT PROMPT (Friday routine-update)
3. [ ] Review RAID log (weekly)
4. [ ] Trust system to keep project healthy

---

## 📞 NEED HELP?

| Question | Answer |
|----------|--------|
| **Where's the full system?** | `PROJECT_MANAGEMENT_TEAM_SYSTEM.md` — everything is there |
| **What's the quick intro?** | `QUICKSTART_PM_SYSTEM.md` — 5-minute overview |
| **How do I report a risk?** | Use ENTRYPOINT with `Input Type: risk-alert`; system updates `docs/RAID_LOG.md` |
| **How do I make a decision?** | Use ENTRYPOINT with `Input Type: escalation` or just fill in `docs/DECISION_LOG.md` directly |
| **How do I track architecture decisions?** | Create `docs/ADRs/ADR-001.md` (copy template from `docs/ADRs/ADR-TEMPLATE.md`) |
| **If system says "Not found in artifacts"?** | Create the missing doc/artifact; re-run entrypoint |
| **Can I customize templates?** | Yes! Update them in `PROJECT_MANAGEMENT_SYSTEM.md` or your project files |

---

## 🎓 TRAINING MATERIALS (IN ORDER)

1. **This file** (you are here) ← Overview + activation
2. **`QUICKSTART_PM_SYSTEM.md`** ← 5-min intro + common workflows
3. **`PROJECT_MANAGEMENT_SYSTEM.md`** ← Full specs for all 10 agents + templates
4. **`docs/RAID_LOG.md`** ← Example RAID entries (add your risks here)
5. **`docs/DECISION_LOG.md`** ← Example decisions (add your decisions here)
6. **`docs/ADRs/ADR-TEMPLATE.md`** ← Copy to create ADR-001.md for major tech decisions

---

## ✨ WHAT YOU GET

By using this system, you'll have:

✅ **Single source of truth** for project status (diffs git, reviewed, versioned)  
✅ **Audit trail** of all decisions (with evidence, dates, approvals)  
✅ **Risk visibility** (RAID log updated weekly; escalations automatic)  
✅ **Clear dependencies** (between stories, teams, approvals)  
✅ **Reduced meetings** (async updates replace status meetings)  
✅ **Faster decisions** (options, trade-offs, evidence pre-prepared)  
✅ **Better onboarding** (new team members read the docs, not listen to someone's brain)  
✅ **Release confidence** (go/no-go based on evidence, not feeling)  
✅ **Post-mortems** (root causes traced back to decisions/risks)  

---

## 🚀 NEXT STEP

**Open `QUICKSTART_PM_SYSTEM.md` right now.**  
Read it (5 minutes).  
Send your first ENTRYPOINT to Claude.  
Watch the system organize your project. ✨

---

**Your virtual PM team is ready to go. Welcome aboard! 🎉**
