"""
Heuristic-based check suggestion engine.

Maps metadata patterns to Soda Core check recommendations.
"""

from typing import List, Dict, Any
from uuid import UUID, uuid4
import logging

logger = logging.getLogger(__name__)

class SuggestionRule:
    """Base class for a suggestion rule."""
    def __init__(self, rule_id: str, check_type: str):
        self.rule_id = rule_id
        self.check_type = check_type
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        """Check if this rule applies to the column."""
        raise NotImplementedError
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a check suggestion if applicable."""
        raise NotImplementedError

class NullCheckForPKRule(SuggestionRule):
    """Suggest null check for key-like columns."""
    def __init__(self):
        super().__init__("null_check_for_pk_like", "Completeness")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        is_pk = column.get("is_pk", False)
        distinct_count = column.get("distinct_count", 0)
        row_count = column.get("row_count", 1)
        
        # PK or highly unique + non-nullable
        if is_pk or distinct_count > 0.99 * row_count:
            return not column.get("nullable", True)
        return False
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} is not null",
            "check_type": self.check_type,
            "rationale": "Column appears to be a key or ID; expect no NULLs",
            "confidence": 0.95,
            "suggested_yaml": f"checks:\n  - name: '{col_name} is not null'\n    type: missing_count\n    column: {col_name}\n    fail: when > 0"
        }

class UniquenessCheckRule(SuggestionRule):
    """Suggest uniqueness check for high-cardinality columns."""
    def __init__(self):
        super().__init__("uniqueness_check_high_cardinality", "Uniqueness")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        distinct_count = column.get("distinct_count", 0)
        row_count = column.get("row_count", 1)
        return distinct_count > 0.95 * row_count and row_count > 100
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} is unique",
            "check_type": self.check_type,
            "rationale": "Very high cardinality suggests uniqueness constraint",
            "confidence": 0.85,
            "suggested_yaml": f"checks:\n  - name: '{col_name} is unique'\n    type: duplicate_count\n    column: {col_name}\n    fail: when > 0"
        }

class MissingCheckRule(SuggestionRule):
    """Suggest missing value check for nullable important columns."""
    def __init__(self):
        super().__init__("missing_check_nullable", "Completeness")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        col_name = column["name"].lower()
        nullable = column.get("nullable", True)
        row_count = column.get("row_count", 1)
        
        # Important nullable columns (email, phone, etc.)
        important_keywords = ["email", "phone", "contact", "address"]
        return nullable and any(kw in col_name for kw in important_keywords) and row_count > 100
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        col_name = column["name"]
        # Assume 95% required
        fail_threshold = int(0.05 * column.get("row_count", 1000))
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} completeness",
            "check_type": self.check_type,
            "rationale": f"'{col_name}' is an important field; expect high completion rate",
            "confidence": 0.80,
            "suggested_yaml": f"checks:\n  - name: '{col_name} completeness'\n    type: missing_count\n    column: {col_name}\n    fail: when > {fail_threshold}"
        }

class RangeCheckNumericRule(SuggestionRule):
    """Suggest range check for numeric columns."""
    def __init__(self):
        super().__init__("range_check_numeric", "Validity")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        col_type = column.get("type", "").upper()
        return col_type in ["INT", "BIGINT", "FLOAT", "DECIMAL", "NUMERIC"]
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        col_name = column["name"]
        col_min = column.get("min", 0)
        col_max = column.get("max", 1000000)
        
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} within valid range",
            "check_type": self.check_type,
            "rationale": f"Numeric column should be between {col_min} and {col_max}",
            "confidence": 0.75,
            "suggested_yaml": f"checks:\n  - name: '{col_name} range check'\n    type: invalid_count\n    column: {col_name}\n    valid_min: {col_min}\n    valid_max: {col_max}\n    fail: when > 0"
        }

class PatternCheckEmailRule(SuggestionRule):
    """Suggest email pattern validation."""
    def __init__(self):
        super().__init__("pattern_check_email", "Validity")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        col_name = column["name"].lower()
        col_type = column.get("type", "").upper()
        return "email" in col_name and "VARCHAR" in col_type
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
        col_name = column["name"]
        return {
            "rule_id": self.rule_id,
            "check_name": f"{col_name} email format",
            "check_type": self.check_type,
            "rationale": "Column contains email addresses; validate format",
            "confidence": 0.80,
            "suggested_yaml": f"""checks:
  - name: '{col_name} email format'
    type: invalid_count
    column: {col_name}
    valid_regex: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{{2,}}$
    fail: when > 0"""
        }

class EnumCheckRule(SuggestionRule):
    """Suggest enum check for low-cardinality columns."""
    def __init__(self):
        super().__init__("enum_check_status", "Validity")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        col_name = column["name"].lower()
        distinct_count = column.get("distinct_count", 0)
        
        # Low cardinality + status-like name
        status_keywords = ["status", "state", "type", "kind", "level"]
        return distinct_count < 10 and any(kw in col_name for kw in status_keywords)
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
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
        super().__init__("date_freshness_check", "Freshness")
    
    def can_suggest(self, column: Dict[str, Any]) -> bool:
        col_name = column["name"].lower()
        col_type = column.get("type", "").upper()
        
        freshness_keywords = ["created", "updated", "loaded", "ingested", "timestamp"]
        return any(kw in col_name for kw in freshness_keywords) and "TIMESTAMP" in col_type
    
    def generate_suggestion(self, column: Dict[str, Any]) -> Dict[str, Any]:
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
        super().__init__("composite_key_check", "Uniqueness")
    
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

class SuggestionEngine:
    """Main suggestion engine orchestrating all rules."""
    
    def __init__(self):
        self.rules = [
            NullCheckForPKRule(),
            UniquenessCheckRule(),
            MissingCheckRule(),
            RangeCheckNumericRule(),
            PatternCheckEmailRule(),
            EnumCheckRule(),
            FreshnessCheckRule(),
        ]
    
    def generate_suggestions(self, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate suggestions from schema metadata."""
        suggestions = []
        columns = schema.get("columns", [])
        
        for column in columns:
            for rule in self.rules:
                if rule.can_suggest(column):
                    try:
                        suggestion = rule.generate_suggestion(column)
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
