# CI/CD Pipeline Documentation

## Overview

The Data Quality Platform uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, test coverage, security scanning, and reliable deployments.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌──────────────┐            ┌──────────────┐
        │  PR Workflow │            │ Release Flow │
        └──────────────┘            └──────────────┘
                │                           │
    ┌───────────┴─────────────┐   ┌────────┴──────────┐
    │                         │   │                   │
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│ Lint    │ │ Test     │ │ Build   │ │ Deploy   │ │  Smoke   │
│         │ │          │ │         │ │          │ │  Tests   │
└─────────┘ └──────────┘ └─────────┘ └──────────┘ └──────────┘
  ↓          ↓            ↓           ↓            ↓
 Pass/      Pass/        Push to     Publish      Validate
 Fail       Fail         Registry    Release      Live
```

---

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

#### Lint Job
- **Language:** Python
- **Tools:** Black, Pylint, Flake8, isort
- **Duration:** 2-3 minutes
- **Checks:**
  - Code formatting (Black)
  - Code quality (Pylint, score ≥9.0)
  - Style (Flake8)
  - Import sorting (isort)

#### Test Job
- **Language:** Python
- **Framework:** pytest
- **Duration:** 5-10 minutes
- **Requirements:**
  - PostgreSQL service (running in Docker)
  - Python 3.11

**Test Suites:**
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Security tests: `tests/security/`

**Coverage:**
- Target: ≥70% backend code
- Reports published to Codecov
- Tool: pytest-cov

#### Build Job
- **Language:** Docker
- **Duration:** 3-5 minutes
- **Outputs:** Docker image published to ghcr.io
- **Tags:** branch, semver, sha

**Build Configuration:**
- Dockerfile: `./Dockerfile`
- Registry: GitHub Container Registry (ghcr.io)
- Buildx: Used for efficient multi-platform builds

#### Frontend Build Job
- **Language:** Node.js 18
- **Build Tool:** Vite
- **Duration:** 2-3 minutes
- **Outputs:** Compiled frontend in `dist/`

#### Security Scan Job
- **Tool:** Trivy
- **Scope:** Filesystem vulnerability scan
- **Output:** SARIF format for GitHub Security tab
- **Duration:** 2-3 minutes

---

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Release created (`github.event.release.created`)
- Manual workflow dispatch

**Jobs:**

#### Deploy Job
- **Duration:** 5-10 minutes
- **Actions:**
  1. Extract release version from tag (`v1.2.3` → `1.2.3`)
  2. Login to GitHub Container Registry
  3. Build and push Docker image with version tags
  4. Generate deployment manifest
  5. Create/update release notes

**Tags Applied:**
- `latest` - Always points to latest release
- `1.2.3` - Full semantic version
- `1.2` - Minor version (allows patch updates)
- `sha-abc1234` - Git commit SHA

#### Smoke Tests Job
- **Framework:** Playwright
- **Duration:** 3-5 minutes
- **Scope:** Basic endpoint validation
- **Artifacts:** HTML test report

**Smoke Tests Check:**
```bash
GET /health → 200
POST /connections → 201 (with valid data)
GET /checks → 200
```

---

## Configuration Files

### `.github/workflows/ci.yml`

Key environment variables:
```yaml
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

### `.github/workflows/deploy.yml`

Key environment variables:
```yaml
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

---

## Running Locally

### Install GitHub CLI

```bash
# macOS
brew install gh

# Linux
curl -fsSLo - https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Simulate CI Checks Locally

```bash
# Linting
black --check src/ backend/src/ tests/
pylint src/ backend/src/ tests/
flake8 src/ backend/src/ tests/

# Testing
pytest tests/ --cov=backend/src --cov-report=term

# Docker build
docker build -t data-quality:test .
```

---

## Common Issues & Solutions

### Issue: Tests fail locally but pass in CI

**Causes:**
- Different Python versions
- Missing database fixtures
- Timezone differences
- PORT conflicts

**Solution:**
```bash
# Match CI environment
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest tests/ -v
```

### Issue: Docker build fails in CI but works locally

**Causes:**
- Buildx cache issues
- Missing secrets/credentials
- PATH differences

**Solution:**
```bash
# Clear buildx cache
docker buildx prune -a

# Rebuild without cache
docker build --no-cache -t data-quality:test .
```

### Issue: Codecov upload fails

**Causes:**
- Missing CODECOV_TOKEN
- Coverage file not found
- Network timeout

**Solution:**
```bash
# Verify coverage file exists
ls -la coverage.xml

# Upload manually
pip install codecov
codecov -f coverage.xml -t $CODECOV_TOKEN
```

---

## Secrets Management

### Required Secrets

```
GITHUB_TOKEN        # Automatically provided by GitHub
CODECOV_TOKEN       # For codecov.io integration
DOCKER_HUB_TOKEN    # If pushing to Docker Hub
DOCKER_HUB_USER     # Docker Hub username
```

### Setting Secrets

```bash
# Via GitHub CLI
gh secret set CODECOV_TOKEN --body "your_token_here"

# Or: Settings → Secrets → Actions → New repository secret
```

---

## Metrics & Monitoring

### Build Status Badge

Add to README.md:

```markdown
![CI Status](https://github.com/${{ github.repository }}/actions/workflows/ci.yml/badge.svg)
```

### Coverage Badge

```markdown
[![codecov](https://codecov.io/gh/${{ github.repository }}/branch/main/graph/badge.svg)](https://codecov.io/gh/${{ github.repository }})
```

### View Workflow Runs

```bash
# List recent runs
gh run list --workflow=ci.yml --limit=10

# View specific run details
gh run view <RUN_ID>

# View logs
gh run view <RUN_ID> --log
```

---

## Performance Optimization

### Cache Strategy

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

### Parallel Jobs

Jobs that can run in parallel (no dependencies):
- Lint & Build Frontend
- Security Scan

Jobs with dependencies:
- Test → Build → Deploy (sequential)

---

## Deployment Process

### Prerequisites

1. Docker image built and pushed to ghcr.io
2. All tests passing
3. Security scan passed
4. Smoke tests passed

### Manual Deployment

```bash
# List available releases
gh release list

# Get deployment manifest
gh release view <VERSION> --json body

# Deploy using Docker
docker pull ghcr.io/your-repo/data-quality:1.0.0
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  ghcr.io/your-repo/data-quality:1.0.0
```

### Rollback

```bash
# Pull previous version
docker pull ghcr.io/your-repo/data-quality:0.9.9

# Stop current container
docker stop data-quality-api

# Start previous version
docker run -d \
  --name data-quality-api \
  -p 8000:8000 \
  ghcr.io/your-repo/data-quality:0.9.9
```

---

## Best Practices

### 1. Write Tests First
Always add tests alongside new features.

### 2. Keep Commits Small
Easier to debug failed CI runs.

### 3. Use Conventional Commits
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add tests
ci: Update CI/CD
```

### 4. Monitor Action Runs
- Check failed runs immediately
- Review logs for root causes
- Fix issues before merging

### 5. Keep Dependencies Updated
```bash
# Check for outdated packages
pip list --outdated
npm outdated

# Update safely
pip install --upgrade package-name
npm update package-name
```

---

## Troubleshooting

### Debug Failed Workflow

1. Check **Actions** tab in GitHub
2. Click failed workflow run
3. Review job logs
4. Look for error messages
5. Reproduce locally if possible

### Enable Debug Logging

```bash
# Set secret for debug logging
gh secret set ACTIONS_STEP_DEBUG --body "true"

# Workflows will now produce debug output
```

---

## Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Codecov Integration](https://docs.codecov.io/docs)
- [Trivy Scanner](https://aquasecurity.github.io/trivy/)
- [Playwright Testing](https://playwright.dev/)

---

**Last Updated:** 2026-04-11  
**Version:** 1.0.0  
**Maintained By:** Engineering Team
