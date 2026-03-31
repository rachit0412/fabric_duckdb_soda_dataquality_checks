# Git Hooks for Documentation Automation

## Setup

Enable custom hooks directory:

```bash
git config core.hooksPath .githooks
```

## Available Hooks

### pre-commit
Automatically regenerates documentation when Python source files are modified.

**Triggers on:**
- Any `.py` file change
- `src/api/server.py` (API endpoints)
- `src/__init__.py` (version updates)

**Actions:**
1. Runs `generate-docs.ps1`
2. Stages updated documentation files
3. Includes them in the commit

**Generated files:**
- `docs/API_REFERENCE.md`
- `docs/COMPONENTS.md`
- `docs/QUICK_REFERENCE.md`
- `README.md` (version stamp update)

## Manual Documentation Update

If you need to update docs without committing:

```powershell
.\generate-docs.ps1
```

## Disable Hooks Temporarily

```bash
git commit --no-verify
```

## Uninstall Hooks

```bash
git config --unset core.hooksPath
```
