# Enhanced Results & Rule Selection Guide

**Version:** 1.0.2 | **Last Updated:** 2026-04-01

## 🆕 What's New in v1.0.2

The platform now shows **detailed, check-by-check results** instead of just aggregate numbers. You can see exactly which checks passed, which failed, and why!

---

## ✨ New Features Overview

### 1. Detailed Check Results Modal

When you click "View Details" after a scan, you now see:

```
📊 SCAN RESULTS
Table: customers
Status: CRITICAL ⚠️
Pass Rate: 83.3%
Duration: 1.43s

✅ CHECKS SUMMARY
Total: 12 | Passed: 10 ✅ | Failed: 2 ❌

🔍 INDIVIDUAL CHECK RESULTS
════════════════════════════

✅ PASS | row_count > 0
✅ PASS | row_count < 1000000
✅ PASS | missing_count(CustomerID) = 0
✅ PASS | duplicate_count(CustomerID) = 0
✅ PASS | missing_count(Email) = 0
✅ PASS | duplicate_count(Email) = 0

❌ FAIL | invalid_count(Email) = 0
    📍 Actual: 1
    🎯 Expected: 0

❌ FAIL | missing_count(Name) = 0
    📍 Actual: 1
    🎯 Expected: 0

✅ PASS | missing_percent(Age) < 10
✅ PASS | min(Age) >= 13
✅ PASS | max(Age) <= 120
✅ PASS | avg(Age) between 20 and 80
```

### 2. Expanded Rule Categories

Instead of fixed 5 rules, now select from **8 rule categories**:

| Category | Description | What It Checks |
|----------|-------------|-----------------|
| **🔢 Row Count** | Volume validation | Must have data, not too large |
| **✅ Missing Values** | Completeness | NULL/missing in critical columns |
| **🔐 Duplicates** | Uniqueness | Duplicate values in keys |
| **📧 Format** | Validity | Email, date, phone format validation |
| **📊 Range & Bounds** | Statistical | Min/Max/Avg ranges |
| **⏰ Freshness** | Timeliness | Data must be current |
| **🎯 Custom Patterns** | Advanced | Regex patterns, business rules |
| **⚠️ Anomaly Detection** | ML-based | Statistical anomalies (coming soon) |

---

## 📖 How to Use the New Features

### Step 1: Run a Scan

```
1. Upload CSV file
2. Select desired rule categories (check the ones you want)
3. Click "🚀 Run Scan"
```

**Which rules to select?**
- **Want quick check?** Select first 3 (row count, missing values, duplicates)
- **Want comprehensive?** Select all 6 active categories
- **Want advanced tests?** Enable Custom Patterns (future feature)

### Step 2: View Results

In the right panel, see the quick summary:

```
📊 Latest Results

Status: CRITICAL ⚠️
Pass Rate: 83.3%
Checks: 12

[View Details →]
```

Click **"View Details"** to open the detailed modal.

### Step 3: Review Detailed Checks

Now you see **every single check** with:

✅ **PASSED checks** - Green checkmark, shows actual value
```
✅ PASS | row_count > 0
✅ PASS | duplicate_count(CustomerID) = 0
```

❌ **FAILED checks** - Red X, shows actual vs expected
```
❌ FAIL | invalid_count(Email) = 0
    📍 Actual: 1    ← Found 1 invalid email
    🎯 Expected: 0  ← Should be 0
```

### Step 4: Take Action

Based on failure reasons:

1. **Invalid Email (1 found)**
   - Review the email values in your data
   - Fix format issues
   - Re-run scan

2. **Missing Name (1 found)**
   - Identify which rows have NULL Name
   - Fill in missing values
   - Re-run scan

---

## 🎯 Understanding Check Results

### Pass Cases

```
✅ PASS | row_count > 0
    Actual: 15 rows
    ✅ Data exists!

✅ PASS | duplicate_count(CustomerID) = 0
    Actual: 0 duplicates
    ✅ All IDs are unique!
```

### Failure Cases & How to Fix

#### Case 1: Invalid Format
```
❌ FAIL | invalid_count(Email) = 0
    Actual: 1 invalid email
    Expected: 0
    
Fix: Check email format constraints
```

#### Case 2: Missing Values
```
❌ FAIL | missing_count(Name) = 0
    Actual: 1 NULL value
    Expected: 0
    
Fix: Some rows have empty Name field
```

#### Case 3: Out of Range
```
❌ FAIL | min(Age) >= 13
    Actual: Minimum age is 7
    Expected: >= 13
    
Fix: Some ages are below minimum (7 < 13)
```

#### Case 4: Duplicates Found
```
❌ FAIL | duplicate_count(Email) = 0
    Actual: 2 duplicate emails
    Expected: 0
    
Fix: Email appears twice - data duplication issue
```

---

## 📊 All Available Checks

### 1. Volume Checks
```
row_count > 0                  ← Must have at least 1 row
row_count < 1000000            ← Can't exceed 1 million rows
```

### 2. Completeness Checks
```
missing_count(CustomerID) = 0  ← No NULLs in ID
missing_count(Email) = 0       ← No NULLs in Email
missing_count(Name) = 0        ← No NULLs in Name
missing_percent(Age) < 10      ← Less than 10% NULLs in Age
```

### 3. Uniqueness Checks
```
duplicate_count(CustomerID) = 0 ← No duplicate IDs
duplicate_count(Email) = 0      ← No duplicate emails
```

### 4. Validity Checks
```
invalid_count(Email) = 0        ← All emails have valid format
```

### 5. Range & Bounds Checks
```
min(Age) >= 13                  ← Youngest must be at least 13
max(Age) <= 120                 ← Oldest can't exceed 120
avg(Age) between 20 and 80      ← Average age in reasonable range
```

### 6. Freshness Checks
```
freshness(SignupDate) < 730d    ← Data must be less than 2 years old
```

---

## 🔧 Troubleshooting Results

### Problem: "All checks show PASS but status is CRITICAL"
→ System uses thresholds: <95% = CRITICAL, 95-98% = WARNING
→ Even 1 failure triggers warning/critical status

### Problem: "Freshness check always fails"
→ SignupDate column is stored as TEXT, not DATE
→ Need to cast to proper datetime type
→ Contact admin to fix data type

### Problem: "I don't see certain columns in checks"
→ Only critical columns are checked by default
→ Add custom rules in soda_duckdb/checks.yml
→ Contact team to add column-specific checks

### Problem: "Check results don't match my data"
→ Results may be cached from last run
→ Clear browser cache (Ctrl+Shift+Delete)
→ Or refresh hard (Ctrl+Shift+R)
→ Re-run the scan

---

## 📋 Check Result Examples from Real Data

### Example 1: Good Data Quality
```json
{
  "total_checks": 12,
  "passed_checks": 12,
  "failed_checks": 0,
  "pass_rate": 1.0,
  "status": "PASSED" ✅
}
```
→ All checks pass! Data is production-ready

### Example 2: Warning Status
```json
{
  "total_checks": 12,
  "passed_checks": 11,
  "failed_checks": 1,
  "pass_rate": 0.9167,
  "status": "WARNING" ⚠️
}
```
→ Minor issue detected, investigate before use

### Example 3: Critical Status
```json
{
  "total_checks": 12,
  "passed_checks": 10,
  "failed_checks": 2,
  "pass_rate": 0.8333,
  "status": "CRITICAL" ❌
}
```
→ Significant data quality issues, do not use until fixed

---

## 🎓 Quick Reference

| You want to... | Do this... | Check for... |
|---|---|---|
| Ensure table has data | Enable "Row Count" | row_count > 0 |
| Find missing values | Enable "Missing Values" | missing_count |
| Detect duplicate IDs | Enable "Duplicates" | duplicate_count |
| Validate email format | Enable "Format" | invalid_count(Email) |
| Find data age | Enable "Freshness" | freshness check |
| Check value ranges | Enable "Range & Bounds" | min/max/avg checks |

---

## 🚀 Next Steps

### If checks are PASSING ✅
```
→ Data is good!
→ Safe to use for analysis
→ Schedule regular rescans
```

### If checks are FAILING ❌
```
1. Read detailed failure reasons
2. Identify the root cause
3. Fix the data or rules
4. Re-run scan to verify
5. Document findings
```

### For Advanced Users
```
→ Edit soda_duckdb/checks.yml for custom rules
→ Add column-specific validations
→ Create business rule checks
→ Set custom thresholds
```

---

## 📞 Support

- **View detailed rules:** [RULE_SELECTION_GUIDE.md](RULE_SELECTION_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **API documentation:** [API_REFERENCE.md](API_REFERENCE.md)
- **All rules config:** `/soda_duckdb/checks.yml`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0.2** | 2026-04-01 | ✨ Added detailed check results modal and expanded rules UI |
| 1.0.1 | 2026-04-01 | Fixed docker configuration paths |
| 1.0.0 | 2026-03-31 | Initial release with modern UI |

---

**Ready to see your scan results?** Upload a CSV and click "Run Scan" to get started! 🚀
