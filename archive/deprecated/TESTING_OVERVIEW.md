# 📊 Testing Structure Overview

**Repository**: Fabric DuckDB Soda Data Quality Platform  
**Discovery Date**: 2026-04-02  
**Test Framework Mix**: pytest + Playwright

---

## 🎯 At a Glance

```
TESTING ARCHITECTURE
═════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                        │
│              azure-pipelines.yml (YAML)                 │
│  Build → Quality Gates → Test Reports → Coverage        │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Python Tests │   │ E2E Tests    │   │ Quick Tests  │
    │  (pytest)    │   │(Playwright)  │   │              │
    ├──────────────┤   ├──────────────┤   ├──────────────┤
    │ 23+ tests    │   │ 22+ tests    │   │ 7 steps      │
    │ 5-10s        │   │ 30-60s       │   │ 3-5s         │
    │ /tests/      │   │ /tests/e2e/  │   │ Root         │
    └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 📈 Test Count Summary

```
TOTAL TESTS: 60+
═══════════════════════════════════════════════════════════

Python (Backend Testing)
├── Unit Tests ........................... 23 tests
│   ├── tests/unit/test_soda_checks_display.py .... 15
│   ├── tests/test_scanner.py ..................... 8
│   └── tests/test_e2e.py ........................ 5-8
│
├── Quick System .......................... 7 steps
│   ├── test_quick.py ............................ 7
│   └── test_rule_filtering.py ................... 5+
│
└── Total Python .......................... ~43+ tests

Playwright (Frontend Testing)
├── E2E Tests ............................ 22+ tests
│   ├── tests/e2e/soda_checks_fixes.spec.ts ....... 14
│   ├── tests/e2e/api.spec.ts .................... 5+
│   └── tests/e2e/workflow.spec.ts ............... 6+
│
└── Total E2E ............................ 22+ tests

═══════════════════════════════════════════════════════════
GRAND TOTAL: 65+ Automated Test Cases
```

---

## 🗂️ Test File Locations

```
PROJECT ROOT
│
├── 📄 TEST_INVENTORY.md ..................... Complete inventory (this discovery)
├── 📄 TEST_COMMANDS_REFERENCE.md ........... Quick commands cheatsheet
├── 📄 TESTING_PLAN.md ..................... Test strategy & examples
├── 📄 TESTING_GUIDE.md .................... Quick reference
│
├── 📂 tests/
│   ├── 📄 test_scanner.py ................. 8 unit tests (scanner, profiler)
│   ├── 📄 test_e2e.py .................... 5-8 integration tests (API)
│   ├── 📂 unit/
│   │   └── 📄 test_soda_checks_display.py . 15 unit tests (SODA library)
│   └── 📂 e2e/
│       ├── 📄 soda_checks_fixes.spec.ts ... 14 E2E tests (Playwright)
│       ├── 📄 api.spec.ts ................. 5+ E2E tests (API)
│       └── 📄 workflow.spec.ts ............ 6+ E2E tests (Full flow)
│
├── 📄 test_quick.py ....................... 7-step system check
├── 📄 test_rule_filtering.py .............. API endpoint validation
│
├── 📄 playwright.config.ts ................ Playwright configuration
├── 📄 requirements-dev.txt ................ Testing dependencies
├── 📄 requirements.txt .................... Production deps (used by tests)
│
└── 📄 azure-pipelines.yml ................. CI/CD configuration
```

---

## ⚡ Command Quick Matrix

```
TEST EXECUTION MATRIX
═════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│ COMMAND                         │ TESTS  │ TIME │ SOURCE │
├─────────────────────────────────────────────────────────┤
│ pytest tests/ -v                │ 23+   │ 5-10s│ Python │
│ pytest tests/unit/ -v           │ 15    │ 3-5s │ Python │
│ pytest tests/test_*.py -v       │ 13    │ 5-10s│ Python │
│ python test_quick.py            │ 7     │ 3-5s │ Python │
│ python test_rule_filtering.py   │ 5+    │ 5-10s│ Python │
├─────────────────────────────────────────────────────────┤
│ npm run test:e2e                │ 22+   │ 30-60│ Node   │
│ npm run test:e2e:ui             │ ∞     │ ∞    │ Node   │
│ npm run test:api                │ -     │ 5-10 │ Node   │
├─────────────────────────────────────────────────────────┤
│ pytest ... --cov=src            │ 23+   │ 8-12s│ Python │
│ pytest ... --cov-report=html    │ 23+   │ 8-12s│ Python │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Types Breakdown

### 1. Unit Tests
```
Purpose: Test individual functions/classes
Framework: pytest 8.3.0
Files: 3 (test_soda_checks_display.py, test_scanner.py, test_e2e.py)
Tests: 23+
Duration: 5-10s
Dependencies: ✅ None (run standalone)

Key Test Classes:
├── TestSodaChecksDisplay (15 tests)
│   ├── test_soda_checks_library_populated
│   ├── test_type_aware_filtering_*
│   ├── test_all_checks_section_*
│   ├── test_metadata_persistence_*
│   └── test_complete_check_selection_workflow
│
├── TestEnhancedDataQualityScanner (5 tests)
│   ├── test_scanner_initialization
│   ├── test_load_data
│   ├── test_parse_scan_results
│   ├── test_scan_result_to_dict
│   └── test_profile_dataframe
│
└── TestAnomalyDetector (8 tests)
    ├── test_detect_anomalies
    └── test_detect_numeric_outliers
```

### 2. E2E Tests
```
Purpose: Test complete user workflows
Framework: Playwright 1.59.1 + TypeScript
Files: 3 (soda_checks_fixes.spec.ts, api.spec.ts, workflow.spec.ts)
Tests: 22+
Duration: 30-60s
Dependencies: ⏳ Frontend + Backend servers running

Key Test Suites:
├── Soda Checks Fixes (14 tests)
│   ├── Issue 1: Display checks (3 tests)
│   ├── Issue 2: Dropdown population (6 tests)
│   ├── Data flow & persistence (2 tests)
│   └── Console logging (1 test)
│
├── API Tests (5+ tests)
│   ├── Health check
│   ├── CSV upload
│   ├── Metadata profiling
│   ├── Check suggestions
│   └── Check plan creation
│
└── Workflow Tests (6+ tests)
    ├── Landing page load
    └── 5-step workflow navigation
```

### 3. Integration Tests
```
Purpose: Test API endpoints with database
Framework: pytest 8.3.0 + requests
Files: 1 (test_e2e.py)
Tests: 5-8
Duration: 10-15s
Dependencies: ⏳ PostgreSQL running (optional - skips if unavailable)

Key Test Methods:
├── test_01_create_connection_postgres
├── test_02_list_connections
├── test_03_profile_metadata
├── test_04_generate_suggestions
├── test_05_execute_checks
└── test_06_retrieve_results
```

### 4. Quick System Tests
```
Purpose: Validate system readiness
Framework: Standalone Python
Files: 2 (test_quick.py, test_rule_filtering.py)
Tests: 12 steps
Duration: 8-15s total
Dependencies: ✅ None (standalone validation)

Test Quick.py Steps:
├── 1️⃣ Import verification
├── 2️⃣ Test data creation
├── 3️⃣ Scanner initialization
├── 4️⃣ Run basic scan
├── 5️⃣ HTML report generation
├── 6️⃣ Data profiler validation
└── 7️⃣ Anomaly detector validation

Test Rule Filtering:
├── Profile endpoint validation
├── Rule filtering tests
└── CSV upload functionality
```

---

## 📦 Dependencies by Test Type

```
DEPENDENCY TREE
═════════════════════════════════════════════════════════════

Unit Tests
├── pytest 8.3.0 .......................... Core test framework
├── pytest-cov 6.0.0 ..................... Coverage reporting
├── pytest-asyncio 0.24.0 ................ Async test support
├── pytest-mock 3.14.0 ................... Mocking utilities
└── soda-core, duckdb, pandas ............ App dependencies

Code Quality (All Test Types)
├── pylint 3.3.0
├── flake8 7.1.0
├── black 24.10.0
├── mypy 1.13.0
└── isort 5.13.0

Security (Automated in CI)
├── bandit 1.8.0 ......................... Code security
└── safety 3.2.0 ......................... Dependency vulnerabilities

E2E Tests
├── @playwright/test 1.59.1 ............. Test framework
└── TypeScript/Node.js ................... Runtime

────────────────────────────────────────────────────────────
TOTAL DEV DEPENDENCIES: 13+ packages
INSTALL: pip install -r requirements-dev.txt
```

---

## 🚀 Execution Workflow

### Local Testing (3 Terminals)

```
┌─────────────────────────────────────────────────────────┐
│ TERMINAL 1: Backend Service                             │
├─────────────────────────────────────────────────────────┤
│ $ python main.py api --port 8000                        │
│ ✓ API listening on http://0.0.0.0:8000                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ TERMINAL 2: Frontend Service                            │
├─────────────────────────────────────────────────────────┤
│ $ cd services/frontend && npm start                     │
│ ✓ Frontend listening on http://localhost:3000           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ TERMINAL 3: Run Tests                                   │
├─────────────────────────────────────────────────────────┤
│ $ pytest tests/ -v              ← Python unit tests     │
│ $ npm run test:e2e              ← Playwright E2E        │
│ $ python test_quick.py          ← Quick system check    │
└─────────────────────────────────────────────────────────┘
```

### CI/CD Execution (Azure Pipelines)

```
┌─────────────────────────────────────────────────────────┐
│ TRIGGER: Push to main/develop or Pull Request           │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌─────────────────────────────────┐
        │ STAGE 1: Build & Test           │
        ├─────────────────────────────────┤
        │ ✓ Python version 3.10 setup     │
        │ ✓ Install dependencies          │
        │ ✓ pytest tests/ --cov=src       │
        │ ✓ Publish test results          │
        │ ✓ Publish code coverage         │
        └─────────────────────────────────┘
                            ↓
        ┌─────────────────────────────────┐
        │ STAGE 2: Quality Gates          │
        ├─────────────────────────────────┤
        │ ✓ pylint, flake8, black, mypy   │
        │ ✓ bandit (security)             │
        │ ✓ safety (dependencies)         │
        └─────────────────────────────────┘
                            ↓
        ┌─────────────────────────────────┐
        │ Results: Dashboard + Artifacts   │
        └─────────────────────────────────┘
```

---

## 📊 Coverage Targets

```
COVERAGE BY COMPONENT (From TESTING_PLAN.md)
═════════════════════════════════════════════════════════════

Component               Target    Current Est.   Status
─────────────────────────────────────────────────────────
Suggestion Engine       >= 85%    ~80%           ✅ High
Metadata Service        >= 70%    ~75%           ✅ High
API Routes              >= 60%    ~65%           ✅ Good
Soda Executor           >= 50%    ~55%           ✅ Good
UI Components           >= 40%    ~50%           ✅ Good
─────────────────────────────────────────────────────────
AVERAGE                 ~60%      ~65%           ✅ Good
```

---

## 🎯 Common Test Scenarios

### Scenario 1: "Is my code change working?"
```
$ python test_quick.py          (7 steps, 3-5s)
✓ All imports
✓ Test data created
✓ Scanner initialized
✓ Scan completed
✓ Report generated
✓ Profiler working
✓ Anomalies detected
→ Result: Ready for next steps
```

### Scenario 2: "Do my unit test changes work?"
```
$ pytest tests/ -v              (23+ tests, 5-10s)
→ Result: Files ready to commit
```

### Scenario 3: "Is the UI workflow broken?"
```
$ npm run test:e2e              (22+ tests, 30-60s)
→ Result: 5-step flow verified (or specific points failing)
```

### Scenario 4: "What's my test coverage?"
```
$ pytest tests/ --cov=src --cov-report=html
→ Result: htmlcov/index.html shows line-by-line coverage
```

### Scenario 5: "Did I break anything on the API?"
```
$ pytest tests/test_e2e.py -v   (5-8 tests, 10-15s)
$ python test_rule_filtering.py
→ Result: API endpoints validated
```

---

## 📋 Checklist: Running Tests Before Commit

```
PRE-COMMIT CHECKLIST
═════════════════════════════════════════════════════════════

Code Quality
□ pylint src/
□ flake8 src/
□ black --check src/
□ mypy src/ --ignore-missing-imports

Unit Tests
□ pytest tests/ -v
□ pytest tests/ --cov=src

System Health
□ python test_quick.py

E2E Tests (if needed)
□ python main.py api --port 8000 &
□ cd services/frontend && npm start &
□ npm run test:e2e

Final Check
□ All tests passing
□ No regressions
□ Coverage maintained or improved

→ Ready to commit!
```

---

## 🔗 Quick Links

| Resource | Purpose | Location |
|----------|---------|----------|
| **TEST_INVENTORY.md** | Complete reference | Root |
| **TEST_COMMANDS_REFERENCE.md** | Command cheatsheet | Root |
| **TESTING_PLAN.md** | Strategy & design | Root |
| **TESTING_GUIDE.md** | Step-by-step guide | Root |
| **docs/guides/TESTING.md** | Detailed walkthroughs | docs/guides/ |

---

**Summary**: This repository has a comprehensive test suite with 60+ tests split between unit (Python/pytest), E2E (TypeScript/Playwright), and quick validation scripts. Tests are well-organized, documented, and integrated into CI/CD.

**Recommendation for Next Steps**:
1. Run `python test_quick.py` to validate current setup
2. Run `pytest tests/ -v` for unit tests
3. Set up frontend + backend, then run `npm run test:e2e` for E2E tests
4. Monitor coverage with `pytest tests/ --cov-report=html`
