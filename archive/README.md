# 📦 Archive Directory

This directory contains historical documentation and deprecated artifacts from the project.

**Why archived?** See [DECISION_LOG.md](../docs/DECISION_LOG.md) → **Decision-008: Documentation Archive** (Approved 2026-04-11).

---

## Contents

### `/phases/`
Historical phase reports from development sprints. These documents were used during project planning and execution but are no longer part of active development.

**Files:**
- `PHASE0_BASELINE_REPORT.md` - Initial scope baseline
- `PHASE01_COMPLETE_REPORT.md` - Phase 1 execution summary
- `PHASE1_QUALITY_GATES.md` - QA checkpoint definitions
- `PHASE2_EDGE_CASE_MATRIX.md` - Test case matrix
- `PHASE2B_TEST_IMPLEMENTATION_COMPLETE.md` - Test implementation report
- `PHASE4_TEST_FIX_RETEST_LOOP.md` - Final test cycle results

**Why archived:** Project is now in stable v1.0.1. Phase reports document historical workflow; not needed for ongoing maintenance.

### `/deprecated/`
Documentation files that are superseded by current canonical versions.

**Files:**
- `ARCHITECTURE_OVERVIEW.md` (superseded by [ARCHITECTURE.md](../ARCHITECTURE.md))
- `ARCHITECTURE.md.new` (superseded by [ARCHITECTURE.md](../ARCHITECTURE.md))

**Why archived:** Redundant with main ARCHITECTURE.md. Consolidated into single version for clarity.

---

## How to Use This Archive

### For Historical Reference
If you need to understand how the project evolved:
1. Read `/phases/PHASE0_BASELINE_REPORT.md` → project genesis
2. Read `/phases/PHASE01_COMPLETE_REPORT.md` → initial implementation
3. Read `/phases/PHASE2_EDGE_CASE_MATRIX.md` → testing strategy

### For Reactivating Archived Work
If a feature from archived phases is being reactivated:
1. Locate the phase documents in `/phases/`
2. Extract relevant decision/requirements
3. Create a new ADR in [docs/ADRs/](../docs/ADRs/) documenting the reactivation
4. Reference both the archived phase doc and the new ADR

### For Removing Archive
Archives can be removed once:
- 90 days have passed (compliance trail maintained)
- No active development references the archived material
- Commit message: `docs: Remove archive/ after retention period (Decision-008)`

---

## Decision Context

**Decision-008: Documentation Archive**
- **Status:** ✅ APPROVED & IMPLEMENTED (2026-04-11)
- **Rationale:** Project matured; phase reports archived; redundant architecture docs consolidated; reduces onboarding friction
- **Timeline:** Implemented immediately (2026-04-11)
- **Impact:** Low (no code changes; documentation organization only)
- **Reversal:** Simply move files back to root if needed

See [docs/DECISION_LOG.md](../docs/DECISION_LOG.md) for full decision details.

---

## Retention Policy

**Archive Retention:** 90 days from date archived (reference for compliance audits)  
**Cleanup Cycle:** Quarterly review (first Friday of next quarter)  
**Keeper:** Documentation Maintainer Agent (PM Team)

---

Last Updated: 2026-04-11  
Archive Creator: Documentation Maintainer Agent
