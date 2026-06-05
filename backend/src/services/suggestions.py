"""
Data Quality Checks Suggestions Engine (M3)

Implements intelligent check suggestions based on dataset profiling:
- 12-rule suggestion engine with confidence scoring
- Rule categorization (Volume, Completeness, Uniqueness, Validity, Freshness, Statistical)
- Soda YAML generation
- Severity assessment
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
import logging

logger = logging.getLogger(__name__)

NUMERIC_TYPE_TOKENS = {"INT", "INTEGER", "BIGINT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "NUMBER", "INT64", "FLOAT64"}
STRING_TYPE_TOKENS = {"VARCHAR", "TEXT", "STRING", "OBJECT", "CHAR"}
DATE_TYPE_TOKENS = {"DATE", "TIMESTAMP", "DATETIME"}


def _type_contains(column_type: Any, candidates: set[str]) -> bool:
    normalized = str(column_type or "").upper()
    return any(token in normalized for token in candidates)


def _render_checks_yaml(*lines: str) -> str:
    return "checks:\n" + "\n".join(f"  {line}" for line in lines if line)


class RuleCategory(str, Enum):
    """Data quality rule categories for M3."""
    VOLUME = "volume"
    COMPLETENESS = "completeness"
    UNIQUENESS = "uniqueness"
    VALIDITY = "validity"
    FRESHNESS = "freshness"
    STATISTICAL = "statistical"


class SuggestionRule:
    """Base class for a suggestion rule."""
    def __init__(self, rule_id: str, check_type: str, soda_check_type: str = None):
        self.rule_id = rule_id
        self.check_type = check_type
        self.soda_check_type = soda_check_type or check_type
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        """Check if this rule applies to the column."""
        raise NotImplementedError
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate a check suggestion if applicable."""
        raise NotImplementedError


# M3: 12-Rule Catalog Implementation

class NullCheckForPKRule(SuggestionRule):
    """Rule 1: Null check for key-like columns (Completeness)."""
    def __init__(self):
        super().__init__("null_check_for_pk_like", "Completeness", "missing_count")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        is_pk = column.get("is_pk", False)
        distinct_count = column.get("distinct_count", 0)
        row_count = column.get("row_count", 1)
        
        # PK or highly unique
        if is_pk or distinct_count > 0.99 * row_count:
            return not column.get("nullable", True)
        return False
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} is not null",
            "check_type": self.check_type,
            "category": RuleCategory.COMPLETENESS.value,
            "confidence": 0.95,
            "severity": "critical",
            "rationale": "Column appears to be a key/ID; expect no NULLs",
            "confidence": 0.95,
            "suggested_yaml": _render_checks_yaml(f"- missing_count({col_name}) = 0")
        }

class UniquenessCheckRule(SuggestionRule):
    """Suggest uniqueness check for high-cardinality columns."""
    def __init__(self):
        super().__init__("uniqueness_check_high_cardinality", "Uniqueness", "duplicate_count")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        distinct_count = column.get("distinct_count", 0)
        row_count = column.get("row_count", 1)
        return distinct_count > 0.95 * row_count and row_count > 100
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} is unique",
            "check_type": self.check_type,
            "rationale": "Very high cardinality suggests uniqueness constraint",
            "confidence": 0.85,
            "suggested_yaml": _render_checks_yaml(f"- duplicate_count({col_name}) = 0")
        }

class MissingCheckRule(SuggestionRule):
    """Suggest missing value check for nullable important columns."""
    def __init__(self):
        super().__init__("missing_check_nullable", "Completeness", "missing_count")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        nullable = column.get("nullable", True)
        row_count = column.get("row_count", 1)
        
        # Important nullable columns (email, phone, etc.)
        important_keywords = ["email", "phone", "contact", "address"]
        return nullable and any(kw in col_name for kw in important_keywords) and row_count > 100
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        # Assume 95% required
        fail_threshold = int(0.05 * column.get("row_count", 1000))
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} completeness",
            "check_type": self.check_type,
            "rationale": f"'{col_name}' is an important field; expect high completion rate",
            "confidence": 0.80,
            "suggested_yaml": _render_checks_yaml(f"- missing_count({col_name}) < {max(fail_threshold, 1)}")
        }

class RangeCheckNumericRule(SuggestionRule):
    """Suggest range check for numeric columns."""
    def __init__(self):
        super().__init__("range_check_numeric", "Validity", "invalid_count")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        return _type_contains(column.get("type", ""), NUMERIC_TYPE_TOKENS)
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        col_min = column.get("min")
        col_max = column.get("max")
        if col_min is None:
            col_min = 0
        if col_max is None:
            col_max = 1000000
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} within valid range",
            "check_type": self.check_type,
            "rationale": f"Numeric column should be between {col_min} and {col_max}",
            "confidence": 0.75,
            "suggested_yaml": _render_checks_yaml(
                f"- invalid_count({col_name}) = 0:",
                f"    valid min: {col_min}",
                f"    valid max: {col_max}",
            )
        }

class PatternCheckEmailRule(SuggestionRule):
    """Suggest email format validation."""
    def __init__(self):
        super().__init__("pattern_check_email", "Validity", "valid_format")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        return "email" in col_name and _type_contains(column.get("type", ""), STRING_TYPE_TOKENS)
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} email format",
            "check_type": self.check_type,
            "rationale": "Column contains email addresses; validate format",
            "confidence": 0.80,
            "suggested_yaml": _render_checks_yaml(
                f"- invalid_count({col_name}) = 0:",
                "    valid format: email",
            )
        }

class EnumCheckRule(SuggestionRule):
    """Suggest enum check for low-cardinality columns."""
    def __init__(self):
        super().__init__("enum_check_status", "Validity", "valid_values")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        distinct_count = column.get("distinct_count", 0)
        
        # Low cardinality + status-like name
        status_keywords = ["status", "state", "type", "kind", "level"]
        return distinct_count < 10 and any(kw in col_name for kw in status_keywords)
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} has valid values",
            "check_type": self.check_type,
            "rationale": f"'{col_name}' has limited valid values; suggest an enum check",
            "confidence": 0.80,
            "suggested_yaml": f"checks:\n  - name: '{col_name} valid values'\n    filters:\n      - $table_ident = public.table_name\n    checks:\n      - name: valid {col_name}\n        type: valid_values\n        column: {col_name}\n        valid_values: ['value1', 'value2']  # Fill in actual values"
        }

class FreshnessCheckRule(SuggestionRule):
    """Suggest freshness check for timestamp columns."""
    def __init__(self):
        super().__init__("date_freshness_check", "Freshness", "freshness")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        col_type = column.get("type", "").upper()
        
        freshness_keywords = ["created", "updated", "loaded", "ingested", "timestamp"]
        return any(kw in col_name for kw in freshness_keywords) and "TIMESTAMP" in col_type
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} is recent",
            "check_type": self.check_type,
            "rationale": f"'{col_name}' should contain recent data; verify freshness",
            "confidence": 0.75,
            "suggested_yaml": f"checks:\n  - name: '{col_name} is recent'\n    type: invalid_count\n    column: {col_name}\n    valid_min_length: 1\n    fail: when > row_count * 0.1"
        }

class DuplicateCheckCompositeRule(SuggestionRule):
    """Suggest composite key check (simplified)."""
    def __init__(self):
        super().__init__("composite_key_check", "Uniqueness", "duplicate_count")
    
    def can_suggest(self, columns: List[Dict[str, Any]]) -> bool:
        # Simplified: if two columns with high combined distinct count
        if len(columns) < 2:
            return False
        return True
    
    def generate_suggestion(self, columns: List[Dict[str, Any]]) -> Dict[str, Any]:
        col_names = [c["name"] for c in columns[:2]]
        return {
            "rule_id": self.rule_id,
            "check_name": f"Composite key {col_names[0]}, {col_names[1]}",
            "check_type": self.check_type,
            "rationale": "These columns form a natural composite key",
            "confidence": 0.70,
            "suggested_yaml": f"checks:\n  - name: 'composite key unique'\n    # Requires Soda composite check support"
        }

class AnomalyDetectionRule(SuggestionRule):
    """Suggest anomaly detection for numeric columns."""
    def __init__(self):
        super().__init__("anomaly_detection_numeric", "Anomaly Detection", "anomaly_detection")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_type = column.get("type", "").upper()
        # Numeric columns with sufficient variance
        numeric_types = ["INT", "BIGINT", "FLOAT", "DECIMAL", "NUMERIC", "DOUBLE"]
        if col_type not in numeric_types:
            return False
        
        # Check if column has variance (not constant)
        min_val = column.get("min", 0)
        max_val = column.get("max", 1)
        return min_val != max_val
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} outlier detection",
            "check_type": self.check_type,
            "rationale": f"Detect unusual values and statistical outliers in {col_name}",
            "confidence": 0.80,
            "suggested_yaml": f"""checks:
  - name: '{col_name} statistical outliers'
    type: anomaly_detection
    column: {col_name}
    method: zscore  # or 'iqr' for robust detection
    threshold: 3.0
    fail: when found > 0"""
        }

class SchemaConsistencyRule(SuggestionRule):
    """Suggest schema/type consistency checks."""
    def __init__(self):
        super().__init__("schema_type_consistency", "Schema Validity", "schema_type")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        # All columns benefit from type consistency checks
        return True
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        col_type = column.get("type", "VARCHAR").upper()
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} type consistency",
            "check_type": self.check_type,
            "rationale": f"Ensure {col_name} maintains correct data type ({col_type})",
            "confidence": 0.90,
            "suggested_yaml": f"""checks:
  - name: '{col_name} type is {col_type}'
    type: schema_type
    column: {col_name}
    schema_type: {col_type}
    fail: when != expected"""
        }

class DistributionAnalysisRule(SuggestionRule):
    """Suggest distribution checks for data consistency."""
    def __init__(self):
        super().__init__("distribution_consistency", "Distribution Analysis", "valid_values")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        distinct_count = column.get("distinct_count", 0)
        row_count = column.get("row_count", 1)
        
        # Low cardinality columns (categories, statuses)
        status_keywords = ["status", "state", "category", "type", "level", "priority", "region"]
        is_categorical = any(kw in col_name for kw in status_keywords)
        is_low_cardinality = distinct_count < 20 and row_count > 100
        
        return is_categorical or is_low_cardinality
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} distribution consistency",
            "check_type": self.check_type,
            "rationale": f"Monitor {col_name} for unexpected distribution changes",
            "confidence": 0.75,
            "suggested_yaml": f"""checks:
  - name: '{col_name} expected values only'
    type: valid_values
    column: {col_name}
    valid_values: ['value1', 'value2', 'value3']  # Update with actual values
    fail: when not in valid set"""
        }

class RowCountConsistencyRule(SuggestionRule):
    """Suggest table size/growth checks."""
    def __init__(self):
        super().__init__("row_count_consistency", "Table Health", "row_count")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        # Apply to first column as proxy for table
        return column.get("name").lower() in ["id", "pk", "key", "record_id"]
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        table_name = schema.get("table_name", "table") if schema else "table"
        row_count = column.get("row_count", 1000)
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{table_name} row count health",
            "check_type": self.check_type,
            "rationale": f"Monitor {table_name} for unexpected growth or shrinkage",
            "confidence": 0.70,
            "suggested_yaml": f"""checks:
  - name: '{table_name} row count reasonable'
    type: row_count
    fail:
      when < {int(row_count * 0.8)}    # Alert if 20% drop
      when > {int(row_count * 1.5)}    # Alert if 50% spike (might be duplicates)"""
        }

class ReferentialIntegrityPatternRule(SuggestionRule):
    """Suggest referential integrity checks (pattern-based)."""
    def __init__(self):
        super().__init__("referential_integrity_pattern", "Referential Integrity", "valid_values")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        
        # Look for FK-like column names
        fk_patterns = ["_id", "foreign_key", "ref_", "parent_", "owner_"]
        is_fk_like = any(pattern in col_name for pattern in fk_patterns)
        
        # Check if it references another table
        if schema:
            tables = schema.get("related_tables", [])
            return is_fk_like and len(tables) > 0
        
        return is_fk_like
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        ref_table = schema.get("related_tables", ["ref_table"])[0] if schema else "ref_table"
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} referential integrity",
            "check_type": self.check_type,
            "rationale": f"Ensure {col_name} references valid {ref_table} records",
            "confidence": 0.80,
            "suggested_yaml": f"""checks:
  - name: '{col_name} references exist'
    type: valid_values
    column: {col_name}
    fail: when not exists in {ref_table}.id"""
        }

class FreshnessDateRule(SuggestionRule):
    """Enhanced freshness check with multiple strategies."""
    def __init__(self):
        super().__init__("date_freshness_enhanced", "Freshness", "freshness")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        col_type = column.get("type", "")
        
        freshness_keywords = ["created", "updated", "loaded", "ingested", "timestamp", "date", "modified"]
        return any(kw in col_name for kw in freshness_keywords) and _type_contains(col_type, DATE_TYPE_TOKENS)
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} freshness",
            "check_type": self.check_type,
            "rationale": f"Ensure {col_name} has recent data (indicates pipeline health)",
            "confidence": 0.90,
                        "suggested_yaml": _render_checks_yaml(f"- freshness({col_name}) < 1d")
        }

class DataTypeValidationRule(SuggestionRule):
    """Suggest format/pattern validation based on logical column names."""
    def __init__(self):
        super().__init__("data_type_validation_patterns", "Format Validity", "valid_regex")
    
    def can_suggest(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> bool:
        col_name = column["name"].lower()
        col_type = column.get("type", "")
        
        # Match common data types to patterns
        pattern_keywords = {
            "email": ["email", "mail"],
            "phone": ["phone", "mobile", "tel"],
            "url": ["url", "website", "link"],
            "zip": ["zip", "postal", "code"],
            "ssn": ["ssn", "social"],
            "uuid": ["uuid", "guid"],
        }
        
        # Only for string types
        return _type_contains(col_type, STRING_TYPE_TOKENS) and "email" not in col_name
    
    def generate_suggestion(self, column: Dict[str, Any], schema: Dict[str, Any] = None) -> Dict[str, Any]:
        col_name = column["name"].lower()
        
        # Determine pattern based on column name
        patterns = {
            "email": r"^[\w\.-]+@[\w\.-]+\.\w+$",
            "phone": r"^\+?[1-9]\d{1,14}$",
            "url": r"^https?://",
            "zip": r"^\d{5}(-\d{4})?$",
            "uuid": r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        }
        
        matched_pattern = None
        for pattern_type, keywords in {k: [k] for k in patterns.keys()}.items():
            if any(kw in col_name for kw in keywords):
                matched_pattern = patterns[pattern_type]
                break
        
        if not matched_pattern:
            return None
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{column['name']} format validation",
            "check_type": self.check_type,
            "rationale": f"Validate {column['name']} follows expected format",
            "confidence": 0.85,
            "suggested_yaml": _render_checks_yaml(
                f"- invalid_count({column['name']}) = 0:",
                f"    valid regex: '{matched_pattern}'",
            )
        }

class SuggestionEngine:
    """Main suggestion engine orchestrating all rules."""
    
    def __init__(self):
        self.rules = [
            # Core data quality rules
            NullCheckForPKRule(),
            UniquenessCheckRule(),
            MissingCheckRule(),
            RangeCheckNumericRule(),
            PatternCheckEmailRule(),
            FreshnessDateRule(),
            RowCountConsistencyRule(),
            DataTypeValidationRule(),
        ]
    
    def generate_suggestions(self, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate suggestions from schema metadata."""
        suggestions = []
        columns = schema.get("columns", [])
        
        for column in columns:
            for rule in self.rules:
                if rule.can_suggest(column, schema):
                    try:
                        suggestion = rule.generate_suggestion(column, schema)
                        if suggestion:  # Some rules may return None
                            suggestion["id"] = str(uuid4())
                            suggestions.append(suggestion)
                    except Exception as e:
                        logger.warning(f"Rule {rule.rule_id} failed for column {column['name']}: {e}")
        
        # Sort by confidence descending
        suggestions.sort(key=lambda s: s.get("confidence", 0), reverse=True)
        return suggestions

def generate_suggestions_for_metadata(metadata_json: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Public entry point."""
    engine = SuggestionEngine()
    return engine.generate_suggestions(metadata_json)
