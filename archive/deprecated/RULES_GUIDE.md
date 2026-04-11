# 📚 COMPLETE GUIDE: SODA RULES & VIEWING RESULTS

## 🎯 QUICK START: SEE SCAN RESULTS

### Method 1️⃣: Via Web Dashboard (EASIEST)

1. Open: http://localhost:3000
2. Upload your CSV file
3. Click "🚀 Scan Data Quality"
4. See results like:
   ```
   ✅ Scan completed with CRITICAL status
   Scan ID: a0465ddb-da58-4b5b-8162-b382f70fc78b
   Pass Rate: 0%
   ```

### Method 2️⃣: Via REST API

```bash
# Get dashboard summary showing all scans
curl http://localhost:8000/api/summary | jq

# Get scan history for specific table
curl http://localhost:8000/api/history/customers?days=30 | jq

# Get trend analysis
curl http://localhost:8000/api/trends/customers | jq
```

### Method 3️⃣: View Raw Results

```bash
# Check scan results CSV
cat soda_duckdb/data_quality_results.csv

# Check scan report
cat soda_duckdb/report.txt
```

---

## 🔧 HOW TO ADD CUSTOM RULES - 3 STEPS

### STEP 1: Identify Your Columns

First, understand your data structure:

```bash
# View first few rows of your CSV
head -5 your_file.csv

# Example customers.csv:
CustomerID,Email,Name,Age,AnnualRevenue,Status,Country
1,john@example.com,John Doe,35,75000,Active,US
2,jane@example.com,Jane Smith,28,95000,Active,UK
```

### STEP 2: Pick Your Rules

Based on your columns, select rules:

```yaml
# Edit: soda_duckdb/checks.yml
# Replace "customers" with your table name
# Replace column names with your actual columns

checks for customers:
  # 1. Volume checks
  - row_count > 100        # At least 100 rows
  
  # 2. Completeness (no nulls)
  - missing_count(Email) = 0
  
  # 3. Uniqueness
  - duplicate_count(Email) = 0
  
  # 4. Format validation
  - invalid_count(Email) = 0:
      valid format: email
  
  # 5. Range checks
  - min(Age) >= 18
  - max(Age) <= 120
```

### STEP 3: Upload & Scan

```bash
# Upload your CSV with updated rules
curl -X POST http://localhost:8000/api/simple-upload \
  -F "file=@customers.csv"

# Response shows results
{
  "scan_id": "unique-uuid",
  "status": "PASSED",
  "pass_rate": 0.95,
  "message": "Scan completed with PASSED status"
}
```

---

## 📖 RULE TEMPLATES FOR COMMON SCENARIOS

### Scenario 1: Customer Data

```yaml
checks for customers:
  # Volume
  - row_count > 100
  
  # Completeness
  - missing_count(customer_id) = 0
  - missing_count(email) = 0
  - missing_percent(phone) < 5
  
  # Uniqueness
  - duplicate_count(customer_id) = 0
  - duplicate_count(email) = 0
  
  # Validity
  - invalid_count(email) = 0:
      valid format: email
  - invalid_count(phone) < 2:
      valid regex: '^\d{10}$'
  
  # Ranges
  - min(age) >= 18
  - max(age) <= 120
  - avg(lifetime_value) > 100
  
  # Status values
  - invalid_count(status) = 0:
      valid values: ['active', 'inactive', 'pending']
  
  schema:
    fail:
      when required column missing: [customer_id, email, name]
      when wrong column type:
        customer_id: integer
        email: varchar
```

### Scenario 2: Sales/Orders Data

```yaml
checks for orders:
  # Volume
  - row_count > 1000
  
  # Completeness
  - missing_count(order_id) = 0
  - missing_count(customer_id) = 0
  - missing_count(order_date) = 0
  - missing_percent(notes) < 20
  
  # Uniqueness
  - duplicate_count(order_id) = 0
  
  # Validity
  - invalid_count(order_date) = 0:
      valid format: date
  - invalid_count(email) = 0:
      valid format: email
  
  # Ranges
  - min(order_amount) > 0
  - max(order_amount) < 1000000
  - avg(order_amount) between 50 and 5000
  
  # Date logic
  - failed rows:
      name: Orders not in future
      fail query: |
        SELECT COUNT(*) FROM orders
        WHERE order_date > CURRENT_DATE
        HAVING COUNT(*) > 0
  
  # Business logic
  - failed rows:
      name: Order amount must match items
      fail query: |
        SELECT COUNT(*) FROM orders
        WHERE order_amount <= 0 AND status = 'completed'
        HAVING COUNT(*) > 0
```

### Scenario 3: Financial Data

```yaml
checks for transactions:
  # Critical completeness
  - missing_count(transaction_id) = 0
  - missing_count(amount) = 0
  - missing_count(account_id) = 0
  
  # Uniqueness
  - duplicate_count(transaction_id) = 0
  
  # Financial validity
  - min(amount) > 0:
      name: Amount must be positive
  
  - invalid_count(currency) = 0:
      valid values: ['USD', 'EUR', 'GBP', 'JPY']
  
  # Statistical checks
  - avg(amount) between 100 and 50000
  - stddev(amount) < 100000
  - percentile(amount, 95) < 1000000
  
  # Date validation
  - invalid_count(transaction_date) = 0:
      valid format: date
  
  # No future transactions
  - failed rows:
      name: Transactions from future
      fail query: |
        SELECT COUNT(*) FROM transactions
        WHERE transaction_date > CURRENT_DATE
  
  # Regulatory checks
  - failed rows:
      name: Suspicious activity detection
      fail query: |
        SELECT COUNT(*) FROM transactions
        WHERE amount > 10000 AND notes IS NULL
```

### Scenario 4: Product Catalog

```yaml
checks for products:
  # Completeness
  - missing_count(product_id) = 0
  - missing_count(product_name) = 0
  - missing_count(price) = 0
  
  # Uniqueness
  - duplicate_count(product_id) = 0
  - duplicate_count(sku) = 0
  
  # Price validation
  - min(price) > 0
  - max(price) < 999999
  - avg(price) between 10 and 1000
  
  # Inventory
  - min(stock_quantity) >= 0
  - max(stock_quantity) < 1000000
  
  # Category validation
  - invalid_count(category) = 0:
      valid values: ['Electronics', 'Clothing', 'Food', 'Other']
  
  # URL/Web validation
  - invalid_count(product_url) < 1:
      valid format: url
  
  # Referential (if you have categories table)
  # - values in (category_id) must exist in categories (id)
```

---

## 🔍 INTERPRET RESULTS

### Example Scan Response:

```json
{
  "scan_id": "a0465ddb-da58-4b5b-8162-b382f70fc78b",
  "status": "CRITICAL",           ← PASSED | WARNING | CRITICAL
  "pass_rate": 0.75,              ← 0-1 (0% to 100%)
  "message": "Scan completed with CRITICAL status",
  "report_url": "/api/reports/a0465ddb-da58-4b5b-8162-b382f70fc78b"
}
```

### Status Meanings:

| Status | Meaning | Pass Rate |
|--------|---------|-----------|
| **PASSED** | All checks passed ✅ | ≥ 95% |
| **WARNING** | Some failed (tolerable) ⚠️ | 80-95% |
| **CRITICAL** | Major failures ❌ | < 80% |

### Viewing Detailed Results:

```bash
# Get API summary
curl http://localhost:8000/api/summary | jq '.recent_scans[] | {scan_id, status, pass_rate}'

# Output:
# {
#   "scan_id": "a0465ddb-da58-4b5b-8162-b382f70fc78b",
#   "status": "CRITICAL",
#   "pass_rate": 0.0
# }
```

---

## ⚙️ ADVANCED: CUSTOMIZE THRESHOLDS

### Adjust Warning vs Failure Thresholds

Edit `src/config/settings.py`:

```python
warning_threshold = 0.80        # Warn if pass_rate < 80%
critical_failure_threshold = 0.50  # Critical if pass_rate < 50%
```

### Add Warn-Only Checks

```yaml
checks for products:
  - row_count:
      valid min: 100
      valid max: 99999
      warn_threshold: 1000  # Warn if < 1000 rows
```

---

## 📤 FULL WORKFLOW EXAMPLE

### 1. Create Custom Rules File

```bash
# Edit: soda_duckdb/checks.yml
nano soda_duckdb/checks.yml

# Add your table-specific rules
checks for my_table:
  - row_count > 100
  - missing_count(id) = 0
  - duplicate_count(id) = 0
  # ... more rules
```

### 2. Upload Data

```bash
# Via web UI at http://localhost:3000
# OR via CLI:
curl -X POST http://localhost:8000/api/simple-upload \
  -F "file=@my_data.csv"
```

### 3. View Results

```bash
# API response
{
  "scan_id": "xyz123",
  "status": "WARNING",
  "pass_rate": 0.85
}

# View summary
curl http://localhost:8000/api/summary | jq

# View history
curl http://localhost:8000/api/history/my_table | jq
```

### 4. Iterate

- If failures: Fix data or adjust rules
- If all pass: Monitor with freshest checks
- Add new rules as requirements change

---

## 🚀 PRO TIPS

### Tip 1: Start Simple, Then Add

```yaml
# Start with basics
- row_count > 0
- missing_count(id) = 0

# Then add intermediate checks
- duplicate_count(id) = 0
- invalid_count(email) = 0: valid format: email

# Finally add advanced checks
- failed rows: fail query: SELECT...
```

### Tip 2: Use Regex for Custom Formats

```yaml
# Credit card (masked)
- invalid_count(cc_num) = 0:
    valid regex: '^\*{4}-\*{4}-\*{4}-\d{4}$'

# Social Security
- invalid_count(ssn) = 0:
    valid regex: '^\d{3}-\d{2}-\d{4}$'

# Phone
- invalid_count(phone) < 1:
    valid regex: '^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$'
```

### Tip 3: Custom SQL for Complex Logic

```yaml
- failed rows:
    name: Detect impossible combinations
    fail query: |
      SELECT * FROM orders
      WHERE order_status = 'delivered'
      AND delivery_date IS NULL
```

### Tip 4: Monitor Trends

```bash
# Get 30-day trend for a table
curl "http://localhost:8000/api/trends/customers?days=30" | jq

# Track improvement over time
curl "http://localhost:8000/api/trends/customers" | jq '.trend_data[] | {date, pass_rate}'
```

---

## 🎓 LEARNING RESOURCES

- **Soda Documentation**: https://docs.getsoda.io/
- **Checks Reference**: https://docs.getsoda.io/en/latest/checks-reference/
- **Test Examples**: `soda_duckdb/checks.yml` (this repo)
- **Advanced Patterns**: `soda_duckdb/advanced_checks.yml` (template)

---

## ❓ COMMON ISSUES & SOLUTIONS

### Issue: "Column not found"
**Solution**: Check CSV has exact column names (case-sensitive)

### Issue: "Invalid format: email" not working
**Solution**: Ensure column contains valid email addresses

### Issue: All checks failing
**Solution**: 
1. Check file is valid CSV
2. Verify column names match rules
3. Start with basic `row_count > 0`

### Issue: Want to see actual failing rows
**Solution**: Use custom SQL check:
```yaml
- failed rows:
    name: Show invalid emails
    fail query: |
      SELECT * FROM {table_name}
      WHERE Email NOT LIKE '%@%.%'
```

---

**Happy Data Quality Checking! 🎉**
