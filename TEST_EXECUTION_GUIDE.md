"""
TEST EXECUTION GUIDE - PHASE 2B VALIDATION

This guide explains how to run the comprehensive test suite created in PHASE 2B.
The 125 HIGH-priority edge case tests are divided into:
- Unit tests (mockable, no API needed)
- Integration tests (require running API)
- Acceptance tests (require full stack)

================================================================================
PREREQUISITES
================================================================================

1. Python Environment
   □ Python 3.9+
   □ pytest 8.3.0+
   □ Requirements installed: pip install -r requirements-dev.txt

2. Running API Server (for integration tests)
   □ Start backend: python backend/src/main.py
   □ Or via Docker: docker-compose up -d api

3. Test Data
   □ Database initialized with schema
   □ Sample connections configured
   □ Connections table populated

================================================================================
TEST CATEGORIES
================================================================================

Category 1: Unit Tests (Can run standalone with mocks)
───────────────────────────────────────────────────────
File: test_*_scenarios.py (non-API marked tests)
Marker: @pytest.mark.unit
Requires: None (all mocked)
Command: pytest tests/ -m unit -v

Examples:
- Data transformation validation
- Input validation edge cases
- Error handling paths
- Fixture correctness

Category 2: Integration Tests (Require running API)
─────────────────────────────────────────────────────
File: test_auth_scenarios.py
File: test_multitenant_scenarios.py  
File: test_api_behavior_scenarios.py
File: test_security_scenarios.py
Marker: @pytest.mark.integration or @pytest.mark.api
Requires: FastAPI server running on localhost:8000
Command: pytest tests/test_*_scenarios.py -v

Setup:
1. Start API: docker-compose up -d api postgres nginx
2. Wait for API to be ready: curl -s http://localhost:8000/api/health
3. Run tests: pytest tests/test_*_scenarios.py::TestAuth* -v

Category 3: E2E Tests (Require deployment)
───────────────────────────────────────────
File: tests/e2e/ (to be created in PHASE 3)
Marker: @pytest.mark.e2e
Requires: Full stack (frontend + API + database)
Command: docker-compose up && pytest tests/e2e/ -v

================================================================================
QUICK START: Run Tests
================================================================================

Option 1: Unit Tests Only (fast, no dependencies)
─────────────────────────────────────────────────
$ pytest tests/test_*_scenarios.py -v -k "not (integration or api or e2e)" --tb=short

Expected: ~54 tests pass in <5 seconds

Option 2: Integration Tests (requires running API)
──────────────────────────────────────────────────
# Terminal 1: Start API
$ docker-compose up -d api postgres

# Terminal 2: Run tests
$ pytest tests/test_auth_scenarios.py tests/test_api_behavior_scenarios.py -v

Expected: ~40+ tests pass in <10 seconds

Option 3: Full Test Suite (requires full stack)
───────────────────────────────────────────────
$ docker-compose up  # Start all services

$ pytest tests/ -v --tb=short

Expected: 100+ tests pass in <20 seconds

================================================================================
RUNNING SPECIFIC TEST SUITES
================================================================================

Authentication Tests:
$ pytest tests/test_auth_scenarios.py -v
Expected: 11 tests
Requires: API running

Multitenant Tests:
$ pytest tests/test_multitenant_scenarios.py -v
Expected: 14 tests
Requires: API running

Data Quality Tests:
$ pytest tests/test_data_quality_scenarios.py -v
Expected: 16 tests
Requires: API + sample data

UI State Tests:
$ pytest tests/test_ui_state_scenarios.py -v -m "not slow"
Expected: 12 tests
Requires: API

API Behavior Tests:
$ pytest tests/test_api_behavior_scenarios.py -v
Expected: 18 tests
Requires: API

Concurrency Tests:
$ pytest tests/test_concurrency_scenarios.py -v -m "not slow"
Expected: 10 tests
Requires: API

Resilience Tests:
$ pytest tests/test_resilience_scenarios.py -v -m "not slow"
Expected: 17 tests
Requires: API

Security Tests:
$ pytest tests/test_security_scenarios.py -v
Expected: 18 tests
Requires: API

================================================================================
COMMON ISSUES & SOLUTIONS
================================================================================

Issue: "ConnectionError: Failed to connect to http://localhost:8000"
───────────────────────────────────────────────────────────────────
Solution:
1. Start API: docker-compose up -d api
2. Wait 5 seconds for startup
3. Verify: curl http://localhost:8000/api/connections
4. Run tests: pytest tests/

Issue: "401 Unauthorized - expected 401, got 401"
─────────────────────────────────────────────────
Solution: This is usually PASSING - test assertion might be wrong
Review test carefully or check fixture auth_fixtures.py

Issue: ImportError in fixtures
─────────────────────────────────
Solution:
1. Ensure conftest.py registers fixtures correctly
2. Check: pytest --fixtures | grep "valid_user"
3. Re-run: pytest tests/ --collect-only

Issue: "Timeout" errors
──────────────────────
Solution:
1. API may be slow: check docker logs: docker-compose logs api
2. Increase timeout: pytest tests/ --timeout=30
3. Check network: docker-compose ps

Issue: Tests skip with "xfail or skip"
──────────────────────────────────────
Solution: Expected for tests requiring:
- Playwright browser automation
- Full E2E workflow
- Circuit breaker implementation
- Cache fallback testing

These are covered in PHASE 3 (Playwright) and documented accordingly.

================================================================================
CI/CD INTEGRATION
================================================================================

GitHub Actions Configuration (.github/workflows/test.yml):

name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v3
      
      - name: Start API
        run: docker-compose up -d api
      
      - name: Wait for API
        run: |
          for i in {1..30}; do
            if curl -s http://localhost:8000/api/connections > /dev/null; then
              exit 0
            fi
            sleep 1
          done
          exit 1
      
      - name: Run Tests
        run: |
          pytest tests/ -v --tb=short --cov=src --cov-report=xml
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3

================================================================================
COVERAGE REPORTING
================================================================================

Generate Coverage Report:
$ pytest tests/ --cov=src --cov-report=html --cov-report=term-missing

View HTML Report:
$ open htmlcov/index.html

Target Metrics:
- Overall Coverage: ≥85%
- Critical Modules (api, core): ≥90%
- Test Coverage: 100+ edge cases across 8 dimensions

================================================================================
NEXT STEPS: PHASE 3 & 4
================================================================================

After PHASE 2B tests validate:

PHASE 3: Playwright Browser Automation Framework
- Add tests/e2e/ directory
- Create Playwright tests for UI workflows
- Cover wizard flow end-to-end
- Validate visual regression

PHASE 4: Test-Fix-Retest Loop
- Run full test suite
- Fix failures methodically
- Retest until 100% pass rate
- Achieve zero flakiness
- Document known issues

See PHASE2B_TEST_IMPLEMENTATION_COMPLETE.md for details.

================================================================================
REFERENCE DOCUMENTATION
================================================================================

Files to Review:
- tests/conftest.py - Fixture registration + marker configuration
- tests/fixtures/auth_fixtures.py - Authentication test fixtures
- tests/fixtures/data_fixtures.py - Data quality test fixtures
- tests/fixtures/mock_services.py - Service failure mocks
- PHASE2_EDGE_CASE_MATRIX.md - Complete test specifications
- PHASE2B_TEST_IMPLEMENTATION_COMPLETE.md - Implementation status

Command Reference:
$ pytest --fixtures           # List all available fixtures
$ pytest --markers            # List custom markers
$ pytest --collect-only       # Show all discoverable tests
$ pytest -v -x                # Stop on first failure (useful for debugging)
$ pytest -v -k "auth"         # Run only tests matching keyword
"""
