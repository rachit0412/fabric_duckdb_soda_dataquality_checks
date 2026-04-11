# 📚 Documentation Structure Guide

**Version:** Enterprise Standard  
**Status:** ✅ Single Source of Truth  
**Date:** April 2026  

---

## Overview

This repository follows **enterprise-standard documentation practices** with a clean, single-source-of-truth model. All documentation is consolidated into 19 authoritative files across 2 levels:

- **Root Level (7 files):** Project overview, principles, standards
- **Technical Reference (/docs, 12 files):** Domain-specific guides and specifications
- **Archive (/archive/deprecated, 73 files):** Historical documentation (preserved, not active)

---

## 📁 Repository Structure

```
.
├── 📄 README.md                           ← Start here
├── 📄 ARCHITECTURE.md                     ← System design
├── 📄 SECURITY.md                         ← Security policies
├── 📄 CONTRIBUTING.md                     ← Dev guidelines
├── 📄 CHANGELOG.md                        ← Version history
├── 📄 TROUBLESHOOTING.md                  ← Support guide
├── 📄 COMPLETION_REPORT_ALL_PHASES.md     ← Project delivery summary
│
├── 📁 /docs/                              ← Technical Reference Guides
│   ├── INDEX.md                           ← Documentation hub
│   ├── API.md                             ← REST API specification
│   ├── DATABASE.md                        ← Schema reference
│   ├── DEPLOYMENT.md                      ← Setup & deployment
│   ├── RUNBOOK.md                         ← Operations guide
│   ├── TESTING.md                         ← Test execution
│   ├── CI_CD.md                           ← Pipeline architecture
│   ├── CONNECTIONS.md                     ← Data source guide
│   ├── CHECKS.md                          ← Rules catalog
│   ├── EXECUTION.md                       ← Execution flow
│   ├── DECISION_LOG.md                    ← Architecture decisions
│   └── RAID_LOG.md                        ← Risk management
│
├── 📁 /archive/deprecated/                ← Historical files (73 docs)
│   ├── PHASE*.md                          ← Old phase reports
│   ├── IMPLEMENTATION_*.md                ← Old implementation guides
│   ├── *_COMPLETION_SUMMARY.md            ← Old completion reports
│   └── ... (all archived for reference)
│
├── backend/                               ← Backend source code
├── frontend/                              ← Frontend source code
└── tests/                                 ← Test suites

```

---

## 🎯 How to Use This Documentation

### For **First-Time Users**
1. Start: [README.md](README.md)
2. Deep dive: [docs/INDEX.md](docs/INDEX.md)
3. Deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### For **API Developers**
1. Reference: [docs/API.md](docs/API.md)
2. Database schema: [docs/DATABASE.md](docs/DATABASE.md)
3. Setup: [docs/CONNECTIONS.md](docs/CONNECTIONS.md)

### For **Operations Teams**
1. Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
2. Runbook: [docs/RUNBOOK.md](docs/RUNBOOK.md)
3. Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### For **DevOps/CI-CD**
1. Pipeline guide: [docs/CI_CD.md](docs/CI_CD.md)
2. Testing: [docs/TESTING.md](docs/TESTING.md)
3. Security: [SECURITY.md](SECURITY.md)

### For **Project Managers**
1. Completion report: [COMPLETION_REPORT_ALL_PHASES.md](COMPLETION_REPORT_ALL_PHASES.md)
2. Decisions: [docs/DECISION_LOG.md](docs/DECISION_LOG.md)
3. Risks: [docs/RAID_LOG.md](docs/RAID_LOG.md)

---

## 📊 Consolidation Summary

### What Was Reduced
| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| **Root files** | 76 | 7 | 91% ↓ |
| **Technical guides** | 20 | 12 | 40% ↓ |
| **Total active** | 96 | 19 | 80% ↓ |
| **Archived for reference** | - | 73 | Preserved |

### Consolidations Made
1. **PHASE reports** (PHASE0-6) → All archived; see [COMPLETION_REPORT_ALL_PHASES.md](COMPLETION_REPORT_ALL_PHASES.md)
2. **API references** (API_REFERENCE, API.md duplicate) → [docs/API.md](docs/API.md) only
3. **Deployment guides** (DEPLOYMENT_GUIDE.md, docs/DEPLOYMENT.md duplicate) → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) only
4. **Implementation guides** (M5_M6_IMPLEMENTATION_GUIDE, IMPLEMENTATION_M1_M6_COMPLETE) → Integrated into [docs/](docs/) guides
5. **Completion summaries** (PROJECT_KICKOFF_SUMMARY, PHASE1_COMPLETION_SUMMARY, etc.) → [COMPLETION_REPORT_ALL_PHASES.md](COMPLETION_REPORT_ALL_PHASES.md)

---

## ✅ Enterprise Standards Applied

| Standard | Implementation |
|----------|-----------------|
| **Single Source of Truth** | Each domain has ONE authoritative file |
| **Lean Organization** | No duplicate files (79% reduction) |
| **Clear Hierarchy** | Root = project, /docs = technical |
| **Historical Preservation** | 73 deprecated files archived, not deleted |
| **Maintainability** | Clear separation of concerns |
| **Discoverability** | README → INDEX → specific guides |
| **Change Management** | DECISION_LOG and RAID_LOG tracked |
| **Version History** | CHANGELOG.md maintained |

---

## 📌 File Purposes (Quick Reference)

### Root Level (7 Files)

| File | Purpose | Update Frequency |
|------|---------|------------------|
| **README.md** | Project overview, quick start, main entry point | On major releases |
| **ARCHITECTURE.md** | System design, components, data flow | On design changes |
| **SECURITY.md** | Security features, hardening, compliance | On security updates |
| **CONTRIBUTING.md** | Development guidelines, code standards | On policy changes |
| **CHANGELOG.md** | Version history and release notes | On every release |
| **TROUBLESHOOTING.md** | Common issues and solutions | As issues arise |
| **COMPLETION_REPORT_ALL_PHASES.md** | Full M1-M6 delivery summary | Final reference |

### Technical Guides (/docs - 12 Files)

| File | Purpose | Audience | Update Frequency |
|------|---------|----------|------------------|
| **INDEX.md** | Documentation hub and navigation | Everyone | Per new docs |
| **API.md** | REST API specification, 22 endpoints | Backend developers | On API changes |
| **DATABASE.md** | Schema, ER diagram, query guide | Database engineers | On schema changes |
| **DEPLOYMENT.md** | Setup for local, Docker, cloud | DevOps/ops | On deployment changes |
| **RUNBOOK.md** | Incident response, SOP, troubleshooting | Operations | As needed |
| **TESTING.md** | Test execution, coverage guide | QA/developers | On test updates |
| **CI_CD.md** | GitHub Actions pipeline architecture | DevOps | On workflow changes |
| **CONNECTIONS.md** | Data source registration guide | Data engineers | On connector changes |
| **CHECKS.md** | 12-rule catalog, configuration | Data engineers | On rule changes |
| **EXECUTION.md** | Check execution flow, result aggregation | Backend developers | On logic changes |
| **DECISION_LOG.md** | ADR-001+ architecture decisions | Architects | On new decisions |
| **RAID_LOG.md** | Risks, assumptions, issues, dependencies | Project managers | On status changes |

---

## 🔄 Documentation Maintenance Policy

### Adding New Documentation
1. **Is it redundant?** → Archive old versions, keep one
2. **Does it belong in /docs/?** → Technical guides go in /docs/
3. **Should it be at root?** → Only if cross-cutting concern (security, compliance)
4. **Update INDEX.md** → Add links to [docs/INDEX.md](docs/INDEX.md)

### Removing Documentation
1. **Is it obsolete?** → Move to /archive/deprecated/
2. **Is it redundant?** → Consolidate into single authoritative file
3. **Preserve history** → Never delete; just archive
4. **Update README.md** → Remove references from active docs

### Versioning
- **CHANGELOG.md** → Version history
- **DECISION_LOG.md** → Architecture decisions (ADR-001+)
- **RAID_LOG.md** → Tracking live risks/issues

---

## 📚 Archive Access

**Historical documentation is available in:**  
[/archive/deprecated/](archive/deprecated/)

**Contents (73 files):**
- PHASE0_REPO_TRIAGE_REPORT.md, PHASE1_*, PHASE2_*, etc.
- IMPLEMENTATION_M1_M6_COMPLETE.md, M5_M6_IMPLEMENTATION_GUIDE.md
- PROJECT_KICKOFF_SUMMARY.md, PHASE1_COMPLETION_SUMMARY.md
- All early API references, deployment guides, and implementation notes

**Why preserved?**
- Historical reference for future projects
- Audit trail of evolution
- Useful for new team members to understand journey
- GitHub preserves all commits; archive ensures discoverability

---

## 🎓 Training Path for New Team Members

### Week 1: Onboarding
1. **Day 1:** [README.md](README.md) + [docs/INDEX.md](docs/INDEX.md)
2. **Day 2:** [ARCHITECTURE.md](ARCHITECTURE.md) + [docs/DATABASE.md](docs/DATABASE.md)
3. **Day 3:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) + [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Day 4:** Role-specific guides below
5. **Day 5:** [docs/RUNBOOK.md](docs/RUNBOOK.md) + Q&A

### Backend Developer
- [docs/API.md](docs/API.md) - API contract
- [docs/EXECUTION.md](docs/EXECUTION.md) - Execution logic
- [docs/TESTING.md](docs/TESTING.md) - Test requirements

### Data Engineer
- [docs/CONNECTIONS.md](docs/CONNECTIONS.md) - Data sources
- [docs/CHECKS.md](docs/CHECKS.md) - 12-rule catalog
- [docs/DATABASE.md](docs/DATABASE.md) - Schema

### DevOps/SRE
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Setup
- [docs/CI_CD.md](docs/CI_CD.md) - Pipelines
- [docs/RUNBOOK.md](docs/RUNBOOK.md) - Operations

---

## ✨ Key Metrics

- **Documentation files (active):** 19
- **Total project documentation:** 11,260+ lines
- **Automated tests:** 63+ (82% coverage)
- **API endpoints:** 22 (fully documented)
- **File consolidation:** 79% reduction
- **Historical archive:** 73 files (preserved)

---

## 🚀 Next Steps

1. **Read:** Start with [README.md](README.md) and [docs/INDEX.md](docs/INDEX.md)
2. **Deploy:** Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. **Test:** Run `pytest tests/ --cov=backend/src` (see [docs/TESTING.md](docs/TESTING.md))
4. **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
5. **Support:** Refer to [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for issues

---

**Status:** ✅ **ENTERPRISE STANDARD ACHIEVED**  
**Last Updated:** April 2026  
**Maintainer:** Architecture Team
