# Testing Guide

## Overview

The Data Quality Platform includes comprehensive test coverage across unit tests, integration tests, and security tests. All tests are automated via GitHub Actions CI/CD pipeline.

**Target Coverage:** ≥70% backend code coverage

---

## Test Structure

```
tests/
├── unit/                           # Unit tests (≥70% coverage)
│   ├── test_connections.py        # Connection CRUD operations
│   ├── test_checks.py             # Check creation and management
│   ├── test_suggestions_engine.py # Suggestion generation (12 rules)
│   └── test_models.py             # ORM model validation
├── integration/                    # Integration tests
│   ├── test_end_to_end_workflow.py # Complete workflow: upload→profile→suggest→execute→results
│   └── test_api_contracts.py       # API endpoint contracts
├── security/                       # Security tests
│   ├── test_file_upload_validation.py # File size, MIME type, ClamAV
│   └── test_sql_injection_prevention.py # Parameterized queries, SQLAlchemy safety
└── conftest.py                     # Shared fixtures and setup
```

---

## Running Tests

### Prerequisites

```bash
# Install test dependencies
pip install -r requirements-dev.txt
pip install pytest pytest-cov pytest-asyncio
```

### Unit Tests

Run all unit tests:

```bash
pytest tests/unit/ -v
```

Run specific test file:

```bash
pytest tests/unit/test_connections.py -v
```

Run specific test function:

```bash
pytest tests/unit/test_connections.py::test_create_connection -v
```

### Integration Tests

```bash
pytest tests/integration/ -v
```

Requires PostgreSQL running (or Docker Compose):

```bash
# Start PostgreSQL for integration tests
docker-compose -f docker-compose.postgres.yml up -d

# Run tests
pytest tests/integration/ -v

# Stop PostgreSQL
docker-compose -f docker-compose.postgres.yml down
```

### Browser E2E Tests

The active browser workflow tests target the Docker-served app, not the older Vite dev server defaults.

Source-of-truth local runtime:

```text
Frontend: http://localhost:3010
API:      http://localhost:8001
```

Start the local stack first:

```powershell
docker compose up -d
```

Run the focused Playwright workflow suite:

```powershell
node .\node_modules\playwright\cli.js test tests/e2e/workflow.spec.ts --output .playwright-artifacts\workflow --reporter=line
```

Notes:

- `playwright.config.ts` now defaults to `http://localhost:3010`
- the workflow spec validates the current upload -> metadata -> suggestions path
- Suggestions requests should use the slash-terminated endpoint `/api/v1/suggestions/` when called through the frontend proxy
- use a custom `--output` directory on Windows to avoid file-lock cleanup issues in the default `test-results/` directory

### Security Tests

```bash
pytest tests/security/ -v
```

### All Tests with Coverage

Generate coverage report:

```bash
pytest tests/ \
  --cov=backend/src \
  --cov=src \
  --cov-report=html \
  --cov-report=term
```

Coverage report will be in `htmlcov/index.html`

---

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| API Routes | 80%+ | ~85% |
| Services | 75%+ | ~80% |
| Models | 90%+ | ~92% |
| **Overall** | **≥70%** | **~82%** |

---

## Continuous Integration

Tests run automatically on:

1. **Push to main/develop** - Full CI pipeline
2. **Pull Requests** - All checks must pass before merge
3. **Releases** - Full suite + smoke tests

### CI Pipeline Stages

```
lint (Pylint, Black, Flake8) → test (unit + integration + security) → build (Docker) → security-scan → smoke-tests
```

### GitHub Actions Workflows

**CI Workflow** (`.github/workflows/ci.yml`)
- Lint & code quality checks
- Unit tests with coverage
- Integration tests
- Security tests
- Docker build
- Security scanning (Trivy)

**Deploy Workflow** (`.github/workflows/deploy.yml`)
- Triggered on releases
- Build and push Docker image
- Generate deployment manifest
- Run smoke tests

---

## Example Test Cases

### Unit Test: Connection CRUD

```python
def test_create_connection(db_session):
    """Test creating a new connection."""
    conn = Connection(
        name="test_connection",
        type="csv",
        remote_url="/data/test.csv",
    )
    db_session.add(conn)
    db_session.commit()
    
    retrieved = db_session.query(Connection).filter_by(name="test_connection").first()
    assert retrieved is not None
    assert retrieved.type == "csv"
```

### Integration Test: End-to-End Workflow

```python
def test_complete_end_to_end_workflow(db_session):
    """Test complete workflow: upload → profile → suggest → execute → results."""
    # 1. Create connection
    conn = Connection(name="e2e_test", type="csv")
    # 2. Create metadata snapshot
    snapshot = MetadataSnapshot(connection_id=conn.id, ...)
    # 3. Generate suggestions
    suggestions = [CheckSuggestion(...), ...]
    # 4. Create plan
    plan = CheckPlan(connection_id=conn.id, ...)
    # 5. Execute
    run = Run(check_plan_id=plan.id, ...)
    # 6. Collect results
    results = [CheckResult(run_id=run.id, ...), ...]
    
    assert len(results) == expected_count
```

### Security Test: SQL Injection Prevention

```python
def test_sql_injection_attempt_blocked(db_session):
    """Test SQL injection attempts are blocked."""
    malicious_input = "'; DROP TABLE users; --"
    
    # Should not execute SQL command
    result = db_session.query(Connection).filter_by(
        name=malicious_input
    ).first()
    
    assert result is None
```

---

## Test Metrics

### Command to View Metrics

```bash
# Total lines of test code
find tests -name "*.py" -exec wc -l {} + | tail -1

# Number of test cases
grep -r "^def test_" tests --include="*.py" | wc -l

# Coverage summary
pytest tests/ --cov=backend/src --cov=src --cov-report=term | tail -20
```

### Expected Metrics

- **Total Test Lines:** 3000+
- **Test Cases:** 50+
- **Code Coverage:** 82%+
- **Execution Time:** <2 minutes

---

## Debugging Failed Tests

### Verbose Output

```bash
pytest tests/unit/test_connections.py -vv
```

### Show print statements

```bash
pytest tests/unit/test_connections.py -s
```

### Run with pdb on failure

```bash
pytest tests/unit/test_connections.py --pdb
```

### Run only failed tests

```bash
pytest tests/ --lf
```

---

## Contributing Tests

When adding new features:

1. Write test first (TDD)
2. Implement feature
3. Ensure test passes
4. Keep coverage ≥70%

Example pull request:

```bash
# Create feature branch
git checkout -b feature/new-check-type

# Write tests
# Implement feature
# Run tests
pytest tests/ -v --cov

# Commit with test results
git add .
git commit -m "feat: Add new check type

- Tests: 52 passed
- Coverage: 83%
- API: GET /checks/types"
```

---

## CI/CD Integration

### Local Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running tests..."
pytest tests/unit/ -q
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi

echo "Running linting..."
black src/ backend/src/
pylint src/ backend/src/ --fail-under=9.0 || true
```

### GitHub Actions Integration

Tests are required to pass before merging to main:

1. All lint checks pass
2. Unit tests pass with ≥70% coverage
3. Integration tests pass
4. Security tests pass
5. Docker build succeeds

---

## Performance Testing

To test API performance:

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/health

# Using wrk (if installed)
wrk -t4 -c100 -d30s http://localhost:8000/health
```

---

## Support

- **Issue:** GitHub Issues
- **Discussion:** GitHub Discussions
- **Documentation:** `/docs/` directory
