## Checks & Suggestions (M3)

**Phase:** M3 (5 days) | **Status:** COMPLETE | **Commit:** [details below]

### Overview

M3 implements the **Checks & Suggestions Engine** for intelligent check recommendations:

- **POST /checks** - Create check plan from suggestions or custom YAML
- **GET /checks** - List check plans with filtering
- **GET /checks/{id}** - Get check plan details
- **PUT /checks/{id}** - Update check plan
- **DELETE /checks/{id}** - Delete check plan
- **GET /checks/{id}/suggestions** - Generate intelligent suggestions

### Architecture

#### 12-Rule Suggestion Engine

M3 implements a comprehensive suggestion engine with 12 data quality rules:

**Rule Categories:**
1. **Volume Checks (2 rules)**
2. **Completeness Checks (3 rules)**
3. **Uniqueness Checks (2 rules)**
4. **Validity Checks (3 rules)**
5. **Freshness Checks (1 rule)**
6. **Statistical Analysis (1 rule)**

#### Rule Catalog

##### Category: VOLUME (Row Count, Growth Rate)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `row_count_min` | Row Count Minimum | Volume | All | 0.95 | Ensure dataset has minimum expected rows |
| `row_growth_rate` | Row Count Growth Rate | Volume | All | 0.80 | Track row count changes between runs |

**Example Suggestion:**
```json
{
  "rule_id": "row_count_min",
  "check_name": "Table has minimum rows",
  "category": "volume",
  "confidence": 0.95,
  "severity": "critical",
  "rationale": "Dataset has 5000 rows. Monitor for unexpected volume changes.",
  "suggested_yaml": "checks:\n  - row_count > 4500"
}
```

##### Category: COMPLETENESS (Null %, Missing Patterns)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `null_check_for_pk_like` | Null Check for PK | Completeness | All | 0.95 | Ensure primary key columns have no nulls |
| `null_percent_check` | Null Percentage Validation | Completeness | All | 0.85 | Ensure null percentage below threshold |
| `missing_pattern` | Missing Value Pattern | Completeness | All | 0.70 | Detect unusual missing patterns |

**Example Suggestions:**
```json
[
  {
    "rule_id": "null_check_for_pk_like",
    "check_name": "customer_id is not null",
    "category": "completeness",
    "column": "customer_id",
    "confidence": 0.95,
    "severity": "critical",
    "rationale": "Column appears to be a key/ID; expect no NULLs",
    "suggested_yaml": "checks:\n  - missing_count(customer_id) == 0"
  },
  {
    "rule_id": "null_percent_check",
    "check_name": "email completeness",
    "category": "completeness",
    "column": "email",
    "confidence": 0.80,
    "severity": "high",
    "rationale": "Column 'email' has 150 nulls (5.0%). Consider monitoring completeness.",
    "suggested_yaml": "checks:\n  - missing_percent(email) < 10"
  }
]
```

##### Category: UNIQUENESS (Duplicates, Primary Key Violations)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `duplicate_check` | Duplicate Row Detection | Uniqueness | All | 0.90 | Detect duplicate rows |
| `primary_key_violation` | Primary Key Uniqueness | Uniqueness | Numeric, String | 0.95 | Ensure primary key Is unique |

**Example Suggestions:**
```json
[
  {
    "rule_id": "primary_key_violation",
    "check_name": "transaction_id is unique",
    "category": "uniqueness",
    "column": "transaction_id",
    "confidence": 0.95,
    "severity": "critical",
    "rationale": "Column appears to be a key/ID with 99.8% unique values",
    "suggested_yaml": "checks:\n  - duplicate_count(transaction_id) == 0"
  }
]
```

##### Category: VALIDITY (Format, Range, Regex Patterns)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `format_validation` | Format/Pattern Validation | Validity | String | 0.75 | Validate data matches expected format |
| `range_validation` | Value Range Validation | Validity | Numeric | 0.90 | Ensure numeric values in acceptable range |
| `regex_pattern` | Regex Pattern Matching | Validity | String | 0.80 | Validate strings match regex pattern |

**Example Suggestions:**
```json
[
  {
    "rule_id": "regex_pattern",
    "check_name": "email valid format",
    "category": "validity",
    "column": "email",
    "confidence": 0.80,
    "severity": "high",
    "rationale": "Validate email follows expected format",
    "suggested_yaml": "checks:\n  - valid_regex(email)\n      valid_pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$'"
  },
  {
    "rule_id": "range_validation",
    "check_name": "age within valid range",
    "category": "validity",
    "column": "age",
    "confidence": 0.90,
    "severity": "high",
    "rationale": "Numeric column should be between 0 and 150",
    "suggested_yaml": "checks:\n  - age between 0 and 150"
  }
]
```

##### Category: FRESHNESS (Last Modified, Staleness)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `freshness_check` | Data Freshness Validation | Freshness | Timestamp | 0.85 | Ensure data updated within time window |

**Example Suggestion:**
```json
{
  "rule_id": "freshness_check",
  "check_name": "updated_at is recent",
  "category": "freshness",
  "column": "updated_at",
  "confidence": 0.85,
  "severity": "high",
  "rationale": "Ensure data is updated within expected time window",
  "suggested_yaml": "checks:\n  - max(updated_at) > soda.scan.build_time - 24h"
}
```

##### Category: STATISTICAL (Mean, Median, Outliers)

| Rule ID | Name | Category | Applicable Types | Confidence | Description |
|---------|------|----------|-----------------|------------|-------------|
| `outlier_detection` | Statistical Outlier Detection | Statistical | Numeric | 0.70 | Detect outliers using mean/stddev |

**Example Suggestion:**
```json
{
  "rule_id": "outlier_detection",
  "check_name": "amount statistical check",
  "category": "statistical",
  "column": "amount",
  "confidence": 0.70,
  "severity": "medium",
  "rationale": "Detect statistical outliers in amount column",
  "suggested_yaml": "checks:\n  - stddev(amount) < 5000  # Adjust threshold based on data"
}
```

### API Reference

#### 1. Create Check Plan

**Endpoint:** `POST /api/v1/checks`

**Purpose:** Create a check plan (collection of checks for a dataset)

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/checks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer_daily_checks",
    "connection_id": "550e8400-e29b-41d4-a716-446655440000",
    "dataset_identifier": "public.customers",
    "description": "Daily data quality checks",
    "checks_yaml": "checks:\n  - missing_count(id) == 0",
    "custom_checks_yaml": "checks:\n  - row_count > 1000",
    "enabled": true
  }'
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique check plan name |
| `connection_id` | UUID | Conditional | Connection ID (or use metadata_snapshot_id) |
| `metadata_snapshot_id` | UUID | Conditional | Metadata snapshot ID (or use connection_id) |
| `dataset_identifier` | string | No | Dataset/table identifier |
| `description` | string | No | Human-readable description |
| `checks_yaml` | string | No | Soda Core YAML for suggested checks |
| `custom_checks_yaml` | string | No | Custom YAML for additional checks |
| `enabled` | boolean | No | Enable plan execution (default: true) |

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "customer_daily_checks",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata_snapshot_id": "550e8400-e29b-41d4-a716-446655440001",
  "dataset_identifier": "public.customers",
  "description": "Daily data quality checks",
  "checks_yaml": "checks:\n  - missing_count(id) == 0",
  "custom_checks_yaml": "checks:\n  - row_count > 1000",
  "enabled": true,
  "created_at": "2026-04-11T10:30:00Z",
  "updated_at": "2026-04-11T10:30:00Z"
}
```

**Error Responses:**
| Status | Code | Meaning |
|---|---|---|
| 400 | `MISSING_METADATA` | No metadata snapshot found for connection |
| 404 | `SNAPSHOT_NOT_FOUND` | Referenced metadata snapshot doesn't exist |
| 409 | `DUPLICATE_NAME` | Check plan name already exists for connection |

#### 2. Generate Check Suggestions

**Endpoint:** `GET /api/v1/checks/{check_plan_id}/suggestions`

**Purpose:** Automatically generate check recommendations based on dataset profile

**Response:**
```json
{
  "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
  "suggestions_count": 8,
  "suggestions_by_category": {
    "completeness": 3,
    "uniqueness": 2,
    "validity": 2,
    "statistical": 1
  },
  "suggestions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "rule_id": "null_check_for_pk_like",
      "check_name": "id is not null",
      "category": "completeness",
      "column": "id",
      "confidence": 0.95,
      "severity": "critical",
      "rationale": "Column appears to be a key/ID; expect no NULLs",
      "suggested_yaml": "checks:\n  - missing_count(id) == 0"
    }
  ]
}
```

**Confidence Scoring:**
- **0.95** (Critical) - High confidence, must review
- **0.85-0.90** (High) - Should review
- **0.70-0.80** (Medium) - Consider including
- **< 0.70** (Low) - Optional/informational

#### 3. List Check Plans

**Endpoint:** `GET /api/v1/checks?connection_id=...&enabled_only=true`

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `connection_id` | UUID | (none) | Filter by connection |
| `enabled_only` | boolean | false | Show only enabled plans |
| `skip` | integer | 0 | Pagination offset |
| `limit` | integer | 50 | Result limit (max 100) |

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "customer_daily_checks",
    "connection_id": "550e8400-e29b-41d4-a716-446655440000",
    "metadata_snapshot_id": "550e8400-e29b-41d4-a716-446655440001",
    "dataset_identifier": "public.customers",
    "description": "Daily data quality checks",
    "checks_yaml": "checks:\n  - missing_count(id) == 0",
    "enabled": true,
    "created_at": "2026-04-11T10:30:00Z",
    "updated_at": "2026-04-11T10:30:00Z"
  }
]
```

#### 4. Get Check Plan Details

**Endpoint:** `GET /api/v1/checks/{check_plan_id}`

**Response:** Single check plan object (same as create response)

#### 5. Update Check Plan

**Endpoint:** `PUT /api/v1/checks/{check_plan_id}`

**Request:** Same fields as POST (optional, partial updates supported)

**Response:** Updated check plan object

#### 6. Delete Check Plan

**Endpoint:** `DELETE /api/v1/checks/{check_plan_id}`

**Response:**
```json
{
  "success": true,
  "message": "Check plan deleted successfully",
  "check_plan_id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-04-11T10:45:00Z"
}
```

### Soda Core YAML Integration

All suggestions generate valid Soda YAML compatible with Soda Core 3.4.3:

**Example Single Check:**
```yaml
checks:
  - name: 'customer_id is not null'
    type: missing_count
    column: customer_id
    fail: when > 0
```

**Example Multiple Checks:**
```yaml
checks:
  - missing_count(customer_id) == 0
  - duplicate_count(customer_id) == 0
  - missing_percent(email) < 5
  - age between 1 and 120
  - valid_regex(email):
      valid_pattern: '^[\w\.-]+@[\w\.-]+\.\w+$'
```

### Confidence Scoring Algorithm

Confidence is calculated based on:

1. **Base Category Weight:**
   - Completeness: 0.90
   - Uniqueness: 0.85
   - Validity: 0.75
   - Volume: 0.95
   - Freshness: 0.80
   - Statistical: 0.70

2. **Adjustments:**
   - Null percentage (completeness): +30% boost if data shows nulls
   - Data variance (statistical): confidence = base × (stddev / 100)
   - Column type match: ±10% based on data type applicability

3. **Severity Classification:**
   - Critical: confidence ≥ 0.90
   - High: 0.75-0.90
   - Medium: 0.60-0.75
   - Low: < 0.60

### Implementation Details

#### SuggestionEngine Class
```python
class SuggestionEngine:
    def __init__(self):
        # Initialize all 12 rules
        self.rules = [
            NullCheckForPKRule(),
            UniquenessCheckRule(),
            MissingCheckRule(),
            RangeCheckNumericRule(),
            PatternCheckEmailRule(),
            EnumCheckRule(),
            FreshnessDateRule(),
            AnomalyDetectionRule(),
            SchemaConsistencyRule(),
            DistributionAnalysisRule(),
            RowCountConsistencyRule(),
            ReferentialIntegrityPatternRule(),
        ]
    
    def generate_suggestions(self, schema: Dict) -> List[Dict]:
        """Generate suggestions from metadata"""
        suggestions = []
        for column in schema["columns"]:
            for rule in self.rules:
                if rule.can_suggest(column, schema):
                    suggestion = rule.generate_suggestion(column, schema)
                    if suggestion:
                        suggestion["id"] = unique_id()
                        suggestions.append(suggestion)
        return sorted(suggestions, key=lambda x: x["confidence"], reverse=True)
```

### Workflow Example

**Step 1: Upload CSV**
```bash
curl -X POST http://localhost:8000/api/v1/connections/upload \
  -F "name=customer-data" \
  -F "type=csv" \
  -F "file=@customers.csv"
```

**Step 2: Profile Dataset**
```bash
curl -X POST http://localhost:8000/api/v1/metadata/profile \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "550e8400-e29b-41d4-a716-446655440000",
    "tables": ["data"]
  }'
```

**Step 3: Create Check Plan**
```bash
curl -X POST http://localhost:8000/api/v1/checks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-checks",
    "connection_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Step 4: Generate Suggestions**
```bash
curl -X GET http://localhost:8000/api/v1/checks/550e8400-e29b-41d4-a716-446655440002/suggestions
```

**Step 5: Accept and Customize**
- Review suggestions (sorted by confidence)
- Modify YAML as needed
- Update check plan with customizations

### Acceptance Criteria (M3)

✅ 12-rule suggestion engine implemented
✅ Check plan CRUD (POST/GET/PUT/DELETE)
✅ Suggestion generation with confidence scoring
✅ Soda YAML output for all rules
✅ All rules with categories and descriptions
✅ Confidence scoring algorithm
✅ Severity assessment
✅ All endpoints documented with examples
✅ Database cascading (delete suggests too)
✅ All code compiles without errors

### Related Documentation

- [CONNECTIONS.md](CONNECTIONS.md) - Connection management
- [API.md](API.md) - Full API specification
- [EXECUTION.md](../EXECUTION.md) - Check execution (M4)
- [TESTING.md](../TESTING.md) - Test suite (M6)

### Next Phase (M4)

M4 extends M3 with:
- Check execution engine
- Background job execution (APScheduler)
- WebSocket real-time updates
- Result aggregation and storage
- POST /runs (start execution)
- GET /runs/{id}/status (polling)

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-11  
**Rules Implemented:** 12  
**Categories:** 6
