# Data Quality Platform - Feature Implementation Guide

## ✅ Features Implemented

### 1. Comprehensive Suggestion Rules (5+ Advanced Check Types)

**File**: `backend/src/services/suggestions.py`

The suggestion engine now includes these sophisticated rules:

#### Core Rules (Basic Data Quality)
- ✅ **NullCheckForPKRule** - Completeness for ID/key columns
- ✅ **UniquenessCheckRule** - Uniqueness for high-cardinality columns  
- ✅ **MissingCheckRule** - Missing value thresholds for important columns
- ✅ **RangeCheckNumericRule** - Min/max range validation
- ✅ **PatternCheckEmailRule** - Email format validation
- ✅ **EnumCheckRule** - Valid values for categorical columns
- ✅ **FreshnessCheckRule** - Data age verification

#### Advanced Rules (Soda Core Free Features)
- ✅ **AnomalyDetectionRule** - Statistical outlier detection (Z-score, IQR)
- ✅ **SchemaConsistencyRule** - Data type enforcement
- ✅ **DistributionAnalysisRule** - Distribution shift detection
- ✅ **RowCountConsistencyRule** - Table health & growth checks
- ✅ **ReferentialIntegrityPatternRule** - FK relationship validation
- ✅ **DataTypeValidationRule** - Format validation for common types

### 2. Freshness Checks

**Detection**: Automatically detects timestamp columns (created_at, updated_at, loaded_at, etc.)

**Soda YAML Generated**:
```yaml
checks:
  - name: 'updated_at is recent'
    type: freshness
    column: updated_at
    timespan: 24h
    fail: when older than
  
  - name: 'daily records exist'
    type: missing_count
    column: created_at
    filters:
      - created_at >= CURRENT_DATE
    fail: when = 0
```

**Why This Matters**: Detects stale data pipelines, identifies data sync failures

### 3. Referential Integrity Checks

**Pattern-Based Detection**: Identifies FK-like columns (*_id, ref_*, parent_*, owner_*)

**Soda YAML Generated**:
```yaml
checks:
  - name: 'customer_id has valid references'
    type: valid_values
    column: customer_id
    fail: when not in customers.id
```

**Why This Matters**: Ensures data consistency across related tables, detects orphaned records

### 4. Advanced Visualization (React Chart.js)

**File**: `services/frontend/src/components/ResultsVisualization.js`

**Features**:
- 📊 **Overview Tab**: Pass rate pie chart + check type distribution bar chart
- 📈 **Details Tab**: Column quality scorecard with color-coded scores
- 📉 **Trends Tab**: Historical pass rate trends (7-day configurable)
- 💾 **Metric Cards**: At-a-glance statistics (Pass Rate, Total Checks, Passed, Failed)

**Installation Needed**:
```bash
npm install chart.js react-chartjs-2
```

### 5. Record-Level Anomalies

**Detection Methods**:
- **Z-Score**: Detects values > 3 standard deviations from mean
- **IQR (Interquartile Range)**: Robust method for outlier detection
- **Format Anomalies**: Pattern breaks (email format, date format, etc.)

**Soda YAML Generated**:
```yaml
checks:
  - name: 'amount statistical outliers'
    type: anomaly_detection
    column: amount
    method: zscore      # or 'iqr'
    threshold: 3.0
    fail: when found > 0
```

### 6. Comprehensive Soda Core Features

**Check Types Supported** (Free Tier):
1. ✅ `missing_count` - NULL value detection
2. ✅ `duplicate_count` - Uniqueness violations
3. ✅ `invalid_count` - Range/format validation
4. ✅ `valid_values` - Enum/category checks
5. ✅ `valid_regex` - Pattern validation
6. ✅ `valid_min`/`valid_max` - Numeric boundaries
7. ✅ `freshness` - Data age checks
8. ✅ `schema_type` - Type enforcement
9. ✅ `row_count` - Table size consistency
10. ✅ `anomaly_detection` - Statistical outliers

**Advanced Capabilities**:
- Threshold expressions: `fail: when > 10`, `when >= row_count * 0.05`
- Filters: `filters: [created_at >= CURRENT_DATE]`
- Multi-column comparisons
- Custom SQL checks

---

## 📊 New API Endpoints

### Visualization Endpoints

```
GET  /api/v1/visualization/runs/{run_id}/metrics
     Returns: { summary, by_column, by_check_type, timestamps }
     
GET  /api/v1/visualization/plans/{plan_id}/trend?days=7
     Returns: { data_points: [{ date, pass_rate, passed, failed }] }
     
GET  /api/v1/visualization/summary/quality-by-column?days=7
     Returns: { quality_scoreboard: [{ column, quality_score, ... }] }
```

---

## 🎨 Frontend Integration

### Installation
```bash
cd services/frontend
npm install chart.js react-chartjs-2
```

### Usage in Dashboard Component

```javascript
import ResultsVisualization from './ResultsVisualization';

// In Step 5 Results component:
const [metrics, setMetrics] = useState(null);

useEffect(() => {
  if (runResults?.id) {
    fetch(`http://localhost:8000/api/v1/visualization/runs/${runResults.id}/metrics`)
      .then(r => r.json())
      .then(setMetrics);
  }
}, [runResults?.id]);

return (
  <>
    <ResultsVisualization 
      runId={runResults?.id}
      metrics={metrics}
      planId={checkPlanId}
    />
  </>
);
```

---

## 🔄 Database Schema Updates

### New Tables (Optional - for enhanced tracking)

```sql
-- Record-level anomalies (for future versions)
CREATE TABLE record_anomalies (
    id uuid PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES runs(id),
    column_name VARCHAR(255),
    anomaly_type VARCHAR(50),  -- 'outlier', 'pattern_break', 'rare_combination'
    severity VARCHAR(20),       -- 'low', 'medium', 'high'
    sample_value TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Freshness tracking
ALTER TABLE check_results ADD COLUMN age_hours INT;
ALTER TABLE check_results ADD COLUMN freshness_status VARCHAR(20);  -- 'fresh', 'stale', 'unknown'
```

---

## 🧪 Testing

### Test Suggestion Generation

```python
from src.services.suggestions import SuggestionEngine

engine = SuggestionEngine()
schema = {
    "columns": [
        {"name": "user_id", "type": "INT", "distinct_count": 1000, "row_count": 1000},
        {"name": "email", "type": "VARCHAR", "nullable": True, "row_count": 1000},
        {"name": "created_at", "type": "TIMESTAMP", "row_count": 1000},
        {"name": "status", "type": "VARCHAR", "distinct_count": 5, "row_count": 1000},
    ]
}

suggestions = engine.generate_suggestions(schema)
# Returns 7+ suggestions with Soda YAML for each
```

### Test Visualization API

```bash
# Get run metrics
curl http://localhost:8000/api/v1/visualization/runs/{run_id}/metrics

# Get plan trends
curl http://localhost:8000/api/v1/visualization/plans/{plan_id}/trend?days=7

# Get quality summary
curl http://localhost:8000/api/v1/visualization/summary/quality-by-column?days=7
```

---

## 📈 How It All Works Together

### End-to-End Flow

1. **User uploads CSV** (Step 1)
   - Connection created, stored

2. **System profiles data** (Step 2)
   - Extracts schema: columns, types, cardinality, statistics
   - Detects FK patterns, timestamp columns, categorical columns

3. **AI generates intelligent suggestions** (Step 3)
   - 12 rules analyze schema
   - Generates 5-10 relevant checks with rationale + Soda YAML
   - Examples:
     - "user_id is not null" (NullCheckForPKRule)
     - "email email format" (PatternCheckEmailRule)
     - "created_at is recent" (FreshnessCheckRule)
     - "amount statistical outliers" (AnomalyDetectionRule)

4. **User selects & customizes checks** (Steps 3-4)
   - Reviews AI suggestions
   - Manually adds checks with custom form
   - Can specify thresholds, filters, etc.

5. **System executes checks** (Step 4)
   - Creates CheckPlan with all selected checks
   - Worker polls for pending runs
   - Soda Core executes checks against data
   - Stores results in database

6. **Rich visualization of results** (Step 5)
   - Overview tab: Pass rate pie chart, status distribution
   - Details tab: Column quality scorecard (per-column scores)
   - Trends tab: Historical pass rate trend line

---

## 🎯 Key Quality Metrics

The platform now tracks:

- **Pass Rate %** - Overall data quality
- **Column Quality Scores** - Per-column health (0-100)
- **Check Distribution** - Results grouped by check type
- **Trend Analysis** - Quality trends over time
- **Anomaly Detection** - Statistical outliers and pattern breaks
- **Freshness Status** - Data recency metrics
- **Referential Integrity** - FK relationship health

---

## 🚀 Next Steps / Enhancements

### Phase 1 (Current)
✅ Advanced suggestion engine (12 rules)
✅ Visualization dashboard
✅ Freshness + referential checks

### Phase 2 (Planned)
⏳ Grafana integration (optional - free tier available)
⏳ Email alerts for critical issues
⏳ Data lineage tracking

### Phase 3 (Future)
⏳ ML-based anomaly detection
⏳ Predictive data quality alerts
⏳ Custom rule builder UI

---

## 📊 Usage Examples

### Example 1: E-commerce Dataset

Input CSV columns: `order_id, customer_id, email, amount, created_at, status`

Generated Suggestions:
1. ✅ `order_id is not null` (Completeness - confidence 0.95)
2. ✅ `customer_id references customers` (Referential Integrity - 0.80)
3. ✅ `email email format` (Format Validity - 0.85)
4. ✅ `amount within valid range 0-999999` (Range Validity - 0.75)
5. ✅ `created_at is recent` (Freshness - 0.90)
6. ✅ `status in ['pending', 'shipped', 'delivered']` (Enum Validity - 0.80)
7. ✅ `amount statistical outliers` (Anomaly Detection - 0.80)

All generated as Soda YAML ready to execute.

### Example 2: User Analytics

Input: `user_id, email, signup_date, last_login, region`

Generated:
1. ✅ `user_id is unique` (Uniqueness - 0.95)
2. ✅ `email is not null` (Completeness - 0.85)
3. ✅ `signup_date is recent` (Freshness - 0.90)
4. ✅ `last_login no more than 30 days old` (Freshness - 0.75)
5. ✅ `region in valid regions` (Enum - 0.80)

---

## 🔧 Configuration

All features use **free tier** of Soda Core 3.0+

No additional licenses required for:
- ✅ Missing count checks
- ✅ Duplicate count checks
- ✅ Invalid count checks
- ✅ Valid values checks
- ✅ Valid regex checks
- ✅ Freshness checks
- ✅ Schema type checks
- ✅ Row count checks
- ✅ Anomaly detection

---

## 📚 References

- Soda Core Documentation: https://docs.soda.io/soda-core/
- Soda Check Types: https://docs.soda.io/soda-core/soda-core-overview.html#checks
- React Chart.js: https://react-chartjs-2.js.org/
- Chart.js Documentation: https://www.chartjs.org/

