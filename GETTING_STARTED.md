# 🚀 Quick Start - Test Your Installation

## ✅ Installation Verification

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Expected output:
```
Successfully installed soda-core-3.4.3 duckdb-1.1.0 pandas-2.2.0 ...
```

---

## 🧪 Run Quick Test

### Option 1: Automated Quick Test

```bash
python test_quick.py
```

This will:
- ✅ Verify all imports
- ✅ Create test data
- ✅ Run a data quality scan
- ✅ Generate HTML report
- ✅ Test all components

**Expected output:**
```
============================================================
🧪 Quick System Test
============================================================

1️⃣ Testing imports...
✅ All imports successful

2️⃣ Creating test data...
✅ Test data created: quick_test_data.csv

3️⃣ Testing scanner initialization...
✅ Scanner initialized

4️⃣ Running quick scan...
✅ Scan completed
   Status: PASSED
   Pass Rate: 100.0%
   Total Checks: 5
   Duration: 2.34s

5️⃣ Testing HTML report generation...
✅ Report generated: quick_test_report.html
   Open this file in your browser to view

6️⃣ Testing data profiler...
✅ Profiler working
   Profiled 5 columns

7️⃣ Testing anomaly detector...
✅ Anomaly detector working
   Detected 0 anomalies

============================================================
🎉 QUICK TEST COMPLETE!
============================================================
```

---

### Option 2: Manual Step-by-Step Test

#### 1. Create Test Data

```python
# create_test_data.py
import pandas as pd

data = {
    'CustomerID': [1, 2, 3, 4, 5],
    'Name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
    'Email': ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'david@test.com', 'eve@test.com'],
    'Age': [25, 32, 28, 41, 35],
    'Amount': [100.0, 200.0, 150.0, 300.0, 250.0]
}

df = pd.DataFrame(data)
df.to_csv('my_test_data.csv', index=False)
print("✅ Test data created!")
```

Run:
```bash
python create_test_data.py
```

#### 2. Run Your First Scan

```bash
python main.py scan --csv my_test_data.csv --table my_test --report my_report.html
```

Expected output:
```
🎯 Enterprise Data Quality Platform
============================================================
📊 Scanning my_test...

============================================================
RESULTS
============================================================
Status: PASSED
Pass Rate: 100.0%
Total Checks: 5
Passed: 5
Failed: 0
Anomalies: 0
Duration: 2.15s

📝 Generating report...
✅ Report saved: my_report.html
```

#### 3. View the Report

Open `my_report.html` in your browser - you'll see:
- 📊 Interactive charts
- ✅ Check results
- 📈 Data profiling
- 🎨 Beautiful design

---

## 🌐 Test the API

### 1. Start the Server

```bash
python -m src.api.server
```

Expected output:
```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 2. Open in Browser

- **Landing Page**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **Health Check**: http://localhost:8000/api/health

### 3. Test with curl/PowerShell

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:8000/api/health"

# Expected: {"status":"healthy","timestamp":"2026-03-29T...","version":"1.0.0",...}
```

---

## 🧪 Run Unit Tests

```bash
# Install test dependencies
pip install -r requirements-dev.txt

# Run tests
pytest tests/ -v
```

Expected output:
```
tests/test_scanner.py::TestEnhancedDataQualityScanner::test_scanner_initialization PASSED
tests/test_scanner.py::TestEnhancedDataQualityScanner::test_load_data PASSED
tests/test_scanner.py::TestEnhancedDataQualityScanner::test_parse_scan_results PASSED
...
======================== 10 passed in 5.23s ========================
```

---

## 📋 Quick Test Checklist

Use this to verify everything works:

```bash
# 1. Install dependencies
pip install -r requirements.txt
# ✅ Should install ~15 packages

# 2. Run quick test
python test_quick.py
# ✅ Should complete all 7 tests

# 3. Test CLI
python main.py scan --csv quick_test_data.csv --table test1 --report test1.html
# ✅ Should create test1.html

# 4. Start API
python -m src.api.server
# ✅ Server should start on port 8000

# 5. Open in browser
# http://localhost:8000/api/docs
# ✅ Should see Swagger UI

# 6. Run unit tests
pytest tests/ -v
# ✅ Tests should pass
```

---

## 🆘 Troubleshooting

### Python not found
```bash
# Install Python 3.9+ from python.org
# Or use: winget install Python.Python.3.11
```

### Module not found
```bash
# Make sure you're in project directory
cd fabric_duckdb_soda_dataquality_checks

# Install dependencies
pip install -r requirements.txt
```

### Port 8000 already in use
```bash
# Use different port
python -m src.api.server --port 8080
```

### DuckDB error
```bash
# Delete old database
Remove-Item my_database.myduckdb -ErrorAction SilentlyContinue
```

---

## 🎯 What to Test

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Data Scanning** | `python main.py scan --csv data.csv --table test` | ✅ Pass rate shown |
| **HTML Reports** | Open generated .html file | ✅ Beautiful charts |
| **API** | Visit http://localhost:8000/api/docs | ✅ Swagger UI loads |
| **Profiling** | Check scan results | ✅ Column stats shown |
| **Anomalies** | Create data with outliers | ✅ Anomalies detected |
| **Unit Tests** | `pytest tests/ -v` | ✅ All tests pass |

---

## 📚 Full Testing Guide

For comprehensive testing instructions, see:
- [TESTING.md](TESTING.md) - Complete testing guide
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - 5-minute tutorial

---

## ✅ Success!

If you can:
1. ✅ Run `python test_quick.py` successfully
2. ✅ Generate HTML reports
3. ✅ Start the API server
4. ✅ Access API docs

**You're all set!** 🎉

The platform is working correctly and ready to use.

---

## 🚀 Next Steps

1. **Try with real data** - Use your own CSV files
2. **Customize checks** - Edit `soda_duckdb/checks.yml`
3. **Set up Cosmos DB** - For historical tracking
4. **Configure alerts** - Add Teams/Email settings
5. **Deploy** - Use Docker for production

---

Need help? Check [TESTING.md](TESTING.md) for detailed examples!
