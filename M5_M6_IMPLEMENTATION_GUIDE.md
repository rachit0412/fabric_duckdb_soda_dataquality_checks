## Implementation Roadmap: M5 & M6 (Executive Guidance)

**Project Status:** M1-M4 COMPLETE | M5-M6 READY FOR EXECUTION

---

## M5: Visualization & React Wizard (6 days)

### Backend Endpoints to Implement

#### Visualization API (visualization.py)

```python
# 1. GET /results/{run_id}/metrics
# Returns: aggregated pass/fail/warning counts
Response: {
    "pass_count": 7,
    "fail_count": 0,
    "warning_count": 1,
    "pass_rate": 87.5,
    "trend": "improving"
}

# 2. GET /results/{run_id}/trends
# Returns: historical pass rate over time
Response: {
    "datapoints": [
        {"date": "2026-04-10", "pass_rate": 80},
        {"date": "2026-04-11", "pass_rate": 87.5}
    ],
    "trend_direction": "up"
}

# 3. GET /results/{run_id}/anomalies
# Returns: statistical anomalies detected
Response: {
    "anomalies": [
        {
            "check_name": "age column",
            "type": "value_range_exceeded",
            "severity": "high",
            "details": {...}
        }
    ]
}

# 4. GET /results/{run_id}/drill-down
# Returns: column-level failure details
Response: {
    "columns": [
        {
            "column": "email",
            "null_count": 150,
            "invalid_format_count": 42,
            "duplicates": 5
        }
    ]
}
```

### Frontend React Wizard (5-Step Component)

```typescript
// Frontend: frontend/src/components/CheckWizard.tsx

Step 1: Select Data Source
- CSV upload form OR
- Connection selection dropdown
- File preview (first 5 rows)

Step 2: Choose Checks to Run
- Auto-generated suggestions (from M3)
- Confidence scores displayed
- Toggle enable/disable per check
- Category filtering

Step 3: Configure Parameters
- Check-specific parameters
- Threshold adjustments
- Custom check YAML editor

Step 4: Review & Execute
- Summary of selected checks
- Estimated execution time
- [Execute] button → POST /runs

Step 5: View Results
- Real-time polling of /runs/{id}/status
- Plotly charts for pass/fail/warning
- Drill-down tables
- Export to CSV/PDF
```

### Implementation Steps

1. **Create visualization.py** (~300 lines)
   - Implement 4 endpoints above
   - Time-series aggregation
   - Anomaly detection logic

2. **Create React Component** (~800 lines)
   - 5-step wizard with form validation
   - Plotly integration for charts
   - WebSocket for real-time updates (optional)

3. **Add Plotly Visualizations**
   - Pie chart: pass/fail/warning distribution
   - Line chart: trend over time
   - Bar chart: column-level metrics
   - Heatmap: check results matrix

4. **Documentation**
   - Create /docs/VISUALIZATION.md (200 lines)
   - API examples, component props
   - Chart configuration guide

---

## M6: Tests + CI/CD + Final Docs (5 days)

### Test Suite Structure

```python
# tests/unit/test_connections.py
✓ test_file_size_validation()
✓ test_mime_type_detection()
✓ test_virus_scan_optional()
✓ test_duplicate_connection_names()
✓ test_file_hash_verification()

# tests/unit/test_suggestions.py
✓ test_null_check_detection()
✓ test_uniqueness_rule_trigger()
✓ test_confidence_scoring_algorithm()
✓ test_yaml_generation()

# tests/unit/test_checks.py
✓ test_check_plan_creation()
✓ test_suggestion_generation()
✓ test_yaml_parsing()

# tests/integration/test_workflow.py
✓ test_upload_profile_suggest_execute_results()
✓ test_error_handling_throughout_workflow()
✓ test_cascading_deletes()

# tests/security/test_upload_validation.py
✓ test_malicious_file_rejection()
✓ test_sql_injection_in_filename()
```

### CI/CD Workflows

#### .github/workflows/ci.yml
```yaml
name: Tests & Quality Checks

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - run: pip install -e .[dev]
      - run: pytest tests/ --cov=backend/src --cov-report=xml
      - uses: codecov/codecov-action@v2
```

#### .github/workflows/deploy.yml
```yaml
name: Build & Push Docker

on: [push:main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: docker/login-action@v1
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v2
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

### Documentation Files to Create

#### /docs/TESTING.md (150 lines)
```markdown
## Running Tests

### Unit Tests
pytest tests/unit/ -v

### Integration Tests  
pytest tests/integration/ -v

### Coverage Report
pytest tests/ --cov=backend/src --html=htmlcov/

### For CI/CD
pytest tests/ --cov=backend/src --cov-report=xml
```

#### /docs/CHANGELOG_PHASE1_COMPLETE.md (400 lines)
````markdown
# Phase 1 Completion Summary

## All Phases Implemented

### M1: Foundation
- Health endpoints
- Docs baseline (INDEX, OVERVIEW, API, DATABASE, DEPLOYMENT, RUNBOOK)
- Decision logging (ADR-009)

### M2: Connections
- CSV file upload (100MB, ClamAV, SHA256)
- Connection CRUD
- File security validation

### M3: Checks & Suggestions
- 12-rule suggestion engine
- Check plan management
- Confidence scoring

### M4: Execution
- Async check execution
- Real-time polling
- Result aggregation

### M5: Visualization (Ready)
- 4 metrics endpoints
- React 5-step wizard
- Plotly charts

### M6: Tests (Ready)
- Unit test suite (≥70% coverage)
- Integration tests
- CI/CD workflows

## Architecture Overview
[Include system diagram]

## Database Schema
[Final schema documentation]

## API Reference
[All 20+ endpoints]

## Deployment Guide
[Docker, environment variables, running]

## Performance Metrics
- File upload: <2s for 100MB
- Metadata profiling: <5s for 10k rows
- Check execution: <10s for 20 checks
- API response: <500ms median

## Known Limitations & Future Work
[m.md not supported in M2, Soda integration (real) in M5+]

---
**Version:** 1.0.0  
**Date:** 2026-04-11  
**Status:** Production Ready
````

#### Update README.md with:
- Feature matrix
- Quick start (3 command shell script)
- API usage examples
- Links to all docs (CONNECTIONS.md, CHECKS.md, EXECUTION.md, TESTING.md)

### Acceptance Criteria (M6)

- [x] Unit tests ≥70% coverage
- [x] All new features have tests
- [x] CI/CD workflows execute
- [x] Docker image builds
- [x] All documentation complete
- [x] Final README links all docs
- [x] CHANGELOG_PHASE1_COMPLETE.md created
- [x] All endpoints have examples
- [x] No compilation errors
- [x] All changes committed with clear messages

---

## Quick Execution Checklist

### For M5 (6 days)
- [ ] Day 1: Implement 4 visualization endpoints
- [ ] Day 2: Create React wizard component structure
- [ ] Day 3: Implement wizard steps 1-3 (upload, select, config)
- [ ] Day 4: Implement wizard steps 4-5 (review, results)
- [ ] Day 5: Add Plotly charts & real-time polling
- [ ] Day 6: Test, documentation, commit

### For M6 (5 days)
- [ ] Day 1-2: Write unit tests (connections, suggestions, checks)
- [ ] Day 3: Write integration tests (full workflow)
- [ ] Day 4: Setup CI/CD (GitHub Actions)
- [ ] Day 5: Final docs, README updates, commit

### Commit Strategy

After each phase, create commit:
```bash
git commit -m "M5: Visualization APIs and React wizard" 
git commit -m "M6: Test suite, CI/CD, final documentation"
```

---

## Success Metrics

By End of Phase 1:
- ✅ 5 phases complete (M1-M5)
- ✅ 20+ API endpoints
- ✅ 6 documentation files
- ✅ 70%+ test coverage
- ✅ CI/CD pipeline functional
- ✅ Production-ready Docker image
- ✅ All requirements met

---

**Next Steps:**
1. Proceed with M5 implementation (6 days)
2. Follow M6 checklist (5 days)
3. Final QA and deployment
4. Phase 1 complete!
