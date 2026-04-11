# 📋 Rules and Checks Mapping Guide

## Overview

This document explains the alignment between the **8 Rule Categories** shown in the UI and the **13 Actual Data Quality Checks** executed by Soda Core on the backend.

---

## 🎯 Rules → Checks Mapping

### 1️⃣ **🔢 Row Count Validation** (2 checks)

**Category ID:** `rowCount`  
**Description:** Volume checks - ensure data exists and isn't too large

| Check Name | Purpose | Status |
|-----------|---------|--------|
| `row_count > 0` | Must have data | ✅ Essential |
| `row_count < 1000000` | Can't exceed 1M rows | ✅ Essential |

**What it catches:** Empty files, huge datasets that shouldn't exist

**When it fails:** 
- 0 rows: "Expected: > 0, Actual: 0" 
- 2M rows: "Expected: < 1000000, Actual: 2000000"

---

### 2️⃣ **✅ Missing Value Checks** (4 checks)

**Category ID:** `missingValues`  
**Description:** Completeness checks - detect NULL/empty values

| Check Name | Column(s) | Purpose |
|-----------|-----------|---------|
| `missing_count(CustomerID) = 0` | CustomerID | No NULL customer IDs |
| `missing_count(Email) = 0` | Email | No NULL emails |
| `missing_count(Name) = 0` | Name | No NULL names |
| `missing_percent(Age) < 10` | Age | Less than 10% missing ages |

**What it catches:** Required fields that are empty

**When it fails:**
- "Expected: = 0, Actual: 5" → 5 records missing this field
- "Expected: < 10%, Actual: 12%" → Too many missing values

---

### 3️⃣ **🔐 Duplicate Detection** (2 checks)

**Category ID:** `duplicates`  
**Description:** Uniqueness checks - find duplicate values

| Check Name | Column(s) | Purpose |
|-----------|-----------|---------|
| `duplicate_count(CustomerID) = 0` | CustomerID | No duplicate IDs |
| `duplicate_count(Email) = 0` | Email | No duplicate emails |

**What it catches:** Multiple records with the same ID or email

**When it fails:**
- "Expected: = 0, Actual: 3" → 3 duplicate entries found

---

### 4️⃣ **📧 Format Validation** (1 check)

**Category ID:** `formatValidation`  
**Description:** Validity checks - ensure data formats are correct

| Check Name | Column(s) | Purpose |
|-----------|-----------|---------|
| `invalid_count(Email) = 0` | Email | All emails are valid format |

**Format Check:** `valid format: email` - RFC 5322 compliant

**What it catches:** Malformed emails (missing @, domain, etc)

**When it fails:**
- "Expected: = 0, Actual: 1" → 1 invalid email found
- Example: "user@" or "user@domain" (missing parts)

---

### 5️⃣ **📊 Range & Bounds** (3 checks)

**Category ID:** `rangeValidation`  
**Description:** Statistical checks - min/max/average ranges

| Check Name | Column(s) | Purpose |
|-----------|-----------|---------|
| `min(Age) >= 13` | Age | Minimum age is 13 |
| `max(Age) <= 120` | Age | Maximum age is 120 |
| `avg(Age) between 20 and 80` | Age | Average age in reasonable range |

**What it catches:** Out-of-range values or wrong data distributions

**When it fails:**
- Min: "Expected: >= 13, Actual: 5" → Found age 5
- Max: "Expected: <= 120, Actual: 125" → Found age 125
- Avg: "Expected: between 20-80, Actual: 15.2" → Average too young

---

### 6️⃣ **⏰ Data Freshness** (1 check)

**Category ID:** `freshness`  
**Description:** Timeliness checks - ensure data is current

| Check Name | Column(s) | Purpose |
|-----------|-----------|---------|
| `missing_count(SignupDate) = 0` | SignupDate | All records have signup dates |

**What it catches:** Missing or NULL date fields

**When it fails:**
- "Expected: = 0, Actual: 2" → 2 records missing signup date

**Note:** Currently using completeness for dates (no stale check yet)

---

### 7️⃣ **🎯 Custom Patterns** (0 checks - Premium)

**Category ID:** `customPatterns`  
**Description:** Advanced regex and business rule validation

**Available:** Phone numbers, postal codes, custom patterns  
**Status:** 🔒 Premium feature (disabled by default)

---

### 8️⃣ **⚠️ Anomaly Detection** (0 checks - ML)

**Category ID:** `anomaly`  
**Description:** Statistical anomalies and outliers (AI-powered)

**Detects:** Unusual patterns, sudden changes, statistical oddities  
**Status:** 🔒 Premium feature (disabled by default)

---

## 📊 Total Checks Summary

```
┌─────────────────────────────────────┐
│  8 RULE CATEGORIES                  │
│  ↓                                  │
│  13 DATA QUALITY CHECKS             │
│  ↓                                  │
│  ✅ 11 typically pass (sample data) │
│  ❌ 2-3 typically fail (data issues)│
└─────────────────────────────────────┘

Breakdown:
- Row Count:        2 checks  ✅
- Missing Values:   4 checks  ✅✅✅❌
- Duplicates:       2 checks  ✅✅
- Format (Email):   1 check   ❌
- Range (Age):      3 checks  ✅✅✅
- Freshness:        1 check   ✅
────────────────────
TOTAL:             13 checks
```

---

## 🎯 Reading the Results Modal

### Category Section Layout

Each category in results shows:

```
📧 Format Validation
✅ 0      ❌ 1

├─ ✅ duplicate_count(Email) = 0
│  ├─ Found: 0
│  └─ Expected: 0
│
└─ ❌ invalid_count(Email) = 0 [Email]
   ├─ Found: 1
   └─ Expected: 0 (valid email format)
```

### Color Coding

| Color | Meaning | Indicator |
|-------|---------|-----------|
| 🟢 Green | All checks passed | `category-pass` |
| 🟠 Orange | Some checks failed | `category-partial` |
| 🔴 Red | All checks failed | `category-fail` |

### Status Badges

- **✅ N** - N checks passed in this category
- **❌ N** - N checks failed in this category

---

## 🔍 Finding Issues Quickly

### Step 1: Look at Category Summary
```
When you see:
📊 Range & Bounds
✅ 2  ❌ 1

You know: 2 range checks passed, 1 failed
```

### Step 2: Check Which Failed
```
Expand the category to see:
❌ max(Age) <= 120 [Age]
   📍 Found: 125
   🎯 Expected: 0 <= x <= 120
```

### Step 3: Understand the Issue
```
The data has age values that exceed 120
This likely means:
- Test/placeholder data (age = 999)
- Data entry error (age = 2500)
- Invalid data format (age = "N/A")
```

### Step 4: Fix the Data
```
Options:
1. Remove invalid age records
2. Update age values to valid range
3. Clean up test/placeholder data
4. Add data validation to input form
```

---

## 📋 Check Selection Behavior

### Current Behavior
- ✅ You select 8 rule categories
- ✅ Backend automatically runs all 13 checks
- ✅ Results grouped and displayed by category

### Why?
- **Consistency:** Always run same core checks
- **Completeness:** Get full picture of data quality
- **Visibility:** See all issues at once

### Examples

#### Example 1: Missing Email
**Issue:** One record has missing email  
**Location:** Missing Value Checks → `missing_count(Email) = 0`  
**Result:** ❌ FAILED, Found: 1, Expected: 0  
**Fix:** Add email to that record

#### Example 2: Invalid Email Format
**Issue:** One email doesn't have @ symbol  
**Location:** Format Validation → `invalid_count(Email) = 0`  
**Result:** ❌ FAILED, Found: 1, Expected: 0  
**Fix:** Correct email address

#### Example 3: Duplicate Customer ID
**Issue:** Two records have same CustomerID  
**Location:** Duplicate Detection → `duplicate_count(CustomerID) = 0`  
**Result:** ❌ FAILED, Found: 2, Expected: 0  
**Fix:** Remove duplicate or update ID

---

## 🚀 Quick Reference

### All 13 Checks at a Glance

```
VOLUME (2)            COMPLETENESS (4)      UNIQUENESS (2)
├─ row_count > 0      ├─ missing(ID) = 0   ├─ dupes(ID) = 0
└─ row_count < 1M     ├─ missing(Email)    └─ dupes(Email)
                      ├─ missing(Name)
FORMAT (1)            └─ missing%(Age)     FRESHNESS (1)
├─ invalid(Email)     RANGE (3)            └─ missing(Date)
                      ├─ min(Age) >= 13
                      ├─ max(Age) <= 120
                      └─ avg(Age) 20-80
```

---

## 📈 Next Steps

1. **View scan results** → Organized by category
2. **Click category** → See all checks in that area
3. **Read failure reasons** → See exactly what's wrong
4. **Fix data issues** → Update CSV or validation rules
5. **Re-scan** → Verify fixes worked

---

## 🔗 Related Docs

- [DETAILED_RESULTS_GUIDE.md](DETAILED_RESULTS_GUIDE.md) - How to interpret results
- [README.md](README.md) - Project overview
- [GETTING_STARTED.md](GETTING_STARTED.md) - Quick start guide

---

**Last Updated:** 2026-04-01  
**Version:** 1.0.2
