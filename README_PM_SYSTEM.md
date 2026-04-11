# PROJECT MANAGEMENT TEAM SYSTEM — INDEX & README

*Your autonomous virtual project management team is ready. Use this index to navigate.*

---

## 📋 WHAT IS THIS?

You now have **10 autonomous AI-powered agents** managing your project end-to-end:

1. **Product Owner** — Requirements & scope
2. **Scrum Master** — Ceremonies & flow
3. **Project Manager** — Plan & RAID log
4. **Delivery Manager** — Execution health
5. **Technical Program Manager** — Architecture & integration
6. **Backlog Curator** — Backlog refinement
7. **Risk & Compliance** — RAID management & audit
8. **Documentation Maintainer** — Doc truth & freshness
9. **Stakeholder Comms** — Weekly updates & decisions
10. **Release Manager** — Release readiness & cutover

**Core Value:** Evidence-based, audit-ready, docs-as-code project management with **zero meetings** and **full traceability**.

---

## 🗂️ FILE STRUCTURE

### START HERE
- **[PM_SYSTEM_ACTIVATION.md](PM_SYSTEM_ACTIVATION.md)** ← **YOU ARE HERE** — Overview, getting started, activation guide
- **[QUICKSTART_PM_SYSTEM.md](QUICKSTART_PM_SYSTEM.md)** ← **READ NEXT** — 5-minute intro with workflows & templates

### FULL DOCUMENTATION
- **[PROJECT_MANAGEMENT_TEAM_SYSTEM.md](PROJECT_MANAGEMENT_TEAM_SYSTEM.md)** ← **REFERENCE** — Complete specs for all 10 agents, all templates, orchestration logic

### TRACKING FILES (Use These Weekly)
- **[docs/RAID_LOG.md](docs/RAID_LOG.md)** — Risk, Assumption, Issue, Dependency log (UPDATE WEEKLY)
- **[docs/DECISION_LOG.md](docs/DECISION_LOG.md)** — Decision record for approvals & architecture choices (UPDATE AS NEEDED)

### TEMPLATES
- **[docs/ADRs/ADR-TEMPLATE.md](docs/ADRs/ADR-TEMPLATE.md)** — Architecture Decision Record template (COPY to create ADR-001.md, etc.)

---

## ⚡ QUICK START (DO THIS NOW)

### 1. Read This (You're doing it now ✓)

### 2. Read the Quick Start (5 min)
Open [QUICKSTART_PM_SYSTEM.md](QUICKSTART_PM_SYSTEM.md) and skim the "WHAT IS THIS" and "COMMON WORKFLOWS" sections.

### 3. Fill Out Your First Entrypoint (10 min)
```
Copy this template from PROJECT_MANAGEMENT_SYSTEM.md → "ENTRYPOINT PROMPT" section
↓
Fill in your project's current situation
↓
Paste into a Claude chat: "You are the Project Management Team System..."
↓
Copy proposed diffs into your project files
↓
Commit to Git with a decision log reference
```

**First Input Example:**
```
Input Type: routine-update

Week 1 kickoff. Current state:
- Team: 5 engineers
- Sprint starts Monday
- MVP target: 9 weeks
- Tech stack: Python, DuckDB, Soda
- Key blockers: Scope clarity pending from customer
- Questions: Should we do spike on DuckDB-Soda integration first?
```

### 4. Maintain Weekly (Every Friday)
Same entrypoint template, input = "routine-update", your current status.  
System responds with proposed updates to RAID log, decision log, status reports.

---

## 🎯 WHAT EACH AGENT DOES

| Agent | Mission | Key Outputs | Use When |
|-------|---------|------------|----------|
| **Product Owner** | Scope & requirements | Stories, AC, scope analysis | Feature requests, prioritization |
| **Scrum Master** | Ceremonies & flow | Sprint plans, reviews, retros | Weekly standups, sprint work |
| **Project Manager** | Plan & RAID | Status reports, milestone go/no-go | Weekly status, milestone checks |
| **Delivery Manager** | Execution health | Health reports, cycle time, quality trends | Weekly metrics, bottleneck discovery |
| **Tech PM** | Architecture & integration | ADRs, tech readiness checklists | Major tech decisions, integration |
| **Backlog Curator** | Backlog health | Refined stories, dependencies, ready queue | Story refinement, backlog grooming |
| **Risk & Compliance** | RAID & audit | Risk assessments, compliance checklists | Risk identification, escalation |
| **Documentation Maintainer** | Doc truth | Audit reports, fresh docs, conflict resolution | Weekly doc review, drift detection |
| **Stakeholder Comms** | Updates & decisions | Weekly digests, decision requests | Stakeholder updates, approvals |
| **Release Manager** | Release readiness | Release plans, go/no-go decisions | Release planning, cutover verification |

---

## 📍 WHERE TO FIND THINGS

### If you need...
- **A story template** → PROJECT_MANAGEMENT_TEAM_SYSTEM.md, section "Product Owner Agent"
- **A sprint plan template** → PROJECT_MANAGEMENT_TEAM_SYSTEM.md, section "Scrum Master Agent"
- **A status report template** → PROJECT_MANAGEMENT_TEAM_SYSTEM.md, section "Project Manager Agent"
- **How to run a release** → PROJECT_MANAGEMENT_TEAM_SYSTEM.md, section "Release Manager Agent"
- **An ADR template** → docs/ADRs/ADR-TEMPLATE.md (copy and fill in)
- **How to escalate a risk** → docs/RAID_LOG.md (add entry) or QUICKSTART_PM_SYSTEM.md (workflow)
- **How to approve a decision** → docs/DECISION_LOG.md (add entry) then ENTRYPOINT

### If you want to...
- **Track a new risk** → Add to docs/RAID_LOG.md (see template)
- **Record a decision** → Add to docs/DECISION_LOG.md (see template)
- **Create an ADR** → Copy docs/ADRs/ADR-TEMPLATE.md to ADR-001.md and fill in
- **Update the team on status** → Use ENTRYPOINT with input type "routine-update"
- **Report a blocker** → Use ENTRYPOINT with input type "blocker"
- **Request a new feature** → Use ENTRYPOINT with input type "new-feature"
- **Alert on risk/escalation** → Use ENTRYPOINT with input type "risk-alert" or "escalation"
- **Prepare for release** → Use ENTRYPOINT with input type "release-prep"

---

## 🔄 THE WEEKLY ROTATION

**Every Friday EOD:**
1. Scrum Master: Run sprint review → outputs sprint summary
2. Delivery Manager: Collect metrics → outputs health report
3. Project Manager: Update RAID + plan → outputs status report
4. Stakeholder Comms: Package all for leaders → outputs weekly digest
5. Documentation Maintainer: Scan for staleness/conflicts → flags issues

**Total time: 30-45 minutes (mostly async; Claude does heavy lifting)**

**How:** Send ENTRYPOINT with `Input Type: routine-update` + this week's metrics

---

## 🎓 LEARN THE SYSTEM (IN ORDER)

1. **This file (5 min)** — Understand what exists
2. **[QUICKSTART_PM_SYSTEM.md](QUICKSTART_PM_SYSTEM.md) (10 min)** — Learn workflows & templates
3. **[PROJECT_MANAGEMENT_SYSTEM.md](PROJECT_MANAGEMENT_SYSTEM.md) (30 min reference)** — Deep dive on your role's agent(s)
4. **[docs/RAID_LOG.md](docs/RAID_LOG.md)** — See example RAID entries; add yours
5. **[docs/DECISION_LOG.md](docs/DECISION_LOG.md)** — See example decisions; record yours
6. **[docs/ADRs/ADR-TEMPLATE.md](docs/ADRs/ADR-TEMPLATE.md)** — Create ADRs for architectural decisions

---

## ✨ KEY PRINCIPLES

### Principle 1: Evidence-Only
All statements backed by project artifacts (code, docs, decisions).  
If data missing: **"Not found in artifacts"** (no invention).

### Principle 2: Docs-as-Code
Docs live in Git, versioned, single source of truth.  
Status & configuration flow from docs, not vice versa.

### Principle 3: One Source of Truth
Conflicts resolved via precedence: **Code > ADR > Decision Log > Status Reports**.  
System flags conflicts automatically.

### Principle 4: Audit-Ready
All decisions, risks, and status changes traceable with evidence + owner + date.  
Perfect for compliance review or post-mortems.

### Principle 5: Actionable
Every agent output includes **proposed diffs** (copy-paste ready, not just suggestions).

---

## 🚀 ACTIVATION CHECKLIST

- [ ] Read this file (PM_SYSTEM_ACTIVATION.md)
- [ ] Read QUICKSTART_PM_SYSTEM.md (5 min)
- [ ] Understand the 10 agents (see table above)
- [ ] Fill in your first ENTRYPOINT PROMPT (see QUICKSTART or PROJECT_MANAGEMENT_SYSTEM.md)
- [ ] Send ENTRYPOINT to Claude ("You are the Project Management Team System...")
- [ ] Review proposed outputs & copy diffs into project files
- [ ] Commit changes to Git
- [ ] Schedule weekly Friday ENTRYPOINT (routine-update) on your calendar
- [ ] Share RAID_LOG.md and DECISION_LOG.md with team (add their own entries)
- [ ] Share PROJECT_MANAGEMENT_SYSTEM.md with stakeholders who need to understand project governance

---

## 💡 PRO TIPS

✅ **DO:**
- Use ENTRYPOINT template every time (consistency = AI works better)
- Copy proposed diffs into your files; don't manually rewrite
- Commit with a reference (e.g., "Closes #42, implements D-001")
- Review RAID log weekly (close mitigated risks; escalate new ones)
- Share weekly digest with stakeholders (copy-paste from Stakeholder Comms output)
- Create ADRs for major tech decisions (link from PROJECT_MANAGEMENT_SYSTEM.md)

❌ **DON'T:**
- Invent status/timelines (system will say "Not found" if data missing)
- Override a decision without logging in DECISION_LOG.md
- Keep duplicate docs (system will flag; resolve with Evidence Controller logic)
- Ignore RAID items (review weekly; close or escalate)
- Skip linking decisions to evidence (every ADR/decision should cite code/docs/PRs)

---

## ❓ FAQ

**Q: Do I have to fill in EVERY field in the templates?**  
A: For RAID and DECISION entries, yes (these create audit trail). For other templates, no—fill in what's relevant and delete unused sections.

**Q: What if I don't have all the evidence yet?**  
A: System will say "Not found in artifacts—propose creating [missing doc]". Create it, then re-run entrypoint.

**Q: Can I customize the templates?**  
A: Yes! Update them in PROJECT_MANAGEMENT_SYSTEM.md or create team-specific versions. System adapts.

**Q: How often should I run the ENTRYPOINT?**  
A: Minimum = weekly (Friday). Recommended = daily for active projects. Can be ad-hoc for escalations.

**Q: Is this a replacement for Jira/Azure DevOps?**  
A: No. This system is *governance* layer (decisions, RAID, docs, status). You still track tasks/stories in your PM tool. System can read Jira/ADO exports if provided.

**Q: What if I have a Jira / Azure DevOps instance?**  
A: Export your backlog/sprints and provide to system; it will cite them as evidence just like it does for markdown files.

**Q: Can multiple teams use this?**  
A: Yes. Each team gets its own RAID_LOG.md and DECISION_LOG.md in their folder. Tech PM agent coordinates cross-team dependencies.

**Q: What's the learning curve?**  
A: ~30 minutes. Read QUICKSTART → send first ENTRYPOINT → see outputs → copy diffs. Then it's routine Friday updates.

---

## 📞 SUPPORT

**I'm confused about which agent to use** → See "WHAT EACH AGENT DOES" table above + check QUICKSTART_PM_SYSTEM.md "QUICK REFERENCE" section

**I don't know what to put in the ENTRYPOINT** → See QUICKSTART_PM_SYSTEM.md "COMMON WORKFLOWS" section for examples

**The system says "Not found in artifacts"** → Create the missing doc/artifact; re-run entrypoint

**I want to customize templates** → Update them in PROJECT_MANAGEMENT_SYSTEM.md or create team versions

**I think there's a bug** → Check ORCHESTRATION / CONFLICT RESOLUTION in PROJECT_MANAGEMENT_SYSTEM.md or create an issue in your repo's GitHub Issues

---

## 🎯 THREE MAIN FILES TO REMEMBER

1. **PROJECT_MANAGEMENT_SYSTEM.md** ← Full reference (all specs, all templates)
2. **QUICKSTART_PM_SYSTEM.md** ← Quick guide (workflows, common questions)
3. **docs/RAID_LOG.md** + **docs/DECISION_LOG.md** ← Tracking (update weekly)

---

## ✅ YOU'RE READY

Your project now has autonomous governance. The system is configured, templates are ready, tracking files are initialized.

**Next step:** Open [QUICKSTART_PM_SYSTEM.md](QUICKSTART_PM_SYSTEM.md) and **send your first ENTRYPOINT to Claude.**

---

**Welcome to autonomous, evidence-based project management. 🚀**

---

**Last Updated:** 2026-04-11  
**Version:** 1.0  
**Status:** Active & Ready to Use
