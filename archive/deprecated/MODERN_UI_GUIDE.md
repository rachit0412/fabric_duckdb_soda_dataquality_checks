# 🎯 Modern Data Quality Platform - User Guide

## ✨ What's New

The platform has been completely redesigned with a **modern, dynamic single-page layout**:

- ✅ **File upload + Rules selection on ONE screen** (side-by-side)
- ✅ **Modals for detailed views** (no more tabs)
- ✅ **Live results preview** showing immediately after scan
- ✅ **Modern design** with glass-morphism, gradients, smooth animations
- ✅ **Optimized performance** (47 KB JavaScript, 2.4 KB CSS)

---

## 🎨 Layout

### Left Panel (Upload & Rules)
```
┌─────────────────────────────┐
│ 📤 UPLOAD CSV FILE          │
│ ┌───────────────────────┐   │
│ │  📁 Drop or click    │   │
│ │  to select file      │   │
│ └───────────────────────┘   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ⚙️ SELECT RULES             │
│ ☑ 🔢 Volume                 │
│ ☑ ✅ Completeness           │
│ ☑ 🔐 Uniqueness             │
│ ☑ 📧 Validity               │
│ ☑ ⏰ Freshness              │
│                              │
│ 5/5 rules selected           │
└─────────────────────────────┘

│   🚀 RUN SCAN (Big Button)   │
└─────────────────────────────┘
```

### Right Panel (Results Preview)
```
┌─────────────────────────────┐
│ 📊 LATEST RESULTS           │
│                              │
│ Status:      PASSED ✅      │
│ Pass Rate:   100.0%         │
│ Checks:      9              │
│                              │
│ [View Details →] button     │
└─────────────────────────────┘
```

### Modals (Click to open)
- **📊 History Button** (Top right) → View all scan history
- **View Details Button** → See full scan results with metadata

---

## 🎯 Quick Start Workflow

### 1. Select Rules (Left Panel)
```
✓ Check the rule categories you want to test:
  - Volume: Row count validation
  - Completeness: Missing value checks
  - Uniqueness: Duplicate detection
  - Validity: Format & bounds checking
  - Freshness: Data timeliness
```

### 2. Upload CSV (Left Panel)
```
✓ Click the file drop zone
✓ Select a CSV file OR drag it in
✓ File name appears in the zone
```

### 3. Run Scan (Left Panel)
```
✓ Click 🚀 RUN SCAN button
✓ Button shows "⏳ Scanning..." while processing
✓ Results appear immediately in right panel
```

### 4. View Results (Right Panel)
```
✓ See status, pass rate, check count
✓ Click [View Details →] to open detailed modal
```

### 5. Browse History (Header)
```
✓ Click 📊 History button in header
✓ Modal shows all previous scans
✓ Click any scan to view details
```

---

## 📱 Mobile Responsive

Layout adapts automatically:
- **Desktop (>1000px)**: Side-by-side layout
- **Tablet (768-1000px)**: Stacked layout
- **Mobile (<768px)**: Full-width stacked with touch-optimized buttons

---

## 🎨 Modern Design Features

### Header
- Glass-morphism effect (frosted glass look)
- Background blur effect on modals
- Gradient button with hover animations
- Status indicator (Connected/Offline)

### Cards
- Smooth elevation on hover (translateY)
- Rounded corners (16px for large elements)
- Subtle shadows with depth

### Modals
- Slide-up animation on open
- Click outside to close
- Smooth fade overlay with blur

### Buttons
- Gradient backgrounds
- Hover: translateY(-3px) + enhanced shadow
- Disabled: opacity 0.6
- Loading state: pulse animation

---

## 📊 Results Modal Details

When you click [View Details →], you see:

```
TABLE:              customers
STATUS:             PASSED ✅
PASS RATE:          100.0%
DURATION:           0.45s

📈 METADATA
  Rows:             15
  Columns:          6 (CustomerID, Name, Email, Age, SignupDate, IsActive)

✅ CHECKS SUMMARY
  Total:            9
  Passed:           9 ✅
  Failed:           0 ❌
```

---

## 🔄 Scan History Modal

Access via 📊 History button:

```
SCAN 1: customers   [PASSED] 100.0%   2026-04-01 18:05:32
SCAN 2: customers   [WARNING] 77.8%   2026-04-01 18:02:15
SCAN 3: users       [CRITICAL] 55.6%  2026-04-01 17:58:42

→ Click any row to view full details
```

---

## 🎮 Keyboard Shortcuts & Tips

- **Drag & Drop**: Drag CSV file anywhere to upload zone
- **Enter Key**: Run scan (when Run button is focused)
- **Escape**: Close any modal
- **Click Outside Modal**: Close the modal

---

## 🔧 Configuration

### Change Default Rules

Edit `/workspaces/fabric_duckdb_soda_dataquality_checks/soda_duckdb/checks.yml`

Example:
```yaml
checks for customers:
  - row_count > 0
  - missing_count(CustomerID) = 0
  - duplicate_count(Email) = 0
  - invalid_count(Email) = 0: valid format: email
```

Upload a file to test the new rules.

---

## 📊 Understanding Results

### Pass Rate
- **100%**: All checks passed ✅
- **75-99%**: Most checks passed ⚠️  
- **<75%**: Many checks failed ❌

### Status Badges
- **PASSED** (Green): All checks successful
- **WARNING** (Yellow): Some checks flagged
- **CRITICAL** (Red): Major issues detected

### Color Coding
- Green (#4caf50): Success/Passed
- Yellow (#ff9800): Warning/Partial
- Red (#f44336): Error/Failed
- Purple (#667eea): Primary/Info

---

## 🚀 Access the Platform

```
🌐 Frontend:     http://localhost:3000
📡 API:          http://localhost:8000/api/health
📚 API Docs:     http://localhost:8000/docs
```

---

## 💾 Data Persistence

- Scans stored in PostgreSQL
- Full history accessible from History modal
- Metadata includes row count, columns, duration

---

## 🔗 Related Files

- **Frontend**: `/services/frontend/src/App.js` (clean, modern React)
- **Styles**: `/services/frontend/src/App.css` (500+ lines of modern CSS)
- **Backend API**: `/src/api/server.py` (FastAPI endpoints)
- **Rules Config**: `/soda_duckdb/checks.yml` (Soda Core quality rules)

---

## 📞 Support

All systems are designed to:
- ✅ Read CSV files correctly
- ✅ Execute selected rules only
- ✅ Display results with full metadata
- ✅ Store scan history
- ✅ Work offline-first (API status indicator)

For issues, check:
1. API health: http://localhost:8000/api/health
2. Browser console: Right-click → Inspect → Console
3. Docker logs: `docker logs dq-platform-api`

---

**Last Updated**: April 1, 2026 | **Version**: 1.0.1
