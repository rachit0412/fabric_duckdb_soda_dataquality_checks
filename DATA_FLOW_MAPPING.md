# Complete Data Flow Mapping: Soda Checks System

## Overview: User Journey & System Flow

**User Interaction:** Click "Generate" (Step 2) → Step 3: AI Suggestions → Step 4: Plan Review → Execute

---

## 1. STEP 3: AI-SUGGESTED CHECKS (Soda Core Default Checks)

### Frontend: How Suggestions are Requested

**File:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js#L155-L172)

```javascript
// Function: generateSuggestions()
const generateSuggestions = async (connectionId) => {
  setLoading(true);
  setError('');
  try {
    const res = await fetch(`${API_BASE}/suggestions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_id: connectionId, limit: 10 }),
    });
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setCurrentStep(3);
  } catch (err) {
    setError(`Suggestions generation failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### API Endpoint: `/api/v1/suggestions/`

**File:** [src/api/server.py](src/api/server.py#L964-L1051)

```python
@app.post("/api/v1/suggestions/")
async def generate_suggestions(request: Dict[str, Any]):
    """Generate quality check suggestions"""
    connection_id = request.get('connection_id')
    limit = request.get('limit', 10)
    
    # Returns 8 default Soda checks (mock implementation)
    suggestions = [...]
    return {
        "connection_id": connection_id,
        "total_suggestions": len(suggestions),
        "suggestions": suggestions[:limit]
    }
```

**Request:**
```json
{
  "connection_id": "conn-uuid",
  "limit": 10
}
```

**Response:**
```json
{
  "connection_id": "conn-uuid",
  "total_suggestions": 8,
  "suggestions": [
    {
      "id": "sugg_001",
      "check_name": "missing_emails",
      "check_type": "missing_count",
      "column": "email",
      "rationale": "Email is critical - should have no missing values",
      "severity": "high",
      "suggested_check_yaml": "missing_count(email) = 0"
    },
    // ... more suggestions
  ]
}
```

### Production Endpoint: Backend Routes

**File:** [backend/src/api/routes/suggestions.py](backend/src/api/routes/suggestions.py#L1-L50)

```python
@router.post("/", response_model=SuggestionsResponse)
async def get_suggestions(
    request: SuggestionsRequest,
    db: Session = Depends(get_db)
):
    """
    Get AI-generated check suggestions for a dataset.
    Accepts either metadata_snapshot_id or connection_id (gets latest snapshot).
    """
    # 1. Get metadata snapshot
    snapshot = db.query(MetadataSnapshot).filter(
        MetadataSnapshot.connection_id == request.connection_id
    ).order_by(MetadataSnapshot.created_at.desc()).first()
    
    # 2. Extract schema and profile
    schema = snapshot.schema_json
    profile = snapshot.profile_json
    
    # 3. Run suggestion engine
    suggestions_list = suggestion_engine.generate_suggestions(schema=enriched_schema)
    
    # 4. Store suggestions in database
    for suggestion in suggestions_list:
        db_suggestion = CheckSuggestion(...)
        db.add(db_suggestion)
    db.commit()
    
    return SuggestionsResponse(...)
```

### Suggestion Engine: AI Logic for Generating Checks

**File:** [backend/src/services/suggestions.py](backend/src/services/suggestions.py#L200-L516)

**Main Class:** `SuggestionEngine()`

**Rules Applied (14 SuggestionRule subclasses):**

1. **NullCheckForPKRule** - Suggests `missing_count` for PK-like columns
2. **UniquenessCheckRule** - Suggests `duplicate_count` for high-cardinality columns
3. **MissingCheckRule** - Suggests `missing_count` for important nullable columns
4. **RangeCheckNumericRule** - Suggests range checks for numeric columns
5. **PatternCheckEmailRule** - Suggests regex validation for email columns
6. **EnumCheckRule** - Suggests `valid_values` for low-cardinality columns
7. **FreshnessCheckRule** - Suggests `freshness` for timestamp columns
8. **AnomalyDetectionRule** - Suggests anomaly detection for numeric data
9. **SchemaConsistencyRule** - Suggests `schema_type` checks
10. **DistributionAnalysisRule** - Suggests distribution checks
11. **RowCountConsistencyRule** - Suggests `row_count` checks
12. **ReferentialIntegrityPatternRule** - Suggests FK validation
13. **DataTypeValidationRule** - Suggests format/pattern validation
14. **FreshnessDateRule** - Enhanced freshness checks

**Key Method:**
```python
def generate_suggestions(self, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate suggestions from schema metadata."""
    suggestions = []
    columns = schema.get("columns", [])
    
    for column in columns:
        for rule in self.rules:
            if rule.can_suggest(column, schema):
                suggestion = rule.generate_suggestion(column, schema)
                if suggestion:
                    suggestions.append(suggestion)
    
    # Sort by confidence descending
    suggestions.sort(key=lambda s: s.get("confidence", 0), reverse=True)
    return suggestions
```

### Database Models

**Suggestions Request Model:** [backend/src/api/models.py](backend/src/api/models.py#L73-L81)
```python
class SuggestionsRequest(BaseModel):
    metadata_snapshot_id: Optional[UUID] = None
    connection_id: Optional[UUID] = None
    confidence_threshold: Optional[float] = 0.5

class SuggestionsResponse(BaseModel):
    metadata_snapshot_id: UUID
    suggestions: List[Dict[str, Any]]
    total_suggestions: int
    generated_at: Optional[datetime] = None
```

**Database Table:** [backend/schema.sql](backend/schema.sql#L44-L56)

```sql
CREATE TABLE check_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata_snapshot_id UUID NOT NULL REFERENCES metadata_snapshots(id),
    suggestion_set_id UUID,
    rule_id VARCHAR(100) NOT NULL,
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50) NOT NULL,
    rationale TEXT,
    suggested_check_yaml TEXT,
    confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_check_suggestions_snapshot ON check_suggestions(metadata_snapshot_id);
```

**ORM Model:** [backend/src/models/db.py](backend/src/models/db.py#L63-L75)

```python
class CheckSuggestion(Base):
    """Heuristic-generated check suggestion."""
    __tablename__ = "check_suggestions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metadata_snapshot_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    suggestion_set_id = Column(PG_UUID(as_uuid=True))
    rule_id = Column(String(100), nullable=False)
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50), nullable=False, index=True)
    rationale = Column(Text)
    suggested_check_yaml = Column(Text)
    confidence_score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
```

### Step 3 Frontend Display

**File:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js#L380-L425)

```javascript
{/* Step 3: AI Suggestions */}
{currentStep === 3 && suggestions && (
  <div className="step-content">
    <h2>🤖 Step 3: AI-Suggested Checks</h2>
    
    <div className="suggestions-container">
      {Array.isArray(suggestions) && suggestions.length > 0 ? (
        <div className="suggestions-list">
          <h3>🤖 AI-Recommended Checks</h3>
          <p className="subtitle">Based on your data analysis:</p>
          {suggestions.map((check, idx) => (
            <div key={idx} className="suggestion-item">
              <input type="checkbox" defaultChecked id={`ai-check-${idx}`} />
              <div className="check-details">
                <label htmlFor={`ai-check-${idx}`}>
                  <strong>{check.check_name || check.name}</strong>
                </label>
                <span className="check-type">{check.check_type}</span>
                <span className="confidence">
                  {Math.round((check.confidence || 0) * 100)}% confidence
                </span>
                {check.rationale && <p className="rationale">{check.rationale}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="note">No AI suggestions available.</p>
      )}
    </div>
  </div>
)}
```

---

## 2. STEP 3 & 4: SODA NATIVE CHECKS (Hardcoded Library & Dropdown)

### Step 3: Soda Core Checks Display

**Frontend Native Checks Library:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js#L6-L57)

```javascript
// SODA Core Native Checks - Hardcoded List
const SODA_CHECKS = {
  VOLUME: {
    category: '📊 Volume Checks',
    checks: [
      { id: 'row_count', label: 'row_count (Total rows)', ... },
      { id: 'row_count_range', label: 'row_count (Range)', ... },
    ]
  },
  COMPLETENESS: {
    category: '✅ Completeness Checks',
    checks: [
      { id: 'missing_count', label: 'missing_count (NULL/Empty)', ... },
      { id: 'missing_percent', label: 'missing_percent (% Missing)', ... },
      { id: 'valid_count', label: 'valid_count (Non-NULL)', ... },
    ]
  },
  UNIQUENESS: {
    category: '🔑 Uniqueness Checks',
    checks: [
      { id: 'duplicate_count', label: 'duplicate_count', ... },
      { id: 'invalid_percent', label: 'invalid_percent', ... },
    ]
  },
  VALIDITY: {
    category: '📝 Validity Checks',
    checks: [
      { id: 'invalid_count', label: 'invalid_count (Pattern Match)', ... },
      { id: 'invalid_count_email', label: 'invalid_count (Email Format)', ... },
      { id: 'valid_emails', label: 'valid_count (Email Format)', ... },
      { id: 'failed_rows', label: 'failed_rows (Custom Pattern)', ... },
    ]
  },
  STATISTICAL: {
    category: '📈 Statistical Checks',
    checks: [
      { id: 'min', label: 'min (Minimum Value)', ... },
      { id: 'max', label: 'max (Maximum Value)', ... },
      { id: 'avg', label: 'avg (Average/Mean)', ... },
      // ... more checks
    ]
  },
  SCHEMA: {
    category: '🏗️ Schema Checks',
    checks: [
      { id: 'schema_type', label: 'schema_type (Type Match)', ... },
      { id: 'schema_column_exists', label: 'Column Exists', ... },
    ]
  },
  DISTRIBUTION: {
    category: '📊 Distribution Checks',
    checks: [
      { id: 'distinct_count', label: 'distinct_count', ... },
      { id: 'frequency', label: 'frequency (Value Distribution)', ... },
    ]
  },
};
```

### Column-Type Filtering Logic

**Function:** `getApplicableChecks(columnType)`

**File:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js#L59-L98)

```javascript
const getApplicableChecks = (columnType) => {
  const type = (columnType || '').toUpperCase();
  
  const isNumeric = ['INT', 'BIGINT', 'FLOAT', 'DOUBLE', ...].some(t => type.includes(t));
  const isString = ['VARCHAR', 'STRING', 'TEXT', 'CHAR'].some(t => type.includes(t));
  const isDate = ['DATE', 'TIMESTAMP', 'DATETIME'].some(t => type.includes(t));
  
  // Filter checks based on type compatibility
  Object.entries(SODA_CHECKS).forEach(([key, category]) => {
    applicable[key] = {
      ...category,
      checks: category.checks.filter(check => {
        if (check.types.includes('ALL')) return true;
        if (isNumeric && check.types.includes('NUMERIC')) return true;
        // ... more filtering
        return false;
      })
    };
  });
  
  return applicable;
};
```

### Step 4: Customer/Manual Checks - Dropdown

**Frontend Custom Check Form:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js#L606-L654)

```javascript
{/* Step 4: Plan Review & Execution */}
{currentStep === 4 && checksToExecute && (
  <div className="step-content">
    <h2>📋 Step 4: Review & Execute Checks</h2>
    
    <div className="plan-review">
      <div className="add-check-section">
        <h3>Add More Checks</h3>
        
        <div className="custom-check-form">
          <h4>Create Custom Check</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newCheck = {
              name: formData.get('checkName') || `Custom - ${formData.get('checkType')}`,
              column: formData.get('column'),
              check_type: formData.get('checkType'),
            };
            setChecksToExecute([...checksToExecute, newCheck]);
            e.target.reset();
          }}>
            <div className="form-row">
              <div className="form-group">
                <label>Column *</label>
                <select name="column" required>
                  <option value="">Select column...</option>
                  {metadata && metadata.schema && metadata.schema.columns && 
                    metadata.schema.columns.map((col, idx) => (
                      <option key={idx} value={col.name}>{col.name} ({col.type})</option>
                    ))
                  }
                </select>
              </div>
              <div className="form-group">
                <label>Check Type *</label>
                <select name="checkType" required>
                  <option value="">Select check type...</option>
                  <option value="missing_count">Missing/NULL Count</option>
                  <option value="duplicate_count">Duplicate Count</option>
                  <option value="invalid_count">Invalid Count (Pattern)</option>
                  <option value="outlier_count">Outlier Count</option>
                  <option value="failed_rows">Failed Rows</option>
                  <option value="valid_count">Valid Count</option>
                  <option value="schema_type">Schema Type Check</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-add-check">+ Add Custom Check</button>
          </form>
        </div>
      </div>
    </div>
  </div>
)}
```

**Available Check Types Dropdown:**
- `missing_count` - Missing/NULL Count
- `duplicate_count` - Duplicate Count
- `invalid_count` - Invalid Count (Pattern)
- `outlier_count` - Outlier Count
- `failed_rows` - Failed Rows
- `valid_count` - Valid Count
- `schema_type` - Schema Type Check

---

## 3. API ENDPOINTS INVOLVED

### 3.1 Connection Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/v1/connections/upload` | POST | [src/api/server.py#L774](src/api/server.py#L774) | Upload CSV/Parquet file |
| `/api/v1/connections/` | POST | [src/api/server.py#L836](src/api/server.py#L836) | Create connection |
| `/api/v1/connections/` | GET | [src/api/server.py#L883](src/api/server.py#L883) | List connections |

### 3.2 Metadata Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/v1/connections/{id}/profile` | POST | [src/api/server.py#L897](src/api/server.py#L897) | Profile connection (columns info) |
| `/api/v1/metadata/profile` | POST | [src/api/server.py#L932](src/api/server.py#L932) | Profile metadata for connection |

**Response includes schema.columns:**
```json
{
  "snapshot_id": "snap-uuid",
  "connection_id": "conn-uuid",
  "row_count": 1000,
  "column_count": 5,
  "columns": [
    {"name": "id", "type": "int64", "nullable": false, "unique_count": 1000},
    {"name": "email", "type": "object", "nullable": true, "unique_count": 1000},
    ...
  ]
}
```

### 3.3 Suggestions Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/v1/suggestions/` | POST | [src/api/server.py#L964](src/api/server.py#L964) | Generate AI suggestions (Step 3) |
| `/api/v1/suggestions/{snapshot_id}` | GET | [backend/src/api/routes/suggestions.py#L113](backend/src/api/routes/suggestions.py#L113) | Get previously generated suggestions |

**Payload:**
```json
{
  "connection_id": "conn-uuid",
  "limit": 10
}
```

### 3.4 Check Plan Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/v1/check-plans/` | POST | [src/api/server.py#L1055](src/api/server.py#L1055) | Create check plan (Step 4 → Execute) |
| `/api/v1/check-plans` | POST | [src/api/server.py#L1091](src/api/server.py#L1091) | Alternative check plan creation |
| `/api/v1/check-plans/` | GET | [backend/src/api/routes/checks.py#L85](backend/src/api/routes/checks.py#L85) | List check plans |
| `/api/v1/check-plans/{plan_id}` | GET | [backend/src/api/routes/checks.py#L119](backend/src/api/routes/checks.py#L119) | Get specific check plan |

**Payload:**
```json
{
  "name": "Plan_1234567890",
  "metadata_snapshot_id": "snap-uuid",
  "connection_id": "conn-uuid",
  "checks": [
    {
      "column": "email",
      "check_type": "missing_count",
      "name": "email - missing_count"
    },
    {
      "column": null,
      "check_type": "row_count",
      "name": "row_count",
      "is_global": true
    }
  ]
}
```

### 3.5 Run Execution Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/v1/runs/` | POST | [src/api/server.py#L1119](src/api/server.py#L1119) | Execute check plan (trigger background job) |
| `/api/v1/runs/{run_id}` | GET | [src/api/server.py](src/api/server.py) | Get run status |
| `/api/v1/runs/{run_id}/metrics` | GET | [src/api/server.py#L1527](src/api/server.py#L1527) | Get run execution metrics |

**Run Response:**
```json
{
  "id": "run-uuid",
  "check_plan_id": "plan-uuid",
  "status": "running",
  "total_checks": 5,
  "passed_checks": 3,
  "failed_checks": 1,
  "created_at": "2025-04-02T10:00:00Z"
}
```

---

## 4. FRONTEND COMPONENTS

### Main Dashboard Component
**File:** [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js)

**Export:** `export default function Dashboard()`

**Key Functions:**

| Function | Purpose | Called From |
|----------|---------|-------------|
| `checkAPIHealth()` | Verify API is running | useEffect on mount |
| `handleConnectionCreated(connection)` | Handle file/connection upload | DataSourceConnectV2 callback |
| `profileMetadata(connectionId)` | Fetch schema/columns (Step 2) | Step 2 action |
| `generateSuggestions(connectionId)` | Fetch AI suggestions (Step 3) | Step 2 → Step 3 transition |
| `preparePlan(checks)` | Move to Step 4 with checks | Step 3 action |
| `createCheckPlan(checks)` | Create plan and execute (Step 4) | Step 4 action |
| `executeCheckPlan(planId)` | Trigger run execution | After plan creation |

### Sub-Components

| Component | File | Purpose |
|-----------|------|---------|
| `DataSourceConnectV2` | `services/frontend/src/components/DataSourceConnectV2.js` | Step 1: File upload |
| `ResultsVisualization` | [services/frontend/src/components/ResultsVisualization.js](services/frontend/src/components/ResultsVisualization.js) | Step 5: Results display |

### Frontend API Client

**File:** [services/frontend/src/api/client.js](services/frontend/src/api/client.js#L174-L217)

```javascript
class APIClient {
  async createCheckPlan(planData) {
    return this.request('/check-plans/', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async executeRun(checkPlanId) {
    return this.request('/runs/', {
      method: 'POST',
      body: JSON.stringify({
        check_plan_id: checkPlanId,
      }),
    });
  }
}
```

---

## 5. BACKEND MODELS & DATABASE SCHEMA

### Database Tables

#### connections
**File:** [backend/schema.sql#L7-L18](backend/schema.sql#L7-L18)
```sql
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('postgres', 'bigquery', 'snowflake', 'csv', 'parquet')),
    remote_url TEXT,
    encrypted_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT connection_name_unique UNIQUE (name)
);
```

#### metadata_snapshots
**File:** [backend/schema.sql#L20-L35](backend/schema.sql#L20-L35)
```sql
CREATE TABLE metadata_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connections(id),
    dataset_identifier VARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    schema_json JSONB NOT NULL,           -- Full schema definition
    profile_json JSONB NOT NULL,          -- Column profiling results
    row_count BIGINT,
    profile_duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Schema JSON structure:**
```json
{
  "columns": [
    {
      "name": "id",
      "type": "int64",
      "nullable": false,
      "unique_count": 1000,
      "is_pk": true
    },
    {
      "name": "email",
      "type": "object",
      "nullable": true,
      "unique_count": 1000
    }
  ]
}
```

#### check_suggestions
**File:** [backend/schema.sql#L44-L56](backend/schema.sql#L44-L56)
```sql
CREATE TABLE check_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata_snapshot_id UUID NOT NULL REFERENCES metadata_snapshots(id),
    suggestion_set_id UUID,
    rule_id VARCHAR(100) NOT NULL,        -- e.g., 'null_check_for_pk_like'
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50) NOT NULL,      -- Completeness, Uniqueness, Validity
    rationale TEXT,
    suggested_check_yaml TEXT,            -- Actual Soda YAML check
    confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### check_plans
**File:** [backend/schema.sql#L37-L52](backend/schema.sql#L37-L52)
```sql
CREATE TABLE check_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL REFERENCES connections(id),
    dataset_identifier VARCHAR(255) NOT NULL,
    description TEXT,
    checks_yaml TEXT NOT NULL,            -- Generated/selected SodaCL checks
    custom_checks_yaml TEXT,              -- User-written custom checks
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT plan_name_dataset_unique UNIQUE (connection_id, dataset_identifier, name)
);
```

#### runs
**File:** [backend/schema.sql#L58-L71](backend/schema.sql#L58-L71)
```sql
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_plan_id UUID NOT NULL REFERENCES check_plans(id),
    connection_id UUID NOT NULL REFERENCES connections(id),
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration_ms INT,
    pass_count INT DEFAULT 0,
    warn_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_message TEXT,
    environment VARCHAR(50) DEFAULT 'dev',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### check_results
**File:** [backend/schema.sql#L73-L92](backend/schema.sql#L73-L92)
```sql
CREATE TABLE check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id),
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50),
    status VARCHAR(50) NOT NULL 
        CHECK (status IN ('passed', 'warned', 'failed', 'error')),
    metric_name VARCHAR(255),
    metric_value FLOAT,
    metric_threshold FLOAT,
    query_used TEXT,                      -- Actual SQL executed
    execution_time_ms INT,
    sample_failing_rows JSONB,            -- Array of failing rows
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ORM Models

**File:** [backend/src/models/db.py](backend/src/models/db.py)

```python
# Connection Model
class Connection(Base):
    __tablename__ = "connections"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    remote_url = Column(Text)
    encrypted_secret = Column(Text)

# Metadata Snapshot Model
class MetadataSnapshot(Base):
    __tablename__ = "metadata_snapshots"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    dataset_identifier = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    schema_json = Column(JSONB, nullable=False)
    profile_json = Column(JSONB, nullable=False)

# Check Plan Model
class CheckPlan(Base):
    __tablename__ = "check_plans"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    metadata_snapshot_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    dataset_identifier = Column(String(255), nullable=False)
    description = Column(Text)
    checks_yaml = Column(Text, nullable=False)
    custom_checks_yaml = Column(Text)
    enabled = Column(Boolean, default=True)

# Check Suggestion Model
class CheckSuggestion(Base):
    __tablename__ = "check_suggestions"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metadata_snapshot_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    suggestion_set_id = Column(PG_UUID(as_uuid=True))
    rule_id = Column(String(100), nullable=False)
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)

# Run Model
class Run(Base):
    __tablename__ = "runs"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_plan_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    connection_id = Column(PG_UUID(as_uuid=True), nullable=False)
    status = Column(String(50), default='pending', index=True)
    pass_count = Column(Integer, default=0)
    warn_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)

# Check Result Model
class CheckResult(Base):
    __tablename__ = "check_results"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    check_name = Column(String(255), nullable=False)
    check_type = Column(String(50))
    status = Column(String(50), nullable=False, index=True)
    sample_failing_rows = Column(JSONB)
```

### Pydantic Models

**File:** [backend/src/api/models.py](backend/src/api/models.py#L1-100)

```python
# Request/Response for suggestions
class SuggestionsRequest(BaseModel):
    metadata_snapshot_id: Optional[UUID] = None
    connection_id: Optional[UUID] = None
    confidence_threshold: Optional[float] = 0.5

class SuggestionsResponse(BaseModel):
    metadata_snapshot_id: UUID
    suggestions: List[Dict[str, Any]]
    total_suggestions: int
    generated_at: Optional[datetime] = None

# Request/Response for check plans
class CheckPlanCreate(BaseModel):
    name: str
    metadata_snapshot_id: Optional[UUID] = None
    connection_id: Optional[UUID] = None
    description: Optional[str] = None
    checks: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = True

class CheckPlanResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    metadata_snapshot_id: UUID
    check_count: int
    is_active: bool
    created_at: datetime
    created_by: Optional[UUID] = None
```

---

## 6. COMPLETE DATA FLOW: Click "Generate" → Display

### Step 1: User Action - Click "Generate" (Step 2→3 Transition)

```
Frontend: generateSuggestions(connectionId)
  ↓
  POST /api/v1/suggestions/
  Payload: { connection_id, limit: 10 }
```

### Step 2: Backend Processing

```
Backend: @router.post("/suggestions/")
  ↓
  1. Query: SELECT * FROM metadata_snapshots 
     WHERE connection_id = ? ORDER BY created_at DESC LIMIT 1
  ↓
  2. Extract schema_json & profile_json from snapshot
  ↓
  3. Call SuggestionEngine.generate_suggestions(schema)
     - Iterate through 14 suggestion rules
     - Each rule evaluates column: can_suggest() → generate_suggestion()
  ↓
  4. Store suggestions in database:
     INSERT INTO check_suggestions (metadata_snapshot_id, rule_id, check_name, ...)
     VALUES (?, ?, ?, ...)
  ↓
  5. Return SuggestionsResponse with suggestions list
```

### Step 3: Frontend Display (Step 3)

```
Frontend receives suggestions array
  ↓
  Display section:
  - "🤖 AI-Recommended Checks" (from suggestions table)
  - "📋 Soda Native Checks" (from SODA_CHECKS hardcoded object)
  - "By Column" (applies getApplicableChecks filter)
  ↓
  User selects checks from all 3 sources
  ↓
  Collect selected checks into array
```

### Step 4: Plan Creation & Execution

```
User clicks "Create & Execute Plan"
  ↓
  preparePlan(checksArray) → setCurrentStep(4)
  ↓
  Create & Execute (Step 4):
  
  POST /api/v1/check-plans/
  Payload: {
    name, connection_id, metadata_snapshot_id,
    checks: [
      { column, check_type, name }
    ]
  }
  ↓
  Backend creates:
  - INSERT INTO check_plans (name, checks_yaml, ...) 
  - Returns check_plan_id
  ↓
  Frontend calls: executeCheckPlan(plan_id)
  ↓
  POST /api/v1/runs/
  Payload: { check_plan_id }
  ↓
  Backend:
  - INSERT INTO runs (check_plan_id, status='running')
  - Background task: execute_checks_background(run_id, check_plan_id)
  ↓
  Returns: { id: run_id, status: 'running' }
```

### Step 5: Results Display

```
Frontend polls: GET /api/v1/runs/{run_id}/metrics
  ↓
  Backend queries:
  - SELECT * FROM runs WHERE id = ?
  - SELECT * FROM check_results WHERE run_id = ?
  ↓
  Returns: { summary, by_check_type, results }
  ↓
  Frontend displays in <ResultsVisualization />
```

---

## 7. COMPLETE MAPPING SUMMARY

### Critical Paths

| User Action | Frontend Component | API Endpoint | Backend Route | Database Tables |
|-------------|-------------------|-------------|----------------|-----------------|
| Click "Generate" (Step 2→3) | `Dashboard.generateSuggestions()` | `POST /api/v1/suggestions/` | `backend/src/api/routes/suggestions.py:get_suggestions()` | `metadata_snapshots`, `check_suggestions` |
| Select Checks (Step 3) | `Dashboard` (SODA_CHECKS + suggestions) | N/A | N/A | `check_suggestions` (read only) |
| Create Plan (Step 4) | `Dashboard.createCheckPlan()` | `POST /api/v1/check-plans/` | `backend/src/api/routes/checks.py:create_check_plan()` | `check_plans` |
| Execute Plan | `Dashboard.executeCheckPlan()` | `POST /api/v1/runs/` | `src/api/server.py:execute_run()` | `runs`, `check_results` |
| View Results (Step 5) | `ResultsVisualization` | `GET /api/v1/runs/{id}/metrics` | `src/api/server.py:get_run_metrics()` | `runs`, `check_results` |

### Soda Check Categories (Step 3)

1. **Volume Checks** - `row_count`, `row_count_range`
2. **Completeness Checks** - `missing_count`, `missing_percent`, `valid_count`
3. **Uniqueness Checks** - `duplicate_count`, `invalid_percent`
4. **Validity Checks** - `invalid_count` (pattern/email formats)
5. **Statistical Checks** - `min`, `max`, `avg`, `stddev`, `values_between`
6. **Schema Checks** - `schema_type`, column existence
7. **Distribution Checks** - `distinct_count`, `frequency`

### Step 4 Custom Check Types (Dropdown)

- `missing_count` - Find NULLs/empty values
- `duplicate_count` - Find duplicates
- `invalid_count` - Pattern matching
- `outlier_count` - Statistical outliers
- `failed_rows` - Custom rule failures
- `valid_count` - Non-NULL count
- `schema_type` - Type consistency

---

## Key Files Quick Reference

| Task | File |
|------|------|
| Frontend Dashboard | [services/frontend/src/components/Dashboard.js](services/frontend/src/components/Dashboard.js) |
| Suggestion Engine | [backend/src/services/suggestions.py](backend/src/services/suggestions.py) |
| Suggestion Routes | [backend/src/api/routes/suggestions.py](backend/src/api/routes/suggestions.py) |
| Check Plans Routes | [backend/src/api/routes/checks.py](backend/src/api/routes/checks.py) |
| API Server (Mock) | [src/api/server.py](src/api/server.py) |
| Database Schema | [backend/schema.sql](backend/schema.sql) |
| ORM Models | [backend/src/models/db.py](backend/src/models/db.py) |
| API Models | [backend/src/api/models.py](backend/src/api/models.py) |
| Results Visualization | [services/frontend/src/components/ResultsVisualization.js](services/frontend/src/components/ResultsVisualization.js) |
