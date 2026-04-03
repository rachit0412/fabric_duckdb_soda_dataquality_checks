# 🛠️ Test Commands Quick Reference

**Last Updated**: 2026-04-02

---

## 🚀 TL;DR - Run All Tests (60+ seconds)

```bash
# Terminal 1️⃣: Start Python backend
python main.py api --port 8000

# Terminal 2️⃣: Start Node.js frontend
cd services/frontend && npm start

# Terminal 3️⃣: Run all tests
pytest tests/ -v                       # Unit + Integration tests
npm run test:e2e                       # E2E tests
python test_quick.py                  # System validation
```

**Total Time**: ~90 seconds  
**Success**: All ✅ checks pass

---

## 📋 Test Matrix

### Python Tests (Backend)

| Command | Tests | File | Time |
|---------|-------|------|------|
| `pytest tests/ -v` | 23+ | All unit tests | 5-10s |
| `pytest tests/unit/ -v` | 15 | SODA checks | 3-5s |
| `pytest tests/test_scanner.py -v` | 8 | Scanner, profiler, anomaly | 3-5s |
| `pytest tests/test_e2e.py -v` | 5-8 | API workflow (needs DB) | 10-15s |
| `python test_quick.py` | 7 steps | System validation | 3-5s |
| `python test_rule_filtering.py` | 5+ | Rule endpoints (needs API) | 5-10s |

### Playwright Tests (Frontend)

| Command | Tests | File | Time |
|---------|-------|------|------|
| `npm run test:e2e` | 22+ | All E2E tests | 30-60s |
| `npx playwright test tests/e2e/soda_checks_fixes.spec.ts` | 14 | Soda checks display | 15-20s |
| `npx playwright test tests/e2e/api.spec.ts` | 5+ | API endpoints | 10-15s |
| `npx playwright test tests/e2e/workflow.spec.ts` | 6+ | Full workflow | 20-30s |
| `npm run test:e2e:ui` | Interactive | UI mode (debug) | ∞ |

### Quick Validation

| Command | Purpose | Time |
|---------|---------|------|
| `python test_quick.py` | System readiness check | 3-5s |
| `curl http://localhost:8000/api/summary` | API health | 1s |
| `npm run test:api` | API via Node | 5-10s |

---

## 🔧 Common Tasks

### ✅ Verify Installation is Working
```bash
python test_quick.py
```
**Expected**: 7/7 steps pass  
**Time**: 3-5s

### ✅ Run All Unit Tests
```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term
```
**Expected**: 23+ tests pass  
**Time**: 5-10s

### ✅ Run All E2E Tests (Requires: Frontend + Backend running)
```bash
npm run test:e2e
```
**Expected**: 22+ tests pass  
**Time**: 30-60s

### ✅ Generate Coverage Report
```bash
pytest tests/ --cov=src --cov-report=html
# Opens in browser:
open htmlcov/index.html
```

### ✅ Test Specific Component
```bash
# SODA checks
pytest tests/unit/test_soda_checks_display.py -v

# Scanner
pytest tests/test_scanner.py -vv -s

# E2E workflow
npx playwright test tests/e2e/workflow.spec.ts
```

### ✅ Debug a Failing E2E Test
```bash
# UI mode (step-by-step execution)
npm run test:e2e:ui

# With trace/screenshots
npx playwright test --trace=on --screenshot=on

# Specific test with debug
npx playwright test -g "should load landing page" --debug
```

### ✅ Check Code Quality
```bash
pip install -r requirements-dev.txt

# Linting
pylint src/
flake8 src/
black --check src/

# Type checking
mypy src/ --ignore-missing-imports

# Security
bandit src/
safety check
```

---

## 📂 Test File Structure

```
/workspaces/fabric_duckdb_soda_dataquality_checks/
├── tests/
│   ├── unit/
│   │   └── test_soda_checks_display.py (15 tests)
│   ├── e2e/
│   │   ├── soda_checks_fixes.spec.ts (14 tests)
│   │   ├── api.spec.ts (5+ tests)
│   │   └── workflow.spec.ts (6+ tests)
│   ├── test_scanner.py (8 tests)
│   └── test_e2e.py (5-8 tests)
├── test_quick.py (7 steps - system check)
├── test_rule_filtering.py (5+ endpoints)
├── playwright.config.ts (Playwright config)
├── TEST_INVENTORY.md (This file's parent)
└── TESTING_PLAN.md (Strategy & examples)
```

---

## 🎯 Test Categories

### 1. Unit Tests (Python)
**Location**: `tests/unit/`, `tests/test_scanner.py`  
**Framework**: pytest 8.3.0  
**Run**: `pytest tests/ -v`  
**Time**: 5-10s  
**Purpose**: Test individual functions/classes in isolation

### 2. E2E Tests (Playwright)
**Location**: `tests/e2e/`  
**Framework**: Playwright 1.59.1  
**Run**: `npm run test:e2e`  
**Time**: 30-60s  
**Purpose**: Test complete user workflows through browser

### 3. Integration Tests (Python)
**Location**: `tests/test_e2e.py`  
**Framework**: pytest + requests  
**Run**: `pytest tests/test_e2e.py -v`  
**Time**: 10-15s  
**Purpose**: Test API endpoints with actual database

### 4. Quick System Tests (Python)
**Location**: `test_quick.py`  
**Framework**: Standalone Python script  
**Run**: `python test_quick.py`  
**Time**: 3-5s  
**Purpose**: Validate system readiness (no deps needed)

---

## 🔌 Setup Requirements by Test Type

### Unit Tests
```bash
# Requires:
pip install pytest pytest-cov

# Optional (recommended):
pip install -r requirements-dev.txt

# Run:
pytest tests/unit/ -v
```
**Native Support**: ✅ No external services needed

---

### Integration Tests
```bash
# Requires:
pip install pytest requests
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=dq_password \
  -e POSTGRES_DB=test_dq_db \
  -p 5432:5432 postgres:15

# Run:
pytest tests/test_e2e.py -v
```
**Native Support**: ⏳ PostgreSQL must be running

---

### E2E Tests
```bash
# Terminal 1: Backend
python main.py api --port 8000

# Terminal 2: Frontend
cd services/frontend && npm start

# Terminal 3: Run tests
npm run test:e2e
```
**Native Support**: ⏳ Both servers must be running

---

### Quick System Tests
```bash
# Requires:
pip install -r requirements.txt

# Run:
python test_quick.py
```
**Native Support**: ✅ Standalone (auto-creates test data)

---

## 📊 Coverage Reports

### Generate Coverage Report
```bash
pytest tests/ --cov=src --cov-report=html --cov-report=term
```

**Output**:
```
Name                    Stmts   Miss  Cover   Missing
─────────────────────────────────────────────────────
src/core/scanner        150     20    87%    45-50,120
src/services/metadata    95      8    92%    33,78
src/api/server         200     50    75%    100-150
─────────────────────────────────────────────────────
TOTAL                  445     78    82%
```

**View HTML Report**:
```bash
open htmlcov/index.html
```

---

## 🚨 Troubleshooting

### ❌ "ModuleNotFoundError: No module named 'src'"
```bash
# Fix: Run from project root
cd /workspaces/fabric_duckdb_soda_dataquality_checks
pytest tests/ -v
```

### ❌ "pytest: command not found"
```bash
# Fix: Install dev dependencies
pip install -r requirements-dev.txt
```

### ❌ "Connection refused" (tests/test_e2e.py)
```bash
# Fix: Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=dq_password \
  -e POSTGRES_DB=test_dq_db \
  -p 5432:5432 postgres:15

# Or skip with:
pytest tests/unit/ -v  # Unit tests don't need DB
```

### ❌ "FAILED test [...] - Timeout" (E2E tests)
```bash
# Fix: Ensure both servers are running
python main.py api --port 8000  # Terminal 1
cd services/frontend && npm start  # Terminal 2

# Then run:
npm run test:e2e
```

### ❌ "Playwright browser not found"
```bash
# Fix: Install browsers
npx playwright install chromium

# Then run:
npm run test:e2e
```

---

## 🎮 Useful Testing Patterns

### Run Tests on File Change (Watch Mode)
```bash
pip install pytest-watch
ptw tests/ -v
```

### Run Only Failed Tests
```bash
pytest tests/ --lf
```

### Run Tests with Print Statements
```bash
pytest tests/ -vv -s
```

### Run Tests and Stop on First Failure
```bash
pytest tests/ -x
```

### Run Tests in Parallel (Speed Up)
```bash
pip install pytest-xdist
pytest tests/ -n auto
```

### Generate JUnit XML (for CI/CD)
```bash
pytest tests/ --junit-xml=test-results.xml
```

### Interactive Debugger
```bash
# Drop into debugger on failure
pytest tests/ --pdb

# Or add to test:
import pdb; pdb.set_trace()
```

---

## 📚 Documentation References

| Document | Purpose | Location |
|----------|---------|----------|
| **TESTING_PLAN.md** | Strategy & architecture | Root |
| **TESTING_GUIDE.md** | Step-by-step guide | Root |
| **docs/guides/TESTING.md** | Detailed walkthrough | docs/guides/ |
| **TEST_INVENTORY.md** | Complete inventory | Root |
| **README.md** | Project overview | Root |
| **DIAGNOSTIC_FIXES_SUMMARY.md** | Recent test additions | Root |

---

## ✨ Examples

### Example 1: Test Single Function
```bash
pytest tests/unit/test_soda_checks_display.py::TestSodaChecksDisplay::test_soda_checks_library_populated -v
```

### Example 2: Run E2E with UI Debugging
```bash
npm run test:e2e:ui
# Opens interactive browser where you can step through tests
```

### Example 3: Coverage for Specific File
```bash
pytest tests/ --cov=src/services/metadata --cov-report=html
```

### Example 4: Generate Report Artifact
```bash
pytest tests/ --html=report.html --self-contained-html
open report.html
```

---

## 📞 Common Commands by Use Case

### For Daily Development
```bash
python test_quick.py              # Quick health check (5s)
pytest tests/unit/ -v             # Unit tests (5s)
pytest tests/ -v                  # All tests (10s)
```

### For Code Review
```bash
pytest tests/ --cov=src --cov-report=term
black --check src/
pylint src/
```

### Before Commit
```bash
pytest tests/ -v
npm run test:e2e
black src/
```

### For Production Build
```bash
pip install -r requirements-dev.txt
pytest tests/ --cov=src --cov-report=xml
npm run test:e2e
# (All tests must pass)
```

---

**Need help?** See [TESTING_GUIDE.md](TESTING_GUIDE.md) or [TEST_INVENTORY.md](TEST_INVENTORY.md)
