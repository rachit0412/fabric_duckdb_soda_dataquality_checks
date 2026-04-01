# Rule Selection & Metadata Mapping Guide

## Overview

The enhanced UI now provides **selective rule execution** with **results mapped to data metadata**. Users can choose which Soda Core rules to run and view detailed results mapped to specific columns and data characteristics.

---

## 🎯 Key Features

### 1. **Rule Selection Interface** (Select Rules Tab)

Choose which quality rule categories to execute:

- **🔢 Volume Checks**: Validate data row counts (must have rows, reasonable size)
- **✅ Completeness Checks**: Ensure no critical missing values in key columns
- **🔐 Uniqueness Checks**: Detect duplicate records on key identifiers
- **📧 Validity Checks**: Validate email format, age ranges, and bounds
- **⏰ Freshness Checks**: Verify data timeliness (recent signup dates)

**How to Use:**
1. Go to the **⚙️ Select Rules** tab
2. Click the checkbox next to each rule category you want to run
3. See the summary showing which rules are enabled
4. Upload data to run only the selected rules

### 2. **Metadata Display** (Results Tab)

When you expand a scan result, you'll see:

**Data Metadata Section:**
- **Rows Scanned**: Total number of records processed
- **Scan Duration**: Time taken to run all checks
- **Scan ID**: Unique identifier for the scan
- **Data Source**: CSV file name or table name
- **Columns Analyzed**: List of all columns in the dataset

### 3. **Results Mapping** (Results Tab)

Each scan shows detailed results mapped to your data:

**Result Summary Cards:**
- **Total Checks**: Full count of quality checks run
- **Passed**: Number of checks that passed ✅
- **Failed**: Number of checks that failed ❌
- **Warnings**: Number of checks with warnings ⚠️

**Rule-to-Column Matrix:**
Shows which rules are applied to each column:

| Column | Rules Applied | Status |
|--------|---------------|--------|
| CustomerID | 🔐 Uniqueness, ✅ Completeness | Applied |
| Email | 📧 Validity, 🔐 Uniqueness | Applied |
| Age | 📊 Validity (min/max) | Applied |
| SignupDate | ⏰ Freshness | Applied |

---

## 📖 Example Workflow

### Step 1: Select Rules
```
Navigate to: ⚙️ Select Rules tab
- Check: ✅ Completeness Checks
- Check: 🔐 Uniqueness Checks
- Uncheck: Volume Checks (if you already know your data size)
```

### Step 2: Upload Data
```
Navigate to: 📤 Upload & Scan tab
- Select your CSV file
- Click 🚀 Run Scan
- Only selected rules will execute
```

### Step 3: Review Results
```
Navigate to: 📊 Results tab
- Click on a scan to expand it
- View Data Metadata (columns, row count, duration)
- Check Result Summary (passed/failed counts)
- Review Rule-to-Column Matrix
```

---

## 🗂️ Understanding the Rule Categories

### Volume Checks
**What it does:** Validates data volume
- `row_count > 0` - Table must have at least 1 row
- `row_count < 1000000` - Table should not exceed 1M rows

**Good for:** Catching empty datasets, detecting data loss

### Completeness Checks
**What it does:** Ensures no critical missing values
- `missing_count(CustomerID) = 0` - CustomerID required
- `missing_count(Email) = 0` - Email required
- `missing_percent(Age) < 10` - Age mostly present (< 10% nulls)

**Good for:** Ensuring key fields have required data

### Uniqueness Checks
**What it does:** Detects duplicate records
- `duplicate_count(CustomerID) = 0` - Each ID unique
- `duplicate_count(Email) = 0` - Each email unique

**Good for:** Primary key validation, finding duplicate entries

### Validity Checks
**What it does:** Validates format and bounds
- `invalid_count(Email) = 0` - All emails valid RFC 5322 format
- `min(Age) >= 13` - Age at least 13
- `max(Age) <= 120` - Age at most 120

**Good for:** Format validation, range checking

### Freshness Checks
**What it does:** Verifies data timeliness
- `freshness(SignupDate) < 730d` - Data within 2 years

**Good for:** Tracking data recency, compliance validation

---

## 📊 Metadata Information Explained

### Data Metadata
- **Rows Scanned**: How many records were analyzed
- **Columns Analyzed**: Which data fields were tested
- **Scan Duration**: Wall-clock time to run checks
- **Scan ID**: Unique reference for audit trails

### Results Mapping
Shows the correlation between:
1. **Columns** in your data
2. **Rules** applied to those columns
3. **Status** of each rule (applied/pending)

---

## 🔧 Advanced: Customizing Rules

To add more rules beyond the defaults:

1. **Edit Rule Configuration:**
   ```
   File: soda_duckdb/checks.yml
   ```

2. **Add new check (example):**
   ```yaml
   checks for customers:
     - row_count > 100           # Require at least 100 rows
     - duplicate_count(UserID) = 0
     - missing_count(Email) = 0
     - invalid_count(Email) = 0: valid format: email
   ```

3. **Upload data** - New rules will execute on next scan

4. **View results** - See new rules in the Results tab mapping

See `RULES_GUIDE.md` and `soda_duckdb/advanced_checks.yml` for more examples.

---

## 💡 Tips & Best Practices

### ✅ Do's
- ✅ Enable only the rules relevant to your data quality needs
- ✅ Review failed checks to understand data quality issues
- ✅ Compare pass rates across multiple scans to track improvements
- ✅ Use Completeness checks for critical business fields
- ✅ Use Uniqueness checks for identifiers (ID, email)

### ❌ Don'ts
- ❌ Don't ignore freshness checks if data timeliness matters
- ❌ Don't assume "passed" means data is clean overall (use multiple check types)
- ❌ Don't set unrealistic bounds (e.g., Age max = 200)
- ❌ Don't modify checks.yml without testing first

---

## 📞 Troubleshooting

### Problem: Scan status shows "CRITICAL" but I see passing checks
**Solution:** CRITICAL status means some checks failed. Look at the Result Summary to see which ones.

### Problem: Not all columns appear in the matrix
**Solution:** Only columns referenced in rules appear in the matrix. Add rules for other columns to track them.

### Problem: Rule selection checkboxes not saving
**Solution:** They save in browser memory for current session. Selections will reset on page reload (future: add localStorage persistence).

### Problem: Scan takes too long
**Solution:** Disable Volume and Freshness checks if you have very large datasets (millions of rows).

---

## 📚 Related Documentation

- **[RULES_GUIDE.md](RULES_GUIDE.md)** - Comprehensive rule reference with examples
- **[soda_duckdb/checks.yml](soda_duckdb/checks.yml)** - Active rule configuration
- **[soda_duckdb/advanced_checks.yml](soda_duckdb/advanced_checks.yml)** - 40+ rule templates
- **[README.md](README.md)** - System overview

---

## 🚀 Quick Start

```bash
# 1. Open the app
http://localhost:3000

# 2. Go to Select Rules tab
# Check: Completeness & Uniqueness

# 3. Go to Upload & Scan tab
# Upload: data/customers.csv

# 4. Go to Results tab
# Expand the scan to see:
# - Data metadata (row count, columns)
# - Result summary (passed/failed)
# - Rule-to-column matrix
```

---

**Last Updated:** April 1, 2026 | **Platform Version:** 1.0.0
