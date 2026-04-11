# 📦 Archived & Deprecated Documentation

**Last Updated:** 2026-04-11  
**Purpose:** Historical reference and audit trail

---

## Retention Policy

This directory contains **deprecated and superseded documentation** from earlier project phases. These files are preserved for:

- ✅ **Audit Trail:** Historical record of project evolution
- ✅ **Reference:** Useful context for decisions made
- ✅ **Compliance:** Evidence of project governance
- ❌ **Active Use:** Do NOT use these files; they are outdated

### How Long Files Are Kept

| Category | Retention | Reason |
|----------|-----------|--------|
| Phase Reports | Indefinite | Audit trail |
| Alternative Designs | 2 years | Historical context |
| Obsolete Guides | 1 year | Minimal value |
| Test Results | 90 days | Compliance |

---

## What's Here

### 1. Phase Reports (OBSOLETE)
Located in this directory. Examples:
- `PHASE0_BASELINE_REPORT.md` → Replaced by ARCHITECTURE.md
- `PHASE1_QUALITY_GATES.md` → Replaced by PHASE1_IMPLEMENTATION_PLAN.md  
- `PHASE2_EDGE_CASE_MATRIX.md` → Replaced by PHASE2_API_CONTRACT.md

**Status:** Reference only; do not use for implementation

### 2. Architecture Variants (OBSOLETE)
- `ARCHITECTURE_OVERVIEW.md` → Replaced by docs/OVERVIEW.md
- `ARCHITECTURE.md.new` → Experimental variant (not approved)

**Status:** Reference only; canonical version is at [/ARCHITECTURE.md](../../ARCHITECTURE.md)

### 3. Implementation Guides (OUTDATED)
- `MVP_QUICKSTART.md` → Replaced by docs/DEPLOYMENT.md
- `FEATURES_IMPLEMENTATION.md` → Superseded by living codebase

**Status:** Context only; follow current docs instead

### 4. PM System Documentation
- `PROJECT_MANAGEMENT_TEAM_SYSTEM.md` → PM team reference
- `QUICKSTART_PM_SYSTEM.md` → PM system primer

**Status:** Reference for governance; may be activated for team coordination

---

## Finding What You Need

### If You're Looking For...

| Need | Go To | NOT HERE |
|------|-------|----------|
| How to install & run | [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) | MVP_QUICKSTART.md |
| API endpoints | [docs/API.md](../../docs/API.md) | PHASE2_API_CONTRACT.md |
| System design | [docs/OVERVIEW.md](../../docs/OVERVIEW.md) | ARCHITECTURE_OVERVIEW.md |
| Database schema | [docs/DATABASE.md](../../docs/DATABASE.md) | Phase reports |
| Operations guide | [docs/RUNBOOK.md](../../docs/RUNBOOK.md) | Testing guides |
| Architecture decisions | [ARCHITECTURE.md](../../ARCHITECTURE.md) + [docs/DECISION_LOG.md](../../docs/DECISION_LOG.md) | Architecture variants |

### To Search Archives

```bash
# Find a specific file
find archive/deprecated -name "*keyword*" -type f

# Find documents mentioning a topic
grep -r "database migration" archive/deprecated/

# List files by date
ls -lt archive/deprecated/ | head -20

# View a specific archived file
cat archive/deprecated/ARCHITECTURE_OVERVIEW.md
```

---

## Migration Path

When files are deprecated:

1. **Content is consolidated** → New canonical version created
2. **Links are updated** → All references point to canonical docs
3. **Original is archived** → Moved to `/archive/deprecated/`
4. **Decision is logged** → ADR created explaining change

Example: `ARCHITECTURE.md.new` → `docs/ARCHITECTURE.md`
- See: [docs/DECISION_LOG.md](../../docs/DECISION_LOG.md) - Decision-008

---

## Do NOT Use These Files

### ❌ Outdated Guides
- `MVP_QUICKSTART.md` - Use [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)
- `TESTING_PLAN.md` - Use pytest in repository

### ❌ Obsolete Designs  
- `ARCHITECTURE_OVERVIEW.md` - Use [docs/OVERVIEW.md](../../docs/OVERVIEW.md)
- `ARCHITECTURE.md.new` - Use [ARCHITECTURE.md](../../ARCHITECTURE.md)

### ❌ Experimental Features
- Files marked "experimental", "draft", "POC" are not production-ready

---

## Important Decisions

### Decision-008: Documentation Consolidation (APPROVED)
**Date:** 2026-04-11  
**Status:** ✅ APPROVED

**What:** Archive 50+ historical docs into single canonical source-of-truth

**Why:**
- Reduce confusion from multiple "versions of truth"
- Improve maintainability (one update, not five)
- Establish clear admin process (ADRs, review gates)
- Enable docs-as-code workflow

**Files Consolidated:**
- 3 architecture variants → 1 canonical [docs/OVERVIEW.md](../../docs/OVERVIEW.md)
- 12 phase reports → archived in [/archive/phases/](../phases/)
- 50+ guides → 6 canonical docs in [/docs/](../../docs/)

**See:** [docs/DECISION_LOG.md](../../docs/DECISION_LOG.md)

---

## Using Archived Content for References

If you need historical context:

```bash
# View original design document
cat archive/deprecated/ARCHITECTURE_OVERVIEW.md | head -50

# See what phase report said about a topic
grep "connection management" archive/deprecated/PHASE0_BASELINE_REPORT.md

# Check test results from archived run
cat archive/deprecated/TEST_EXECUTION_GUIDE.md
```

---

## What if an Archived File Is Missing?

1. **Check Git history:**
   ```bash
   git log --follow --oneline -- archive/deprecated/
   git show <commit>:archive/deprecated/FILENAME.md
   ```

2. **Ask team:**
   - Slack: #data-quality-platform
   - Email: team@example.com

3. **Check git backup:**
   ```bash
   git reflog  # Find any deleted commits
   git show <commit>:FILENAME.md
   ```

---

## Contributing to This Directory

### When to Archive a Document

1. **Significant change** (not minor fix)
2. **Canonical alternative exists** and is maintained
3. **Content is superseded**, not just updated

### How to Archive

```bash
# 1. Move file to archive
git mv DOCUMENT.md archive/deprecated/

# 2. Create forwarding reference (if helpful)
# Add to canonical file: "See archive/deprecated/OLD_NAME.md for historical context"

# 3. Commit with clear message
git commit -m "docs: Archive OLD_NAME.md - Decision-XXX

Rationale: Consolidated into canonical CANONICAL_NAME.md
See: docs/DECISION_LOG.md#decision-XXX"
```

---

## Questions?

- **How do I use the archived docs?** → You probably shouldn't. Use [docs/INDEX.md](../../docs/INDEX.md) instead.
- **Where's the canonical version?** → [docs/INDEX.md](../../docs/INDEX.md) has the link
- **Why was X archived?** → Check [docs/DECISION_LOG.md](../../docs/DECISION_LOG.md)
- **Can I delete these files?** → No; keep for audit trail (indefinite retention)

---

**Archive Maintained By:** Documentation Team  
**Last Reviewed:** 2026-04-11  
**Next Review:** 2026-07-11
