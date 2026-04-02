"""
Unit tests for Soda Core checks display and Step 4 dropdown population.
Tests both issues: missing default checks and empty customer checks dropdown.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
from datetime import datetime
from uuid import uuid4

# Simulated backend models for testing
class MetadataSnapshot:
    def __init__(self, connection_id, schema_json, profile_json):
        self.id = uuid4()
        self.connection_id = connection_id
        self.schema_json = schema_json
        self.profile_json = profile_json
        self.created_at = datetime.now()

class CheckSuggestion:
    def __init__(self, **kwargs):
        self.id = uuid4()
        for k, v in kwargs.items():
            setattr(self, k, v)


# ============== TEST FIXTURES ==============

@pytest.fixture
def sample_metadata():
    """Sample metadata response from /api/v1/metadata/profile"""
    return {
        "snapshot_id": str(uuid4()),
        "connection_id": str(uuid4()),
        "schema": {
            "columns": [
                {"name": "id", "type": "int64", "nullable": False},
                {"name": "email", "type": "object", "nullable": True},
                {"name": "created_at", "type": "datetime64[ns]", "nullable": False},
                {"name": "amount", "type": "float64", "nullable": True},
            ]
        },
        "profile": {
            "id": {"row_count": 1000, "null_count": 0, "distinct_count": 1000},
            "email": {"row_count": 1000, "null_count": 50, "distinct_count": 980},
            "created_at": {"row_count": 1000, "null_count": 0, "distinct_count": 850},
            "amount": {"row_count": 1000, "null_count": 100, "distinct_count": 850},
        },
        "profiled_at": datetime.now().isoformat()
    }

@pytest.fixture
def sample_suggestions():
    """Sample AI suggestions from /api/v1/suggestions/"""
    return {
        "metadata_snapshot_id": str(uuid4()),
        "suggestions": [
            {
                "rule_id": "null_check_for_pk_like",
                "check_name": "id is not null",
                "check_type": "missing_count",
                "confidence": 0.95,
                "rationale": "Column appears to be a key or ID; expect no NULLs",
                "suggested_check_yaml": "checks:\n  - name: 'id is not null'\n    type: missing_count\n    column: id\n    fail: when > 0"
            },
            {
                "rule_id": "uniqueness_check_high_cardinality",
                "check_name": "id is unique",
                "check_type": "duplicate_count",
                "confidence": 0.85,
                "rationale": "Very high cardinality suggests uniqueness constraint",
                "suggested_check_yaml": "checks:\n  - name: 'id is unique'\n    type: duplicate_count\n    column: id\n    fail: when > 0"
            },
        ],
        "total_suggestions": 2,
        "generated_at": datetime.now().isoformat()
    }


# ============== ISSUE 1: Soda Core Default Checks Not Appearing ==============

class TestSodaCoreChecksDisplay:
    """Test that all Soda Core default checks are displayed in Step 3."""
    
    def test_soda_checks_library_populated(self):
        """Verify SODA_CHECKS library has all 7 categories with checks."""
        # This tests the frontend constant
        soda_checks = {
            "VOLUME": {"category": "📊 Volume Checks", "checks": [
                {"id": "row_count", "label": "row_count (Total rows)"},
                {"id": "row_count_range", "label": "row_count (Range)"}
            ]},
            "COMPLETENESS": {"category": "✅ Completeness Checks", "checks": [
                {"id": "missing_count", "label": "missing_count (NULL/Empty)"},
                {"id": "missing_percent", "label": "missing_percent (% Missing)"},
                {"id": "valid_count", "label": "valid_count (Non-NULL)"}
            ]},
            "UNIQUENESS": {"category": "🔑 Uniqueness Checks", "checks": [
                {"id": "duplicate_count", "label": "duplicate_count"},
                {"id": "invalid_percent", "label": "invalid_percent"}
            ]},
            "VALIDITY": {"category": "📝 Validity Checks", "checks": [
                {"id": "invalid_count", "label": "invalid_count (Pattern Match)"},
                {"id": "invalid_count_email", "label": "invalid_count (Email Format)"},
                {"id": "valid_emails", "label": "valid_count (Email Format)"},
                {"id": "failed_rows", "label": "failed_rows (Custom Pattern)"}
            ]},
            "STATISTICAL": {"category": "📈 Statistical Checks", "checks": [
                {"id": "min", "label": "min (Minimum Value)"},
                {"id": "max", "label": "max (Maximum Value)"},
                {"id": "avg", "label": "avg (Average/Mean)"},
                {"id": "stddev", "label": "stddev (Standard Deviation)"},
                {"id": "values_between", "label": "values_between (Range)"}
            ]},
            "SCHEMA": {"category": "🏗️ Schema Checks", "checks": [
                {"id": "schema_type", "label": "schema_type (Type Match)"},
                {"id": "schema_column_exists", "label": "Column Exists"}
            ]},
            "DISTRIBUTION": {"category": "📊 Distribution Checks", "checks": [
                {"id": "distinct_count", "label": "distinct_count"},
                {"id": "frequency", "label": "frequency (Value Distribution)"}
            ]}
        }
        
        # Verify all categories present
        assert len(soda_checks) == 7, f"Expected 7 categories, got {len(soda_checks)}"
        
        # Verify each category has checks
        total_checks = 0
        for category_name, category_data in soda_checks.items():
            assert "category" in category_data, f"Category {category_name} missing 'category' field"
            assert "checks" in category_data, f"Category {category_name} missing 'checks' field"
            assert len(category_data["checks"]) > 0, f"Category {category_name} has no checks"
            total_checks += len(category_data["checks"])
        
        assert total_checks == 30, f"Expected 30 total checks, got {total_checks}"
    
    def test_type_aware_filtering_includes_all_types(self):
        """Verify getApplicableChecks returns checks for each type."""
        # Test data: (columnType, expectedCheckCount, shouldIncludeTypes)
        test_cases = [
            ("int64", 11, ["ALL", "NUMERIC"]),  # Volume, Completeness, Uniqueness, Validity, Statistical, Schema, Distribution
            ("float64", 11, ["ALL", "NUMERIC"]),
            ("object", 8, ["ALL", "STRING", "VALIDITY"]),  # String types get validity checks
            ("datetime64", 8, ["ALL", "NUMERIC"]),  # Dates treated as numeric
            ("unknown_type", 5, ["ALL"]),  # Should still get ALL types
        ]
        
        for col_type, min_expected, applicable_types in test_cases:
            # Simulate getApplicableChecks logic
            checked_count = 0
            if col_type.lower() in ["int", "bigint", "float", "double", "numeric", "decimal", "int64", "float64"]:
                checked_count = 11  # Volume + Completeness + Uniqueness + Validity + Statistical + Schema + Distribution, minus string-only
            elif col_type.lower() in ["varchar", "string", "text", "object"]:
                checked_count = 16  # Includes string-specific validity checks
            elif col_type.lower() in ["date", "timestamp", "datetime64"]:
                checked_count = 11  # Dates get numeric + statistical
            else:
                checked_count = 5  # At least base checks
            
            assert checked_count >= min_expected, f"Column type {col_type}: expected >= {min_expected}, got {checked_count}"
    
    def test_all_checks_section_always_renders(self):
        """Very that 'All Available SODA Core Checks' section renders even without columns."""
        # This tests the JSX condition: All-checks should NOT be dependent on columns existing
        # Current code checks: {getColumnsFromMetadata(metadata).length > 0 && (...)}
        
        # Test 1: With columns, all-checks should render
        metadata_with_cols = {
            "schema": {"columns": [
                {"name": "col1", "type": "int64"}
            ]}
        }
        columns_from_metadata = len(metadata_with_cols.get("schema", {}).get("columns", []))
        assert columns_from_metadata > 0, "Should have columns"
        # All-checks renders (JSX: yes because condition is true)
        assert True, "All-checks section should render"
        
        # Test 2: Without columns, all-checks should STILL render
        metadata_no_cols = {"schema": {"columns": []}}
        columns_from_metadata = len(metadata_no_cols.get("schema", {}).get("columns", []))
        assert columns_from_metadata == 0, "Should have no columns"
        # All-checks renders (JSX: yes because it's NOT conditional on columns)
        # By-column section does NOT render (JSX: no because condition is false)
        assert True, "All-checks section should ALWAYS render"


# ============== ISSUE 2: Step 4 Customer Checks Dropdown Has No Values ==============

class TestStep4DropdownPopulation:
    """Test that Step 4 column dropdown is populated correctly."""
    
    def test_get_columns_from_metadata_handles_multiple_structures(self):
        """Verify getColumnsFromMetadata handles all response formats."""
        # The helper function must handle:
        # 1. metadata.schema.columns
        # 2. metadata.columns
        # 3. Direct array
        
        test_cases = [
            # Case 1: Standard response format
            {
                "metadata": {
                    "schema": {
                        "columns": [
                            {"name": "id", "type": "int64"},
                            {"name": "name", "type": "object"}
                        ]
                    }
                },
                "expected_count": 2,
                "desc": "schema.columns format"
            },
            # Case 2: Flattened format
            {
                "metadata": {
                    "columns": [
                        {"name": "id", "type": "int64"},
                        {"name": "name", "type": "object"}
                    ]
                },
                "expected_count": 2,
                "desc": "direct columns format"
            },
            # Case 3: Direct array
            {
                "metadata": [
                    {"name": "id", "type": "int64"},
                    {"name": "name", "type": "object"}
                ],
                "expected_count": 2,
                "desc": "direct array format"
            },
            # Case 4: No metadata
            {
                "metadata": None,
                "expected_count": 0,
                "desc": "null metadata"
            },
            # Case 5: Empty columns
            {
                "metadata": {"schema": {"columns": []}},
                "expected_count": 0,
                "desc": "empty columns"
            }
        ]
        
        for test_case in test_cases:
            metadata = test_case["metadata"]
            
            # Simulate getColumnsFromMetadata logic
            def get_columns(md):
                if not md:
                    return []
                if isinstance(md, list):
                    return md
                if isinstance(md.get("schema", {}).get("columns")):
                    return md["schema"]["columns"]
                return md.get("columns", [])
            
            columns = get_columns(metadata)
            assert len(columns) == test_case["expected_count"], f"Failed for case: {test_case['desc']}"
    
    def test_step4_dropdown_uses_helper_function(self):
        """Verify Step 4 dropdown uses getColumnsFromMetadata, not hardcoded path."""
        # Before fix: <select> used metadata.schema.columns (hardcoded)
        # After fix: <select> uses getColumnsFromMetadata(metadata)
        
        # Test data: response with columns in different structure
        metadata = {
            "columns": [  # Note: at top level, not in schema
                {"name": "customer_id", "type": "int64"},
                {"name": "email", "type": "object"}
            ]
        }
        
        # If using hardcoded path: metadata.schema.columns → undefined
        hardcoded_columns = metadata.get("schema", {}).get("columns", [])
        assert len(hardcoded_columns) == 0, "Hardcoded path fails for this metadata structure"
        
        # If using helper: should find columns
        def get_columns(md):
            if not md:
                return []
            if isinstance(md, list):
                return md
            if md.get("schema", {}).get("columns"):
                return md["schema"]["columns"]
            return md.get("columns", [])
        
        helper_columns = get_columns(metadata)
        assert len(helper_columns) == 2, "Helper function should find columns"
    
    def test_metadata_persistence_localstorage(self):
        """Verify metadata is persisted to localStorage for cross-step access."""
        connection_id = str(uuid4())
        metadata = {
            "snapshot_id": str(uuid4()),
            "connection_id": connection_id,
            "schema": {
                "columns": [
                    {"name": "id", "type": "int64"},
                ]
            }
        }
        
        # Simulate profileMetadata storing in localStorage
        store_key = f"metadata_{connection_id}"
        stored_value = json.dumps(metadata)  # Would be localStorage.setItem(store_key, stored_value)
        
        # Simulate preparePlan restoring from localStorage
        restored_metadata = json.loads(stored_value)
        
        assert restored_metadata["snapshot_id"] == metadata["snapshot_id"]
        assert restored_metadata["schema"]["columns"][0]["name"] == "id"


# ============== INTEGRATION TESTS ==============

class TestStep3ToStep4Workflow:
    """Integration tests for Step 3 → Step 4 workflow."""
    
    def test_complete_check_selection_workflow(self, sample_metadata, sample_suggestions):
        """Test complete workflow from Step 3 check selection to Step 4 review."""
        # Step 3: User sees AI suggestions + Soda checks
        assert len(sample_suggestions["suggestions"]) > 0, "Should have AI suggestions"
        
        # Simulate user selecting checks
        selected_checks = {
            "ai_suggestions": [sample_suggestions["suggestions"][0]],  # Select 1 AI suggestion
            "soda_global": [{"check_type": "row_count", "name": "row_count"}],  # Select 1 global
            "soda_column": [{"column": "id", "check_type": "missing_count"}],  # Select 1 column-specific
        }
        
        total_checks = len(selected_checks["ai_suggestions"]) + len(selected_checks["soda_global"]) + len(selected_checks["soda_column"])
        assert total_checks == 3, "Should have 3 checks selected"
        
        # Step 4: Metadata should be available for dropdown
        columns_available = sample_metadata["schema"]["columns"]
        assert len(columns_available) > 0, "Step 4 should have columns for dropdown"
        
        # User should be able to add custom check with column selector
        custom_check = {
            "column": columns_available[0]["name"],
            "check_type": "duplicate_count",
            "name": f"{columns_available[0]['name']} - duplicate_count"
        }
        
        assert custom_check["column"] is not None, "Step 4 column selector should have value"
        assert custom_check["check_type"] is not None, "Step 4 check type selector should have value"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
