# 📄 Documentation Maintenance Guide

## Overview

This guide explains how to maintain documentation for the Enterprise Data Quality Platform, including auto-generation, manual updates, and best practices.

---

## 🤖 Auto-Generated Documentation

### Files That Are Auto-Generated

The following files are **automatically generated** from source code and should **NEVER be edited manually**:

1. **docs/API_REFERENCE.md**
   - Source: `src/api/server.py` (FastAPI route decorators)
   - Content: REST endpoints, request/response models, code examples
   - Generator: `generate-docs.ps1`

2. **docs/COMPONENTS.md**
   - Source: All Python files in `src/`
   - Content: Class structures, component architecture, data flow
   - Generator: `generate-docs.ps1`

3. **docs/QUICK_REFERENCE.md**
   - Source: Templates + configuration
   - Content: Command cheatsheet, configuration snippets
   - Generator: `generate-docs.ps1`

4. **README.md (version stamp)**
   - Source: `src/__init__.py` (`__version__` variable)
   - Content: Version number and generation date
   - Generator: `generate-docs.ps1`

### How to Update Auto-Generated Docs

**Method 1: Manual Generation**
```powershell
# Run the generator script
.\generate-docs.ps1
```

**Method 2: Automatic (Git Hook)**
```bash
# Enable git hooks (one-time setup)
git config core.hooksPath .githooks

# Now docs regenerate automatically on every commit when Python files change
git add src/api/server.py
git commit -m "Added new API endpoint"
# docs/API_REFERENCE.md is automatically updated and staged
```

**Method 3: CI/CD Pipeline**
```yaml
# azure-pipelines.yml
- task: PowerShell@2
  inputs:
    filePath: 'generate-docs.ps1'
  displayName: 'Generate Documentation'

- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: 'docs/'
  displayName: 'Publish Documentation'
```

### Customize the Generator

Edit `generate-docs.ps1` to:
- Add new documentation sections
- Change formatting
- Include additional metadata
- Extract different information from source code

Example: Add a new section to API_REFERENCE.md:
```powershell
# In generate-docs.ps1, find Generate-APIReference function
function Generate-APIReference {
    # ... existing code ...
    
    # Add your custom section
    $content += @"

## 🔧 Custom Integrations
Your custom content here...
"@
    
    return $content
}
```

---

## ✍️ Manual Documentation

### Files That Require Manual Updates

These files must be updated manually:

1. **ARCHITECTURE.md**
   - When: Architecture changes, new components added
   - Content: System design, technology stack, deployment model

2. **SECURITY.md**
   - When: Security features added, new threats identified
   - Content: Security controls, attack scenarios, hardening guides

3. **CONTRIBUTING.md**
   - When: Development workflow changes, new tools adopted
   - Content: Developer setup, code style, PR process

4. **docs/deployment/*.md**
   - When: Deployment procedures change, new infrastructure
   - Content: Step-by-step deployment guides

5. **docs/guides/*.md**
   - When: User-facing features change
   - Content: UI guides, testing procedures

6. **docs/playbooks/*.md**
   - When: Operational procedures change
   - Content: Development workflows, deployment runbooks

### Manual Update Process

1. **Edit the file** in your editor
2. **Update version/date** at the top:
   ```markdown
   **Version:** 1.0.0 | **Last Updated:** 2026-03-31
   ```
3. **Test links** - ensure all internal references work
4. **Review for accuracy** - verify screenshots, code samples
5. **Commit with descriptive message**:
   ```bash
   git add SECURITY.md
   git commit -m "docs: Updated security guide with new container hardening features"
   ```

---

## 📋 Documentation Checklist

### Before Adding New Documentation

- [ ] Is this information already covered elsewhere?
- [ ] Should this be auto-generated instead of manual?
- [ ] What is the target audience (dev, ops, user)?
- [ ] Where does it fit in the documentation structure?

### When Creating a New Doc

- [ ] Add front matter (version, date, status)
- [ ] Include table of contents for long docs
- [ ] Use consistent markdown formatting
- [ ] Add to [docs/README.md](README.md) index
- [ ] Link from relevant parent documents
- [ ] Test all code examples
- [ ] Validate all links

### When Updating Existing Docs

- [ ] Update "Last Updated" date
- [ ] Bump version if major changes
- [ ] Check for broken links
- [ ] Update related documents
- [ ] Re-test code examples
- [ ] Update screenshots if UI changed

---

## 🎨 Documentation Standards

### Markdown Style Guide

**Headers**
```markdown
# H1 - Document Title (one per file)
## H2 - Major Section
### H3 - Subsection
#### H4 - Minor Heading (use sparingly)
```

**Code Blocks**
````markdown
```python
# Always specify language
code_here()
```
````

**Links**
```markdown
# Internal (relative paths)
[Link Text](../SECURITY.md)

# External
[FastAPI Docs](https://fastapi.tiangolo.com/)

# Anchors
[Jump to Section](#section-heading)
```

**Tables**
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

**Admonitions (using emoji)**
```markdown
**⚠️ Warning:** Critical information
**💡 Tip:** Helpful suggestion
**🔐 Security:** Security-related note
**🐛 Known Issue:** Bug documentation
```

### File Naming Conventions

- Use `UPPER_SNAKE_CASE.md` for root-level docs: `README.md`, `CONTRIBUTING.md`
- Use `UPPER_SNAKE_CASE.md` for major docs: `API_REFERENCE.md`
- Use descriptive names: `DOCKER_SETUP.md` not `setup.md`
- Separate words with underscores: `DEPLOYMENT_PLAYBOOK.md`

### Front Matter Template

```markdown
# 📄 Document Title

**Version:** 1.0.0 | **Last Updated:** 2026-03-31 | **Status:** Draft/Review/Production

> Brief description of document purpose

---

[Content starts here]
```

---

## 🔄 Documentation Workflow

### Adding a New API Endpoint

1. **Add endpoint to `src/api/server.py`**:
   ```python
   @app.get("/api/new-endpoint")
   async def new_endpoint():
       return {"message": "Hello"}
   ```

2. **Regenerate docs**:
   ```powershell
   .\generate-docs.ps1
   ```

3. **Review `docs/API_REFERENCE.md`** - endpoint should appear automatically

4. **Commit both**:
   ```bash
   git add src/api/server.py docs/API_REFERENCE.md
   git commit -m "feat: Added new API endpoint with auto-generated docs"
   ```

### Documenting a New Feature

1. **Update code** with docstrings:
   ```python
   class NewFeature:
       """
       Brief description of the feature.
       
       This will appear in auto-generated component docs.
       """
   ```

2. **Update manual docs** if architectural:
   - `ARCHITECTURE.md` if system design changed
   - `SECURITY.md` if security implications
   - `docs/guides/` if user-facing

3. **Run doc generator**:
   ```powershell
   .\generate-docs.ps1
   ```

4. **Update README.md** features section **manually** if needed

5. **Commit all changes together**

---

## 🧪 Testing Documentation

### Validate Markdown Links

```bash
# Install markdown-link-check (one-time)
npm install -g markdown-link-check

# Check all docs
markdown-link-check docs/**/*.md
markdown-link-check *.md
```

### Test Code Examples

Extract and test all code blocks:
```powershell
# Extract code from docs/API_REFERENCE.md
# Run examples to verify they work
# Use pytest-markdown for automated testing
```

### Preview Documentation

Use a markdown previewer:
- **VS Code**: Built-in markdown preview (Ctrl+Shift+V)
- **GitHub**: Push to feature branch, view rendered
- **MkDocs**: For static site generation

---

## 📊 Documentation Metrics

### Track Documentation Coverage

```python
# Count documented vs undocumented components
import ast
import glob

def count_classes(directory):
    classes = 0
    documented = 0
    
    for file in glob.glob(f"{directory}/**/*.py", recursive=True):
        with open(file) as f:
            tree = ast.parse(f.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    classes += 1
                    if ast.get_docstring(node):
                        documented += 1
    
    return classes, documented

total, documented = count_classes("src/")
print(f"Documentation coverage: {documented/total*100:.1f}%")
```

### Review Documentation Age

```bash
# Find docs not updated in 90+ days
find docs/ -name "*.md" -mtime +90
```

---

## 🆘 Troubleshooting

### Doc Generator Fails

**Error:** `Cannot find module 'src'`
- **Fix:** Run from project root directory

**Error:** `Permission denied`
- **Fix:** `chmod +x generate-docs.ps1` (Linux/Mac)
- **Fix:** Unblock file (Windows): `Unblock-File generate-docs.ps1`

### Git Hook Not Running

**Problem:** Docs not auto-updating on commit
- **Check:** `git config core.hooksPath` → should show `.githooks`
- **Fix:** `git config core.hooksPath .githooks`
- **Check:** `.githooks/pre-commit` has execute permission

### Broken Links

**Problem:** Links returning 404
- **Check:** Use relative paths for internal links
- **Fix:** `../SECURITY.md` not `/SECURITY.md`
- **Tool:** Run `markdown-link-check` to find all broken links

---

## 📚 Resources

- **Markdown Guide**: https://www.markdownguide.org/
- **GitHub Markdown**: https://github.github.com/gfm/
- **Docusaurus**: https://docusaurus.io/ (for static sites)
- **MkDocs**: https://www.mkdocs.org/ (Python documentation)

---

**Maintained by:** Data Engineering Team  
**Last Updated:** 2026-03-31  
**Questions?** Open an issue with the `documentation` label
