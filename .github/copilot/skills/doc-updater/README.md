# Document Updater Skill

Automated documentation maintenance skill for GitHub Copilot.

## Quick Start

Simply say one of these phrases to invoke the skill:

```
"Update the documentation"
"Refresh all docs"
"Sync docs with code"
"Update version to X.X.X in docs"
"Document the new feature"
"Generate changelog"
```

## What It Does

This skill automatically:

1. ✅ **Detects code changes** and identifies affected docs
2. ✅ **Updates version numbers** across all documentation files
3. ✅ **Syncs timestamps** to keep "Last Updated" dates current
4. ✅ **Maintains feature lists** in README and guides
5. ✅ **Updates API documentation** when endpoints change
6. ✅ **Tracks configuration changes** in environment variables
7. ✅ **Generates changelogs** from git commit history

## Documentation Structure

Manages these files:
- `README.md` - Main project overview
- `CHANGELOG.md` - Version history
- `MODERN_UI_GUIDE.md` - UI user guide
- `RULE_SELECTION_GUIDE.md` - Rule documentation
- `SECURITY.md` - Security docs
- `CONTRIBUTING.md` - Contribution guidelines
- `docs/README.md` - Documentation index
- `docs/COMPONENTS.md` - Component reference
- `docs/QUICK_REFERENCE.md` - Quick reference
- `docs/architecture/ARCHITECTURE.md` - Architecture docs

## Example Usage

### Scenario 1: Version Bump

**User:** "Update version to 1.0.1 in all docs"

**Skill will:**
- Update version in 9+ files (README, guides, etc.)
- Update all "Last Updated" timestamps
- Create CHANGELOG entry
- Validate consistency

### Scenario 2: New Feature

**User:** "Document the new batch upload feature"

**Skill will:**
- Add feature to README feature list
- Update UI guide with new functionality
- Add API endpoint documentation
- Update CHANGELOG with "Added" entry

### Scenario 3: After Code Changes

**User:** "Refresh documentation after recent changes"

**Skill will:**
- Analyze recent git commits
- Identify affected documentation files
- Update relevant sections
- Generate changelog from commits

## Recent Demo

This skill was just used to:
1. ✅ Bump version from 1.0.0 → 1.0.1 across 7 files
2. ✅ Update timestamps to 2026-04-01
3. ✅ Create comprehensive CHANGELOG.md
4. ✅ Document the docker-compose.yml configuration fix

See: [CHANGELOG.md](../../../CHANGELOG.md)

## Skill Details

Full skill documentation: [SKILL.md](SKILL.md)

**Created:** April 1, 2026  
**Version:** 1.0.0
