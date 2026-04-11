# Data Quality Platform - Feature Enhancements

## Overview

Enhancing the DQ platform with 5 advanced features to provide comprehensive data quality monitoring:

1. **Freshness Checks** - Detect stale/outdated data
2. **Referential Integrity Checks** - Validate foreign key relationships
3. **Advanced Visualization** - React Chart.js for check results and metrics
4. **Record-Level Anomalies** - Detect unusual patterns and outliers
5. **Comprehensive Soda Features** - Leverage all free Soda Core capabilities

---

## 1. Freshness Checks

### Current Status
- ✅ FreshnessCheckRule exists in suggestions engine
- ❌ Not exposed in UI
- ❌ Not fully integrated with Soda execution

### Enhancement Plan

**A. Expand in Suggestions Service**
- Detect timestamp columns (created_at, updated_at, loaded_at, etc.)
- Auto-suggest freshness checks with configurable thresholds
- Support multiple time intervals (minutes, hours, days)

**B. Soda Core Integration**
```yaml
# Freshness Checks (Soda Core free feature)
checks:
  - name: Data loaded within 24 hours
    type: freshness
    column: updated_at
    timespan: 24h
    fail: when older than
  
  - name: Recent records exist
    type: missing_count_last_24h
    column: created_at
    fail: when = 0
```

**C. Backend Support**
- Add `FreshnessCheck` model to database
- Extend check plan creation to handle freshness thresholds
- Parse freshness results with age metrics

**D. Frontend Display**
- Show freshness status on results dashboard
- Green: Data < 1 hour old
- Yellow: Data < 24 hours old
- Red: Data > 24 hours old

---

## 2. Referential Integrity Checks

### Current Status
- ❌ No support

### Enhancement Plan

**A. Database Schema Requirement**
- Add `foreign_keys` to MetadataSnapshot schema
- Detect FK relationships during profiling
- Store referee table and column info

**B. Soda Core Integration**
```yaml
# Referential Integrity Checks (Soda Core free feature)
checks:
  - name: No orphaned orders
    type: valid_values
    column: customer_id
    fail: when in valid_values ["SELECT id FROM customers"]
  
  - name: All customers referenced
    type: missing_count
    column: customer_id
    fail: when are null
```

**C. Profile Enhancement**
- Detect FK constraints during profiling
- Suggest referential integrity checks
- Store discovered relationships

**D. Check Types**
- **Orphaned Records**: Child table has IDs not in parent
- **Dangling References**: Parent references non-existent child
- **Cross-table Consistency**: Values match between tables

---

## 3. Advanced Visualization (Chart.js)

### Current Status
- ✅ UI displays check results in grid
- ❌ No charts/graphs

### Enhancement Plan

**A. Chart Types**
1. **Check Status Distribution**
   - Pie chart: Passed vs Failed vs Skipped
   - Trend line: Pass rate over time

2. **Per-Column Results**
   - Bar chart: Checks per column
   - Heatmap: Column quality scores

3. **Metric Trends**
   - Line graph: Missing count over runs
   - Line graph: Duplicate count trend
   - Line graph: Data freshness age

4. **Anomaly Distribution**
   - Histogram: Outlier frequencies by column
   - Time-series: Anomalies detected over time

**B. Frontend Implementation**
- Install: `react-chartjs-2` and `chart.js`
- Add new component: `ResultsVisualization.js`
- Integrate into Step 5 (Results)
- Interactive charts with drill-down capability

**C. Backend API Enhancement**
- New endpoint: `/api/v1/results/{run_id}/metrics`
- Returns aggregated checkmetrics for charting
- Support time-series queries

---

## 4. Record-Level Anomalies

### Current Status
- ✅ Anomaly detection code exists in backend
- ❌ Not integrated with Soda execution
- ❌ Not displayed in results

### Enhancement Plan

**A. Anomaly Types**
1. **Statistical Outliers**
   - Z-score method (normal distribution)
   - IQR method (robust to outliers)
   - MAD method (median absolute deviation)

2. **Pattern Anomalies**
   - Format changes (email format breaks)
   - Date anomalies (future dates, impossible values)
   - Categorical unexpected values

3. **Behavioral Anomalies**
   - Sudden distribution shifts
   - Rare value combinations
   - High cardinality spikes

**B. Soda Core Integration**
```yaml
# Anomaly Detection (Soda Core free feature)
checks:
  - name: Numeric column outliers
    type: anomaly_detection
    column: amount
    method: zscore  # or iqr
    threshold: 3
    fail: when found
  
  - name: Categorical pattern break
    type: valid_regex
    column: email
    valid_regex: "^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$"
    fail: when > 0
```

**C. Backend Storage**
- Add `RecordAnomaly` model
- Store: anomaly_type, column, record_id, severity, details
- Link to CheckResult

**D. Frontend Display**
- Show anomaly count in results summary
- List top 5 record-level anomalies with drill-in
- Anomaly severity indicators

---

## 5. Comprehensive Soda Core Free Features

### Features to Leverage

**A. Check Types**
- ✅ missing_count (NULL values)
- ✅ duplicate_count (uniqueness)
- ✅ invalid_count (range/format validation)
- ✅ valid_values (enum/category checks)
- ✅ valid_regex (pattern validation)
- ✅ valid_min/max (numeric ranges)
- ✅ freshness (data age)
- ✅ schema_type (column type enforcement)
- ✅ row_count (table size/growth checks)

**B. Advanced Features**
- Row-level failed_rows capture
- Custom SQL checks (`query`)
- Column-to-column comparisons
- Distribution analysis
- Regex pattern matching
- Numeric statistics

**C. Configuration Options**
- Threshold expressions: `fail: when > 10`, `when >= row_count * 0.05`
- Thresholds per check
- Query groups and filtering
- Pass/warn/fail conditions

**D. Profiling & Insight Features**
- Automatic column statistics
- Sample data collection
- Cardinaltiy analysis
- Distribution profiling
- Data type inference

---

## Implementation Priority

### Phase 1 (Critical)
1. ✅ Record-level anomalies (already have code)
2. ⏳ Visualization with Chart.js
3. ⏳ Freshness check integration

### Phase 2 (High)
4. ⏳ Referential integrity checks
5. ⏳ Enhanced suggestions with all Soda features

### Phase 3 (Nice-to-have)
6. ⏳ Grafana integration (optional)
7. ⏳ Advanced distribution analysis

---

## Database Schema Changes

```sql
-- Add to MetadataSnapshot
ALTER TABLE metadata_snapshots ADD COLUMN foreign_keys JSONB;

-- Add anomaly detection results
CREATE TABLE record_anomalies (
    id uuid PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES runs(id),
    column_name VARCHAR(255),
    anomaly_type VARCHAR(50),  -- 'outlier', 'pattern_break', 'rare_combination'
    severity VARCHAR(20),      -- 'low', 'medium', 'high'
    sample_value TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add temporal tracking for freshness
ALTER TABLE check_results ADD COLUMN age_hours INT;
ALTER TABLE check_results ADD COLUMN freshness_status VARCHAR(20);  -- 'fresh', 'stale', 'unknown'
```

---

## API Endpoints

### New Endpoints
```
POST   /api/v1/results/{run_id}/metrics        - Get visual metrics
GET    /api/v1/results/{run_id}/anomalies      - Get record anomalies
GET    /api/v1/results/{run_id}/anomalies/{id} - Get anomaly details
GET    /api/v1/metadata/{snapshot_id}/fk       - Get foreign keys
POST   /api/v1/suggestions/freshness           - Get freshness suggestions
POST   /api/v1/suggestions/referential         - Get referential suggestions
```

---

## Frontend Components

```
ResultsVisualization/
├── CheckStatusChart.js (pie/ring chart)
├── TrendAnalysis.js (line chart)
├── ColumnQualityHeatmap.js (heatmap)
├── AnomalyBreakdown.js (table + drill-in)
└── MetricsCardGrid.js (summary stats)

CheckTypes/
├── FreshnessCheckDashboard.js
└── ReferentialIntegrityTable.js
```

---

## Success Metrics

✓ Detects data freshness issues automatically
✓ Identifies referential integrity violations
✓ Visualizes check results with charts
✓ Highlights record-level anomalies
✓ Uses 10+ Soda Core check types
✓ Provides actionable insights in UI

