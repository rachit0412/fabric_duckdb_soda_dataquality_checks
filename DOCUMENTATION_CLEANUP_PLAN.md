# 📋 Documentation Cleanup Plan

**Status:** Ready for Approval  
**Date:** 2026-04-11  
**Total Root MD Files:** 67  
**Target:** Keep 9 core docs; consolidate 35; archive/remove 23

---

## Overview

**Goal:** Reduce documentation clutter from 67 root-level markdown files → 9 canonical docs + organized `/docs/` folder.

**Benefits:**
- ✅ Faster onboarding (clear entry points)
- ✅ Less maintenance (single source of truth)
- ✅ Reduced confusion (no duplicate/conflicting info)
- ✅ Professional repo appearance

---

## 🟢 TIER 1: KEEP (Core Docs - 9 files)

These are the canonical source of truth for each domain:

| File | Purpose | Keep As-Is? |
|------|---------|---|
| **README.md** | Project overview, quick start, architecture | ✅ Yes (already compacted) |
| **ARCHITECTURE.md** | System design, components, data flow | ✅ Yes (already consolidated) |
| **DEPLOYMENT_GUIDE.md** | Production deployment, Docker, config | ⚠️ UPDATE (merge MVP guides) |
| **API_REFERENCE.md** | REST API endpoints, request/response | ⚠️ UPDATE (merge results/column guides) |
| **SECURITY.md** | Security features, hardening, threat model | ✅ Yes |
| **CONTRIBUTING.md** | Development guide, code standards | ⚠️ UPDATE (merge testing guides) |
| **CHANGELOG.md** | Version history, release notes | ✅ Yes |
| **TROUBLESHOOTING.md** | Common issues, solutions, debugging | ⚠️ UPDATE (merge quick fix guides) |
| **LICENSE** | MIT license | ✅ Yes |

---

## 🟡 TIER 2: CONSOLIDATE (35 files → merge into Tier 1)

**Group 1: Deployment/Setup (~4 files)**
- MVP_QUICKSTART.md → Merge into README.md § Quick Start
- MVP_DEPLOYMENT_GUIDE.md → Merge into DEPLOYMENT_GUIDE.md
- MVP_DESIGN.md → Already covered by ARCHITECTURE.md (remove)
- MODERN_UI_GUIDE.md → Merge into DEPLOYMENT_GUIDE.md
- VISUALIZATION_SETUP.md → Merge into DEPLOYMENT_GUIDE.md

**Action:** Extract unique content; merge into DEPLOYMENT_GUIDE.md with new "Setup Sections"

---

**Group 2: Features & Usage (~8 files)**
- README_FEATURES.md → Merge into README.md § Features
- FEATURES_COMPLETE.md → Merge into README.md § Features (already partially done)
- FEATURES_IMPLEMENTATION.md → Merge into CHANGELOG.md § Release Notes
- FEATURE_ENHANCEMENTS.md → Move to `/docs/ROADMAP.md` (future work tracking)
- COLUMN_LEVEL_RESULTS_GUIDE.md → Merge into API_REFERENCE.md § Response Format
- COLUMN_RESULTS_IMPLEMENTATION_GUIDE.md → Merge into API_REFERENCE.md § Usage Examples
- COLUMN_RESULTS_QUICK_REFERENCE.md → Merge into API_REFERENCE.md § Quick Ref
- COMPREHENSIVE_DETAILED_RESULTS.md → Merge into API_REFERENCE.md § Advanced

**Action:** Create "Results API" section in API_REFERENCE.md; update README to reference it

---

**Group 3: Rules & Quality Checks (~4 files)**
- RULES_GUIDE.md → Merge into API_REFERENCE.md § Checks Guide
- RULES_AND_CHECKS_MAPPING.md → Merge into API_REFERENCE.md § Check Mapping
- RULE_SELECTION_GUIDE.md → Merge into README.md § Feature matrix
- SODA_RESULTS_REFACTORING_SOLUTION.md → Archive (historical design doc)

**Action:** Create "Quality Checks Reference" section in API_REFERENCE.md

---

**Group 4: Testing & QA (~8 files)**
- TESTING_GUIDE.md → Merge into CONTRIBUTING.md § Testing
- TESTING_OVERVIEW.md → Merge into CONTRIBUTING.md § Testing
- TESTING_PLAN.md → Merge into CONTRIBUTING.md § Testing
- TEST_EXECUTION_GUIDE.md → Merge into CONTRIBUTING.md § Testing
- TEST_COMMANDS_REFERENCE.md → Merge into TROUBLESHOOTING.md § Test Commands
- TEST_EVERYTHING_END_TO_END.md → Merge into CONTRIBUTING.md § E2E Tests
- API_TEST_GUIDE.md → Merge into API_REFERENCE.md § Testing Endpoints
- END_TO_END_TEST_REPORT.md → Archive (historical report)

**Action:** Create "Testing" section in CONTRIBUTING.md; reference test commands in TROUBLESHOOTING.md

---

**Group 5: Details & References (~6 files)**
- DETAILED_RESULTS_GUIDE.md → Merge into API_REFERENCE.md
- DETAILED_RESULTS_IMPLEMENTATION_SUMMARY.md → Merge into API_REFERENCE.md
- DATA_FLOW_MAPPING.md → Merge into ARCHITECTURE.md § Data Flow
- PORT_ACCESS_GUIDE.md → Merge into TROUBLESHOOTING.md § Port Issues
- QUICK_FIX_GUIDE.md → Merge into TROUBLESHOOTING.md § Quick Fixes
- DOCUMENTATION_INDEX.md → Remove (redundant with clean doc structure)

**Action:** Extract unique content into appropriate tier-1 docs

---

## 🔴 TIER 3: ARCHIVE (23 files → move to `/archive/`)

These are historical, status, or meta-documents—useful for reference but not active development:

**Historical Phase Reports (already identified for archiving):**
- PHASE0_BASELINE_REPORT.md
- PHASE01_COMPLETE_REPORT.md
- PHASE1_QUALITY_GATES.md
- PHASE2_EDGE_CASE_MATRIX.md
- PHASE2B_TEST_IMPLEMENTATION_COMPLETE.md
- PHASE4_TEST_FIX_RETEST_LOOP.md

**Status & Completion Reports:**
- IMPLEMENTATION_COMPLETE.txt
- SYSTEM_READY.md
- SYSTEM_STATUS.md
- FINAL_SUMMARY.md
- FINAL_PROJECT_COMPLETION_REPORT.md
- SYSTEM_CLEANUP_COMPLETION_REPORT.md
- IMPLEMENTATION_SUMMARY.md
- CONSOLIDATION_COMPLETION_REPORT.md
- PROJECT_CONSOLIDATION_ANALYSIS.md

**Issue & Fix Histories (historical records):**
- ISSUES_FIXED.md
- FIXES_APPLIED.md
- CRITICAL_FIXES_APPLIED_2.md
- DIAGNOSTIC_FIXES_SUMMARY.md
- SCAN_FIXES.md
- RULE_SELECTION_FIXED.md
- DELIVERABLES_SUMMARY.md
- DOCUMENTATION_UPDATE_SUMMARY.md

**Action:** Move all to `/archive/deprecated/` with commit message: "Archive: Move status/historical docs to archive/"

---

## Implementation Plan

### Phase 1: Consolidate Core Documents (2-3 hours)

**Step 1: Consolidate DEPLOYMENT_GUIDE.md**
- Extract content from: MVP_QUICKSTART.md, MVP_DEPLOYMENT_GUIDE.md, MODERN_UI_GUIDE.md, VISUALIZATION_SETUP.md
- Organize into clear sections: Quick Start | Configuration | Docker | Secrets | Monitoring

**Step 2: Consolidate API_REFERENCE.md**
- Extract content from: COLUMN_* guides, RULES_GUIDE.md, DETAILED_RESULTS_*, API_TEST_GUIDE.md
- Organize into sections: Endpoints | Response Format | Quality Checks | Examples | Testing

**Step 3: Consolidate CONTRIBUTING.md**
- Extract content from: TESTING_*.md, TEST_EXECUTION_GUIDE.md, TEST_EVERYTHING_END_TO_END.md, FEATURES_IMPLEMENTATION.md
- Organize into: Development Setup | Code Standards | Testing | Build/Deploy | Contributing

**Step 4: Consolidate TROUBLESHOOTING.md**
- Extract content from: QUICK_FIX_GUIDE.md, PORT_ACCESS_GUIDE.md, TEST_COMMANDS_REFERENCE.md
- Organize into: Common Issues | DuckDB | PostgreSQL | API | Ports | Debug Commands

**Step 5: Update README.md**
- Add content from: README_FEATURES.md, FEATURES_COMPLETE.md, RULE_SELECTION_GUIDE.md
- Organize into: Quick Start | Features | Architecture | Usage | Configuration

**Step 6: Update ARCHITECTURE.md**
- Add content from: DATA_FLOW_MAPPING.md
- Enhance data flow section

---

### Phase 2: Archive Historical Documents (30 minutes)

```bash
# Move all tier-3 docs to archive
mv PHASE0_*.md PHASE1_*.md PHASE2_*.md PHASE4_*.md archive/phases/
mv IMPLEMENTATION_COMPLETE.txt SYSTEM_*.md FINAL_*.md archive/deprecated/
mv *_SUMMARY.md ISSUES_FIXED.md FIXES_APPLIED.md archive/deprecated/
# Commit
git commit -m "Archive: Move 23 historical/status docs to /archive/"
```

---

### Phase 3: Remove Duplicates (15 minutes)

```bash
# Remove already-consolidated files
rm MVP_DESIGN.md ARCHITECTURE_OVERVIEW.md ARCHITECTURE.md.new DOCUMENTATION_INDEX.md
git commit -m "docs: Remove duplicate architecture and index files"
```

---

### Phase 4: Organize `/docs/` Folder (Optional)

Create subdirectories for better organization:
```
/docs/
├── ADRs/
│   ├── ADR-001.md
│   └── TEMPLATE.md
├── RAID_LOG.md
├── DECISION_LOG.md
├── ROADMAP.md (from FEATURE_ENHANCEMENTS.md)
└── README.md (folder index)
```

---

## Before & After

### Before
```
Root directory: 67 .md files
├── 9 core docs (README, ARCHITECTURE, API_REFERENCE, etc.)
├── 35 partially-redundant guides
├── 6 PHASE reports
├── 15 historical status files
└── 2 architecture variants
```

### After
```
Root directory: 9 .md files + LICENSE
├── README.md (complete project overview)
├── ARCHITECTURE.md (complete system design)
├── DEPLOYMENT_GUIDE.md (complete deployment)
├── API_REFERENCE.md (complete API reference)
├── SECURITY.md (unchanged)
├── CONTRIBUTING.md (complete dev guide)
├── CHANGELOG.md (unchanged)
├── TROUBLESHOOTING.md (complete troubleshooting)
└── LICENSE

/docs/ folder: Organized reference
├── ADRs/
│   ├── ADR-001.md, ADR-002.md, etc.
│   └── TEMPLATE.md
├── RAID_LOG.md
├── DECISION_LOG.md
├── ROADMAP.md (future features)
└── README.md (docs index)

/archive/ folder: Historical
├── /phases/ (PHASE reports)
└── /deprecated/ (status docs, historical reports)
```

---

## Success Criteria

✅ **Documentation Metrics**
- [ ] Root directory reduced from 67 → 9 canonical docs
- [ ] No duplicate content across documents
- [ ] All references validated (no broken links)
- [ ] Each doc has clear purpose/ownership

✅ **User Experience**
- [ ] Onboarding time reduced (easier to find info)
- [ ] No confusion about "which doc is current"
- [ ] Clear navigation between related topics
- [ ] Comprehensive cross-references

✅ **Maintenance**
- [ ] Single source of truth per domain
- [ ] Easier to keep docs current (less duplication)
- [ ] Clear file organization
- [ ] Historical context preserved (in /archive/)

---

## Estimated Effort

| Phase | Task | Effort | Status |
|-------|------|--------|--------|
| 1 | Consolidate 5 core docs | 2-3 hrs | ⏳ Ready |
| 2 | Archive 23 docs | 30 min | ⏳ Ready |
| 3 | Remove duplicates | 15 min | ⏳ Ready |
| 4 | Organize /docs/ | 30 min | ⏳ Optional |
| **Total** | | **3.5-5 hours** | |

---

## Next Steps

**Ready to Execute?**

1. ✅ Approve this plan
2. ⏳ Execute Phase 1: Consolidate core docs (start with DEPLOYMENT_GUIDE.md)
3. ⏳ Execute Phase 2: Archive historical docs
4. ⏳ Execute Phase 3: Remove duplicates
5. ⏳ Commit consolidation with message: "docs: Consolidate documentation from 67→9 files"

**Concerns?**
- Missing a document that needs consolidating?
- Want to keep a document separately?
- Prefer different folder organization?

Reply with feedback, and I'll adjust the plan.

---

**Prepared by:** Documentation Maintainer Agent  
**Approval Status:** ⏳ Awaiting user feedback
