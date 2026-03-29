# 🧪 Testing Guide - Data Quality Platform

## Quick Testing Overview

This guide walks you through testing all features of the Data Quality Platform.

---

## 📋 Test Setup

### 1. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies (for testing)
pip install -r requirements-dev.txt
```

### 2. Create Test Data

Create a simple CSV file for testing:

```bash
# Create test data (Windows PowerShell)
@"
CustomerID,Name,Email,Age,Amount
1,John Doe,john@example.com,35,100.50
2,Jane Smith,jane@example.com,28,200.75
3,Bob Johnson,bob@example.com,42,150.25
4,Alice Brown,alice@example.com,31,300.00
5,Charlie Wilson,,29,250.50
"@ | Out-File -FilePath "test_data.csv" -Encoding utf8
```

Or use Python:

```python
import pandas as pd

# Create test data
data = {
    'CustomerID': [1, 2, 3, 4, 5],
    'Name': ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'],
    'Email': ['john@example.com', 'jane@example.com', 'bob@example.com', 'alice@example.com', None],
    'Age': [35, 28, 42, 31, 29],
    'Amount': [100.50, 200.75, 150.25, 300.00, 250.50]
}

df = pd.DataFrame(data)
df.to_csv('test_data.csv', index=False)
print("✅ Test data created: test_data.csv")
```

---

## 🧪 Unit Tests

### Run All Tests

```bash
# Run all unit tests
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=src --cov-report=html --cov-report=term

# View coverage report
# Open htmlcov/index.html in browser
```

### Run Specific Tests

```bash
# Test scanner only
pytest tests/test_scanner.py -v

# Test with verbose output
pytest tests/test_scanner.py -vv

# Test specific function
pytest tests/test_scanner.py::TestEnhancedDataQualityScanner::test_load_data -v
```

---

## 🔍 Manual Testing

### Test 1: Basic Data Quality Scan

```python
# test_basic_scan.py
from src.core.scanner import EnhancedDataQualityScanner
from src.utils.logging import setup_logging

# Setup
setup_logging(log_level="INFO")

# Run scan
scanner = EnhancedDataQualityScanner()
result = scanner.execute_comprehensive_scan(
    csv_path="test_data.csv",
    table_name="test_customers",
    checks_path="soda_duckdb/checks.yml",
    config_path="soda_duckdb/config.yml"
)

# Verify results
print(f"✅ Scan ID: {result.scan_id}")
print(f"✅ Status: {result.status}")
print(f"✅ Pass Rate: {result.pass_rate:.1%}")
print(f"✅ Total Checks: {result.total_checks}")
print(f"✅ Duration: {result.duration_seconds:.2f}s")

assert result.scan_id is not None, "Scan ID should be generated"
assert result.total_checks > 0, "Should have some checks"
assert 0 <= result.pass_rate <= 1, "Pass rate should be 0-100%"

scanner.close()
print("\n✅ Basic scan test PASSED!")
```

Run it:
```bash
python test_basic_scan.py
```

---

### Test 2: HTML Report Generation

```python
# test_html_report.py
from src.core.scanner import EnhancedDataQualityScanner
from src.reporting.html_generator import HTMLReportGenerator
from src.utils.logging import setup_logging
import os

setup_logging(log_level="INFO")

# Run scan
scanner = EnhancedDataQualityScanner()
result = scanner.execute_comprehensive_scan(
    csv_path="test_data.csv",
    table_name="test_customers",
    checks_path="soda_duckdb/checks.yml",
    config_path="soda_duckdb/config.yml"
)

# Generate report
generator = HTMLReportGenerator()
report_path = "test_report.html"
generator.generate_report(result, report_path)

# Verify report was created
assert os.path.exists(report_path), "Report file should exist"
print(f"✅ Report generated: {report_path}")

# Check report contains expected content
with open(report_path, 'r', encoding='utf-8') as f:
    content = f.read()
    assert "Data Quality Report" in content
    assert result.table_name in content
    assert "Chart.js" in content
    print("✅ Report contains expected content")

scanner.close()
print("\n✅ HTML report test PASSED!")
print(f"   Open {report_path} in your browser to view")
```

Run it:
```bash
python test_html_report.py
# Then open test_report.html in browser
```

---

### Test 3: Data Profiling

```python
# test_profiling.py
from src.core.profiler import DataProfiler
import pandas as pd

# Create test data
df = pd.DataFrame({
    'ID': range(1, 101),
    'Age': [20 + i % 50 for i in range(100)],
    'Score': [50.0 + i * 0.5 for i in range(100)],
    'Name': [f'Person_{i}' for i in range(100)]
})

# Profile data
profiler = DataProfiler()
profile = profiler.profile_dataframe(df, "test_table")

# Verify profile
assert profile['table_name'] == "test_table"
assert profile['row_count'] == 100
assert profile['column_count'] == 4
assert len(profile['columns']) == 4

print("✅ Profile generated:")
print(f"   Rows: {profile['row_count']}")
print(f"   Columns: {profile['column_count']}")

# Check numeric stats
age_col = next(c for c in profile['columns'] if c['name'] == 'Age')
assert 'numeric_stats' in age_col
print(f"   Age mean: {age_col['numeric_stats']['mean']:.2f}")

print("\n✅ Data profiling test PASSED!")
```

Run it:
```bash
python test_profiling.py
```

---

### Test 4: Anomaly Detection

```python
# test_anomalies.py
from src.core.anomaly_detector import AnomalyDetector
import pandas as pd

# Create data with anomalies
df = pd.DataFrame({
    'normal_values': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'with_outlier': [10, 12, 11, 13, 12, 14, 13, 15, 14, 1000],  # 1000 is outlier
    'high_nulls': [1, None, None, None, None, None, None, None, None, 10]
})

# Detect anomalies
detector = AnomalyDetector()
anomalies = detector.detect_anomalies(df, "test_table")

print(f"✅ Detected {len(anomalies)} anomalies:")
for anomaly in anomalies:
    print(f"   - {anomaly['type']}: {anomaly['column']} ({anomaly['severity']})")
    print(f"     {anomaly['message']}")

assert len(anomalies) > 0, "Should detect some anomalies"
print("\n✅ Anomaly detection test PASSED!")
```

Run it:
```bash
python test_anomalies.py
```

---

### Test 5: REST API

Start the API server first:
```bash
# Terminal 1: Start server
python -m src.api.server
```

Then test endpoints:

```python
# test_api.py (run in separate terminal/window)
import requests
import time

base_url = "http://localhost:8000"

# Test 1: Health check
print("🧪 Testing health endpoint...")
response = requests.get(f"{base_url}/api/health")
assert response.status_code == 200
data = response.json()
assert data['status'] == 'healthy'
print("✅ Health check PASSED")

# Test 2: Landing page
print("\n🧪 Testing landing page...")
response = requests.get(base_url)
assert response.status_code == 200
assert "Data Quality Platform" in response.text
print("✅ Landing page PASSED")

# Test 3: API docs
print("\n🧪 Testing API documentation...")
response = requests.get(f"{base_url}/api/docs")
assert response.status_code == 200
print("✅ API docs PASSED")

# Test 4: Run scan via API
print("\n🧪 Testing scan endpoint...")
scan_request = {
    "csv_path": "test_data.csv",
    "table_name": "api_test_table",
    "send_alerts": False
}
response = requests.post(f"{base_url}/api/scan", json=scan_request)
assert response.status_code == 200
data = response.json()
assert 'scan_id' in data
assert 'status' in data
assert 'pass_rate' in data
print(f"✅ Scan completed: {data['status']}")
print(f"   Scan ID: {data['scan_id']}")
print(f"   Pass Rate: {data['pass_rate']:.1%}")

print("\n✅ All API tests PASSED!")
```

Run it:
```bash
# In separate terminal while API is running
python test_api.py
```

Or use curl:
```bash
# Health check
curl http://localhost:8000/api/health

# Run scan (PowerShell)
$body = @{
    csv_path = "test_data.csv"
    table_name = "curl_test"
    send_alerts = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/scan" -Method POST -Body $body -ContentType "application/json"
```

---

### Test 6: Command Line Interface

```bash
# Test help
python main.py --help
python main.py scan --help

# Test basic scan
python main.py scan --csv test_data.csv --table cli_test

# Test scan with report
python main.py scan --csv test_data.csv --table cli_test --report cli_report.html

# Test without alerts
python main.py scan --csv test_data.csv --table cli_test --no-alerts --no-cosmos
```

---

## 🔧 Integration Tests

### Test 7: End-to-End Workflow

```python
# test_e2e.py
"""Complete end-to-end workflow test"""
from src.core.scanner import EnhancedDataQualityScanner
from src.reporting.html_generator import HTMLReportGenerator
from src.utils.logging import setup_logging
import os

print("🧪 Running End-to-End Test")
print("=" * 60)

# Setup
setup_logging(log_level="INFO")

# Step 1: Create scanner
print("\n1️⃣ Initializing scanner...")
scanner = EnhancedDataQualityScanner()
assert scanner is not None
print("✅ Scanner initialized")

# Step 2: Run scan
print("\n2️⃣ Running scan...")
result = scanner.execute_comprehensive_scan(
    csv_path="test_data.csv",
    table_name="e2e_test",
    checks_path="soda_duckdb/checks.yml",
    config_path="soda_duckdb/config.yml"
)
assert result.scan_id is not None
print(f"✅ Scan completed: {result.status}")

# Step 3: Generate report
print("\n3️⃣ Generating report...")
generator = HTMLReportGenerator()
report_path = "e2e_test_report.html"
generator.generate_report(result, report_path)
assert os.path.exists(report_path)
print(f"✅ Report generated: {report_path}")

# Step 4: Verify results
print("\n4️⃣ Verifying results...")
assert result.total_checks > 0, "Should have checks"
assert result.pass_rate >= 0, "Pass rate should be valid"
assert result.metadata is not None, "Should have metadata"
assert len(result.check_details) > 0, "Should have check details"
print("✅ Results verified")

# Step 5: Check profiling
print("\n5️⃣ Checking data profile...")
if result.profile:
    assert result.profile['row_count'] > 0
    assert len(result.profile['columns']) > 0
    print(f"✅ Profile contains {len(result.profile['columns'])} columns")
else:
    print("⚠️  Profiling not enabled")

# Step 6: Check anomalies
print("\n6️⃣ Checking anomalies...")
if result.anomalies:
    print(f"✅ Found {len(result.anomalies)} anomalies")
    for anomaly in result.anomalies[:3]:  # Show first 3
        print(f"   - {anomaly['type']}: {anomaly['column']}")
else:
    print("✅ No anomalies detected")

# Cleanup
scanner.close()

print("\n" + "=" * 60)
print("🎉 End-to-End Test PASSED!")
print(f"   Scan ID: {result.scan_id}")
print(f"   Status: {result.status}")
print(f"   Pass Rate: {result.pass_rate:.1%}")
print(f"   Report: {report_path}")
print("=" * 60)
```

Run it:
```bash
python test_e2e.py
```

---

## 🐳 Docker Testing

### Test 8: Docker Build

```bash
# Build image
docker build -t data-quality-platform:test .

# Verify image was created
docker images | grep data-quality-platform

# Run container
docker run -p 8000:8000 data-quality-platform:test

# Test in browser
# Open http://localhost:8000
```

### Test 9: Docker Compose

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Test API
curl http://localhost:8000/api/health

# Stop and cleanup
docker-compose down
```

---

## 📊 Performance Testing

### Test 10: Large Dataset Performance

```python
# test_performance.py
import pandas as pd
import time
from src.core.scanner import EnhancedDataQualityScanner
from src.utils.logging import setup_logging

setup_logging(log_level="INFO")

# Create large test dataset
print("🧪 Creating large dataset (100K rows)...")
large_data = {
    'ID': range(1, 100001),
    'Name': [f'Customer_{i}' for i in range(1, 100001)],
    'Email': [f'customer{i}@example.com' for i in range(1, 100001)],
    'Age': [20 + (i % 60) for i in range(1, 100001)],
    'Amount': [100.0 + (i * 0.5) for i in range(1, 100001)]
}
df = pd.DataFrame(large_data)
df.to_csv('large_test_data.csv', index=False)
print(f"✅ Created dataset: {len(df):,} rows")

# Run performance test
print("\n🧪 Running performance test...")
scanner = EnhancedDataQualityScanner()

start_time = time.time()
result = scanner.execute_comprehensive_scan(
    csv_path="large_test_data.csv",
    table_name="performance_test",
    checks_path="soda_duckdb/checks.yml",
    config_path="soda_duckdb/config.yml"
)
end_time = time.time()

duration = end_time - start_time
rows_per_second = len(df) / duration

print("\n📊 Performance Results:")
print(f"   Dataset size: {len(df):,} rows")
print(f"   Duration: {duration:.2f} seconds")
print(f"   Throughput: {rows_per_second:,.0f} rows/second")
print(f"   Status: {result.status}")

scanner.close()

# Performance assertions
assert duration < 60, "Should process 100K rows in under 60 seconds"
print("\n✅ Performance test PASSED!")
```

Run it:
```bash
python test_performance.py
```

---

## 🎯 Quick Testing Checklist

Run through this checklist to verify all features:

- [ ] **Installation**
  ```bash
  pip install -r requirements.txt
  ```

- [ ] **Unit Tests**
  ```bash
  pytest tests/ -v
  ```

- [ ] **Basic Scan**
  ```bash
  python main.py scan --csv test_data.csv --table test1
  ```

- [ ] **HTML Report**
  ```bash
  python main.py scan --csv test_data.csv --table test2 --report report.html
  # Open report.html in browser
  ```

- [ ] **API Server**
  ```bash
  python -m src.api.server
  # Open http://localhost:8000/api/docs
  ```

- [ ] **Data Profiling**
  ```python
  # Check if profile data appears in results
  ```

- [ ] **Anomaly Detection**
  ```python
  # Check if anomalies are detected
  ```

- [ ] **Docker Build**
  ```bash
  docker build -t dq-test .
  ```

---

## 🆘 Troubleshooting Tests

### Issue: "ModuleNotFoundError"
```bash
# Ensure you're in project root
cd fabric_duckdb_soda_dataquality_checks

# Install dependencies
pip install -r requirements.txt

# Add src to Python path
export PYTHONPATH="${PYTHONPATH}:${PWD}"  # Linux/Mac
$env:PYTHONPATH += ";${PWD}"              # Windows PowerShell
```

### Issue: "DuckDB connection error"
```python
# Make sure to close previous connections
scanner.close()

# Or delete existing database
import os
if os.path.exists('my_database.myduckdb'):
    os.remove('my_database.myduckdb')
```

### Issue: "Soda checks not found"
```bash
# Verify paths
ls soda_duckdb/checks.yml
ls soda_duckdb/config.yml

# Use absolute paths if needed
python main.py scan --csv test_data.csv --table test --checks "$(pwd)/soda_duckdb/checks.yml"
```

---

## 📈 Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Core Scanner | 85%+ |
| Data Profiler | 80%+ |
| Anomaly Detector | 75%+ |
| HTML Generator | 70%+ |
| API Endpoints | 80%+ |
| **Overall** | **75%+** |

Check coverage:
```bash
pytest tests/ --cov=src --cov-report=term-missing
```

---

## ✅ Success Criteria

Your testing is successful if:

1. ✅ All unit tests pass
2. ✅ Manual scans complete without errors
3. ✅ HTML reports are generated and viewable
4. ✅ API returns expected responses
5. ✅ Docker image builds successfully
6. ✅ Performance meets targets (< 60s for 100K rows)
7. ✅ No critical errors in logs

---

## 🎓 Next Steps After Testing

1. **Configure for Production**
   - Set up Azure Cosmos DB
   - Configure SMTP/Teams webhooks
   - Update `.env` with real credentials

2. **Deploy**
   - Push to container registry
   - Deploy to Azure Container Instances
   - Set up monitoring

3. **Monitor**
   - Check logs regularly
   - Review scan results
   - Adjust thresholds as needed

---

Need help? Check the [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md)
