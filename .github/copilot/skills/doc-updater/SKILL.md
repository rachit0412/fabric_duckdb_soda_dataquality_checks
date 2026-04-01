# Document Update Automation Skill

## Metadata

```yaml
name: doc-updater
version: 1.0.0
category: documentation-maintenance
description: |
  Automatically analyze code changes and update documentation files to maintain 
  consistency, accuracy, and completeness across the codebase.
triggers:
  - update docs
  - refresh documentation
  - sync documentation
  - update readme
  - update architecture docs
  - fix outdated docs
  - documentation maintenance
tags:
  - documentation
  - automation
  - maintenance
  - versioning
```

---

## Purpose

This skill automates the process of keeping documentation in sync with code changes. It:

1. **Detects code changes** that affect documentation
2. **Identifies outdated information** in existing docs
3. **Updates version numbers** and timestamps consistently
4. **Maintains feature lists** and API documentation
5. **Generates changelogs** from commit history
6. **Ensures consistency** across all documentation files

---

## When to Use This Skill

### Automatic Triggers

Use this skill when:

- ✅ **After major code changes** - Features, APIs, configurations modified
- ✅ **Before releases** - Ensure all docs reflect current state
- ✅ **Version bumps** - Update version numbers across all files
- ✅ **New features added** - Document new functionality
- ✅ **Breaking changes** - Update migration guides and changelogs
- ✅ **Configuration changes** - Update setup/deployment guides
- ✅ **User reports outdated docs** - Fix specific documentation issues
- ✅ **Dependencies updated** - Update requirements and installation docs

### Manual Triggers

Keywords that invoke this skill:
- "update the documentation"
- "refresh all docs"
- "sync docs with code"
- "fix outdated documentation"
- "update version in docs"
- "generate changelog"
- "document recent changes"

---

## Documentation Structure in This Project

### Core Documentation Files

```
PROJECT_ROOT/
├── README.md                          # Main project overview (✨ CRITICAL)
├── MODERN_UI_GUIDE.md                # UI user guide
├── RULE_SELECTION_GUIDE.md           # Rule selection documentation
├── SECURITY.md                       # Security documentation
├── CONTRIBUTING.md                   # Contribution guidelines
├── ARCHITECTURE.md                   # High-level architecture
│
├── docs/
│   ├── README.md                     # Documentation index
│   ├── COMPONENTS.md                 # Component reference
│   ├── QUICK_REFERENCE.md            # Quick reference guide
│   │
│   ├── architecture/
│   │   ├── ARCHITECTURE.md           # Detailed architecture
│   │   └── ARCHITECTURE_DETAILED.md  # In-depth technical specs
│   │
│   ├── deployment/
│   │   ├── CONTAINERIZATION.md       # Docker/container guide
│   │   ├── DOCKER_READY.md           # Docker readiness checklist
│   │   └── DEPLOYMENT_PLAYBOOK.md    # Deployment procedures
│   │
│   └── playbooks/
│       ├── DEVELOPMENT_PLAYBOOK.md   # Dev workflow guide
│       └── DEPLOYMENT_PLAYBOOK.md    # Deployment workflow
│
└── services/
    └── frontend/
        └── src/
            └── UI_PREVIEW.md         # Frontend preview documentation
```

### Version-Controlled Elements

Track these across all documentation:

1. **Version Numbers**: Currently `1.0.0`
2. **Last Updated Dates**: Format `YYYY-MM-DD` or `Month DD, YYYY`
3. **Feature Lists**: Enumerate current capabilities
4. **API Endpoints**: Document all routes and parameters
5. **Configuration Options**: List environment variables
6. **Tech Stack**: Versions of dependencies
7. **System Requirements**: Installation prerequisites

---

## Update Workflow

### Step 1: Analyze Changes

**Identify what changed:**

```bash
# Check recent commits
git log --oneline --since="7 days ago"

# See file changes
git diff HEAD~5 HEAD --stat

# Find modified Python/JS files
git diff HEAD~5 HEAD --name-only | grep -E '\.(py|js|jsx|ts|tsx)$'
```

**Map changes to affected docs:**

| Code Area | Affected Documentation |
|-----------|------------------------|
| `src/api/server.py` | README.md (API section), COMPONENTS.md, ARCHITECTURE.md |
| `services/frontend/src/App.js` | MODERN_UI_GUIDE.md, UI_PREVIEW.md, README.md (Features) |
| `docker-compose.yml` | CONTAINERIZATION.md, DEPLOYMENT_PLAYBOOK.md |
| `requirements.txt` | README.md (Installation), COMPONENTS.md (Dependencies) |
| `soda_duckdb/checks.yml` | RULE_SELECTION_GUIDE.md, MODERN_UI_GUIDE.md |
| `.github/workflows/` | DEPLOYMENT_PLAYBOOK.md, CI/CD sections |

### Step 2: Update Version Information

**When to bump versions:**

- **Patch (x.x.X)**: Bug fixes, doc corrections, minor updates
- **Minor (x.X.0)**: New features, significant enhancements
- **Major (X.0.0)**: Breaking changes, major redesigns

**Files to update:**

1. `README.md` - Line ~5: `**Version:** X.X.X`
2. `MODERN_UI_GUIDE.md` - Last line: `**Version**: X.X.X`
3. `RULE_SELECTION_GUIDE.md` - Last line: `**Platform Version:** X.X.X`
4. `SECURITY.md` - Table: `| **Version** | X.X.X |`
5. `docs/README.md` - Line ~3: `**Version:** X.X.X`
6. `docs/COMPONENTS.md` - Line ~3: `**Version:** X.X.X`
7. `docs/QUICK_REFERENCE.md` - Last line: `*Version: X.X.X*`
8. `Dockerfile` - LABEL: `LABEL version="X.X.X"`
9. `services/api/src/api/server.py` - FastAPI app: `version="X.X.X"`

### Step 3: Update Timestamps

**Format standards:**

- ISO format: `YYYY-MM-DD` (e.g., `2026-04-01`)
- Long format: `Month DD, YYYY` (e.g., `April 1, 2026`)
- Generated timestamp: `YYYY-MM-DD HH:MM:SS`

**Update these:**

```bash
# Current date in ISO format
date +%Y-%m-%d

# Current date in long format
date "+%B %d, %Y"
```

### Step 4: Sync Feature Lists

**Check these sections:**

1. **README.md** - "Key Features" section
   - Verify all features are listed
   - Remove deprecated features
   - Add new capabilities

2. **MODERN_UI_GUIDE.md** - "What's New" section
   - Document UI changes
   - Update workflow descriptions
   - Refresh screenshots/ASCII diagrams

3. **COMPONENTS.md** - Component inventory
   - Add new services/modules
   - Update dependencies
   - Refresh technology versions

### Step 5: Update Configuration Documentation

**Track these config changes:**

| Config File | Documentation |
|-------------|---------------|
| `docker-compose.yml` | CONTAINERIZATION.md, DEPLOYMENT_PLAYBOOK.md |
| `.env.example` | README.md (Setup), DEPLOYMENT_PLAYBOOK.md |
| `soda_duckdb/checks.yml` | RULE_SELECTION_GUIDE.md |
| `src/config/settings.py` | ARCHITECTURE.md, COMPONENTS.md |

**Update if changed:**
- Environment variables
- Port mappings
- Volume mounts
- Service names
- Configuration defaults

### Step 6: Update API Documentation

**When API endpoints change:**

1. List all endpoints:
```python
# Extract from src/api/server.py
grep -E "@app\.(get|post|put|delete|patch)" src/api/server.py
```

2. Update documentation:
   - Endpoint paths
   - Request parameters
   - Response formats
   - Error codes
   - Authentication requirements

3. Update in:
   - README.md (API section)
   - COMPONENTS.md (API endpoints table)
   - ARCHITECTURE.md (API layer)

### Step 7: Generate Changelog

**Extract recent changes:**

```bash
# Get commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Group by type
git log --pretty=format:"%s" | grep -E "^(feat|fix|docs|refactor|perf|test|chore):"
```

**Changelog template:**

```markdown
## [X.X.X] - YYYY-MM-DD

### Added
- New feature descriptions
- New endpoints or capabilities

### Changed
- Modified functionality
- Updated dependencies
- Configuration changes

### Fixed
- Bug fixes
- Documentation corrections
- Security patches

### Deprecated
- Features being phased out

### Removed
- Deleted features or endpoints

### Security
- Security improvements
- Vulnerability patches
```

---

## Execution Checklist

When updating documentation, follow this sequence:

### Phase 1: Discovery (5 minutes)
- [ ] Read recent commit messages (last 10-20 commits)
- [ ] Check `git diff` for file changes
- [ ] Identify which doc files need updates
- [ ] Note specific version/feature changes

### Phase 2: Version Updates (3 minutes)
- [ ] Determine new version number (patch/minor/major)
- [ ] Update version in all 9+ locations (see Step 2 above)
- [ ] Update all timestamps to current date
- [ ] Verify consistency across files

### Phase 3: Content Updates (10-20 minutes)
- [ ] Update README.md feature list
- [ ] Refresh ARCHITECTURE.md if structure changed
- [ ] Update COMPONENTS.md dependency versions
- [ ] Sync MODERN_UI_GUIDE.md with UI changes
- [ ] Update RULE_SELECTION_GUIDE.md if rules changed
- [ ] Refresh deployment docs if infrastructure changed

### Phase 4: Technical Accuracy (5-10 minutes)
- [ ] Verify all code snippets are accurate
- [ ] Check all file paths are correct
- [ ] Validate command examples work
- [ ] Update API endpoint documentation
- [ ] Verify environment variable names

### Phase 5: Validation (5 minutes)
- [ ] Check for broken internal links
- [ ] Verify all mentioned files exist
- [ ] Ensure consistent terminology
- [ ] Check for placeholder text (TODO, TBD, XXX)
- [ ] Validate markdown formatting

### Phase 6: Changelog (5 minutes)
- [ ] Create/update CHANGELOG.md entry
- [ ] Group changes by category (Added/Changed/Fixed)
- [ ] Link to relevant commits or PRs
- [ ] Highlight breaking changes

---

## Automation Patterns

### Pattern 1: Quick Version Bump

**Use case:** Minor updates, patch releases

```bash
# Update version in all files at once
NEW_VERSION="1.0.1"
OLD_VERSION="1.0.0"
DATE=$(date +%Y-%m-%d)

# Find and replace version
find . -type f -name "*.md" -exec sed -i "s/$OLD_VERSION/$NEW_VERSION/g" {} +

# Update dates
find . -type f -name "*.md" -exec sed -i "s/Last Updated.*:/Last Updated: $DATE/g" {} +
```

### Pattern 2: Feature Addition Documentation

**Use case:** New feature needs documentation

**Template:**

```markdown
## ✨ New Feature: [Feature Name]

**What it does:**
[Brief description]

**How to use:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Configuration:**
```yaml
# Example configuration
key: value
```

**API Endpoint (if applicable):**
- **Method:** `GET|POST|PUT|DELETE`
- **Path:** `/api/endpoint`
- **Parameters:** [List]
- **Response:** [Format]

**Example:**
```bash
# Example usage
curl -X POST http://localhost:8000/api/endpoint
```

**See also:**
- [Related feature 1]
- [Related documentation]
```

### Pattern 3: Breaking Change Documentation

**Use case:** Breaking changes require migration guide

**Template:**

```markdown
## ⚠️ Breaking Change: [What Changed]

**Affected versions:** Before X.X.X → After X.X.X

**What changed:**
[Description of the breaking change]

**Why this changed:**
[Rationale/benefit]

**Migration guide:**

### Before (Old Way)
```javascript
// Old code example
oldFunction()
```

### After (New Way)
```javascript
// New code example
newFunction()
```

**Action required:**
- [ ] Update configuration files
- [ ] Modify code using old API
- [ ] Test changes
- [ ] Deploy updated version

**Timeline:**
- Old API deprecated: [Date]
- Old API removed: [Date + 6 months]
```

---

## Quality Standards

### Documentation must be:

1. **Accurate** ✓
   - All code examples work as written
   - Version numbers match actual codebase
   - File paths are correct
   - Commands execute successfully

2. **Complete** ✓
   - All features documented
   - All configuration options listed
   - All API endpoints described
   - All prerequisites mentioned

3. **Consistent** ✓
   - Terminology used consistently
   - Version numbers match everywhere
   - Formatting follows same pattern
   - Code block syntax highlighting consistent

4. **Current** ✓
   - Timestamps reflect actual update date
   - Deprecated features removed
   - New features added
   - Tech stack versions accurate

5. **Accessible** ✓
   - Clear headings and structure
   - Examples provided
   - Links work correctly
   - TOC present for long documents

---

## Common Pitfalls to Avoid

### ❌ Don't Do This:

1. **Partial updates** - Updating version in 3 files but missing 6 others
2. **Stale timestamps** - Copy-pasting "Last Updated: 2025-01-01" without checking
3. **Broken examples** - Code snippets that don't actually run
4. **Dead links** - References to files/sections that don't exist
5. **Inconsistent terminology** - "data quality scan" vs "DQ check" vs "quality test"
6. **Placeholder text** - Leaving "TODO" or "TBD" in production docs
7. **Outdated screenshots** - UI images showing old interface
8. **Missing configuration** - Documenting feature without mentioning required env vars

### ✅ Do This Instead:

1. **Batch updates** - Update all version references in one pass
2. **Automated timestamps** - Use current date programmatically
3. **Tested examples** - Run every code snippet before documenting
4. **Link validation** - Check all links resolve correctly
5. **Terminology glossary** - Define terms once, use consistently
6. **Complete content** - Finish documentation fully or mark as WIP
7. **Current visuals** - Keep screenshots up to date or use diagrams
8. **Complete guides** - Document configuration alongside features

---

## Integration with Development Workflow

### Pre-Commit Hook

```bash
#!/bin/bash
# .githooks/pre-commit-docs

# Check if code files changed
if git diff --cached --name-only | grep -qE '\.(py|js|jsx|yml|yaml)$'; then
  echo "⚠️  Code files changed - Consider updating documentation"
  echo ""
  echo "Run: copilot update documentation"
  echo ""
fi
```

### Pull Request Template

```markdown
## Documentation Updates

- [ ] README.md updated (if features changed)
- [ ] ARCHITECTURE.md updated (if structure changed)
- [ ] CHANGELOG.md entry added
- [ ] Version number bumped (if release)
- [ ] API docs updated (if endpoints changed)
- [ ] Configuration examples updated (if .env changed)
```

---

## Example Invocations

### Example 1: After UI Redesign

**User:** "Update documentation after UI redesign"

**Skill Actions:**
1. Read `services/frontend/src/App.js` to understand new UI
2. Update `MODERN_UI_GUIDE.md`:
   - "What's New" section
   - Layout diagrams
   - Feature descriptions
3. Update `README.md`:
   - Add new UI features to feature list
   - Update screenshots/diagrams if mentioned
4. Update `docs/COMPONENTS.md`:
   - Frontend component details
5. Bump version to 1.1.0 (minor release)

### Example 2: New API Endpoint

**User:** "Document the new /api/batch-scan endpoint"

**Skill Actions:**
1. Analyze `src/api/server.py` to extract:
   - Route definition
   - Parameters
   - Response format
2. Update `README.md` API section
3. Update `COMPONENTS.md` API endpoints table
4. Add example to `docs/QUICK_REFERENCE.md`
5. Add to CHANGELOG under "Added"

### Example 3: Version Bump for Release

**User:** "Prepare documentation for v1.2.0 release"

**Skill Actions:**
1. Update version in 9+ files (see Step 2)
2. Update all timestamps to release date
3. Generate changelog from commits
4. Review feature list completeness
5. Check all examples still work
6. Validate all links
7. Create release notes summary

---

## File Monitoring

### High-Priority Files (Check First)

Monitor these for changes that trigger doc updates:

```python
MONITORED_FILES = {
    "src/api/server.py": ["README.md", "COMPONENTS.md", "ARCHITECTURE.md"],
    "services/frontend/src/App.js": ["MODERN_UI_GUIDE.md", "README.md"],
    "docker-compose.yml": ["CONTAINERIZATION.md", "DEPLOYMENT_PLAYBOOK.md"],
    "requirements.txt": ["README.md", "COMPONENTS.md"],
    "soda_duckdb/checks.yml": ["RULE_SELECTION_GUIDE.md"],
    "src/config/settings.py": ["ARCHITECTURE.md", "COMPONENTS.md"],
    ".env.example": ["README.md", "DEPLOYMENT_PLAYBOOK.md"],
}
```

### Documentation Interdependencies

```
README.md
  ↓ references
  ├─ ARCHITECTURE.md (architecture link)
  ├─ MODERN_UI_GUIDE.md (user guide link)
  ├─ CONTRIBUTING.md (contributor guide)
  └─ docs/README.md (full docs index)

ARCHITECTURE.md
  ↓ references
  ├─ COMPONENTS.md (component details)
  └─ DEPLOYMENT_PLAYBOOK.md (deployment info)

MODERN_UI_GUIDE.md
  ↓ references
  ├─ RULE_SELECTION_GUIDE.md (rule configuration)
  └─ README.md (back to main)
```

---

## Success Metrics

Documentation update is successful when:

- ✅ All version numbers match across files
- ✅ All timestamps reflect actual update date
- ✅ All code examples execute without errors
- ✅ All links resolve correctly
- ✅ Feature list matches actual capabilities
- ✅ API documentation matches actual endpoints
- ✅ Configuration examples work as written
- ✅ No placeholder text (TODO/TBD/XXX) in docs
- ✅ Changelog reflects recent changes accurately
- ✅ Documentation builds/renders without warnings

---

## Skill Invocation

To use this skill, say:

- "Update the documentation"
- "Refresh all docs to reflect recent changes"
- "Sync documentation with current codebase"
- "Update version to 1.2.0 in all docs"
- "Document the new feature in [file]"
- "Fix outdated docs in README"
- "Generate changelog for last 10 commits"

The skill will analyze the codebase, identify changes, and systematically update all affected documentation files.

---

**Skill Version:** 1.0.0  
**Last Updated:** April 1, 2026  
**Maintainer:** GitHub Copilot
