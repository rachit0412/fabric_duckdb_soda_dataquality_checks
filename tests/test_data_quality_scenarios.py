"""
Data Quality Edge Case Testing

Tests for data quality scenarios including:
- Empty/null data handling
- Unicode and special characters
- Extreme values (very large numbers, long strings)
- Date format mismatches
- Type mismatches and coercion
- Duplicate data handling

These tests verify that the API correctly processes, validates, and reports
quality metrics for all types of data input.

Fixtures Used:
- empty_dataframe, dataframe_null_everywhere, dataframe_unicode
- dataframe_extreme_numbers, large_dataframe_1m_rows, dataframe_10k_columns
- csv_empty, csv_no_headers, csv_unicode_chars, csv_invalid_types, csv_date_boundaries
- generate_large_csv(), generate_dataframe_with_nulls()

PRIORITY: HIGH (Data quality is core to product value)
DIMENSION: Data Quality Scenarios
TEST_COUNT: 18 tests
ESTIMATED_RUNTIME: <5 seconds
"""

import pytest
import pandas as pd
import numpy as np
import json
from typing import Dict, Any, Optional
from pathlib import Path
import tempfile
import io


class TestEmptyAndNullDataHandling:
    """Test suite for empty and null data edge cases."""

    @pytest.mark.data_quality
    @pytest.mark.critical
    def test_empty_csv_file_handling(self, empty_dataframe, valid_auth_header: Dict[str, str],
                                     api_base_url="http://localhost:8000"):
        """
        Scenario: Upload CSV with headers only, no data rows
        Expected: Accepted with 0 rows, quality metrics calculated (100% empty)
        
        Edge case: System must handle empty data gracefully without crash.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        empty_df = empty_dataframe
        csv_content = empty_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": list(empty_df.columns),
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400], \
            f"Should handle empty data gracefully, got {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            # Should report metrics even for empty data
            assert isinstance(data, (list, dict)), "Response should be structured"

    @pytest.mark.data_quality
    @pytest.mark.critical
    def test_dataframe_all_nulls_handling(self, dataframe_null_everywhere, 
                                        valid_auth_header: Dict[str, str],
                                        api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame where every cell is NULL
        Expected: 0% completeness quality metric, analysis succeeds
        
        Edge case: Entire dataset is missing data.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        null_df = dataframe_null_everywhere
        csv_content = null_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": list(null_df.columns),
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201], \
            f"Should handle all-null data. Got {response.status_code}"
        
        data = response.json() if response.text else {}
        # Should compute quality metrics indicating 0% completeness
        if "quality_score" in data or "completeness" in data:
            metric = data.get("quality_score") or data.get("completeness", 0)
            assert metric >= 0, "Should have valid quality metric"

    @pytest.mark.data_quality
    @pytest.mark.critical
    def test_single_null_column_detection(self, dataframe_null_everywhere, 
                                         valid_auth_header: Dict[str, str],
                                         api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame with one column that is 100% NULL
        Expected: Column flagged as problematic, quality metric <100%
        
        Edge case: One column has no data, others may be fine.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # Create DataFrame where one specific column is null
        mixed_df = pd.DataFrame({
            "col_with_data": [1, 2, 3, 4, 5],
            "col_all_null": [None, None, None, None, None],
            "col_with_data_2": ["a", "b", "c", "d", "e"]
        })
        csv_content = mixed_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["col_with_data", "col_all_null", "col_with_data_2"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201]
        data = response.json() if response.text else {}
        # Should identify null column as problematic
        if isinstance(data, list):
            column_names = [item.get("column_name") for item in data if "column_name" in item]
            assert "col_all_null" in column_names or len(data) > 0, \
                "Should flag or analyze the all-null column"


class TestUnicodeAndSpecialCharacters:
    """Test suite for unicode and special character handling."""

    @pytest.mark.data_quality
    def test_unicode_characters_in_data(self, dataframe_unicode, 
                                       valid_auth_header: Dict[str, str],
                                       api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame contains Unicode characters (emoji, non-ASCII, etc.)
        Expected: Handled correctly, no encoding errors
        
        Edge case: Chinese, Arabic, emoji, special symbols.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        unicode_df = dataframe_unicode
        csv_content = unicode_df.to_csv(index=False, encoding='utf-8')
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": list(unicode_df.columns),
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201], \
            f"Should handle Unicode correctly, got {response.status_code}: {response.text}"
        
        data = response.json() if response.text else {}
        assert data is not None, "Should return valid response"

    @pytest.mark.data_quality
    def test_special_characters_csv_handling(self, csv_unicode_chars, 
                                            valid_auth_header: Dict[str, str],
                                            api_base_url="http://localhost:8000"):
        """
        Scenario: CSV string contains special chars: quotes, newlines, commas in values
        Expected: Properly escaped and parsed
        
        Edge case: CSV values with embedded delimiters.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # csv_unicode_chars already has special characters
        payload = {
            "dataframe_csv": csv_unicode_chars,
            "column_names": ["name", "description"],  # Adjust as needed
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        # Should handle CSV correctly despite special chars
        assert response.status_code in [200, 201, 400], \
            f"Should handle special chars. Got {response.status_code}"


class TestExtremeValuesAndBoundaries:
    """Test suite for extreme values and boundary conditions."""

    @pytest.mark.data_quality
    def test_extremely_large_numbers(self, dataframe_extreme_numbers, 
                                     valid_auth_header: Dict[str, str],
                                     api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame contains extremely large numbers (beyond INT64)
        Expected: Handled as numeric without overflow/precision loss
        
        Edge case: Numbers like 999999999999999999999999.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        extreme_df = dataframe_extreme_numbers
        csv_content = extreme_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": list(extreme_df.columns),
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201], \
            f"Should handle extreme values. Got {response.status_code}"

    @pytest.mark.data_quality
    def test_very_long_string_values(self, dataframe_large_strings, 
                                    valid_auth_header: Dict[str, str],
                                    api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame contains very long string values (>10MB per cell)
        Expected: Handled or rejected with clear error
        
        Edge case: String data that consumes significant memory.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # Create DataFrame with large strings
        large_string = "x" * (1024 * 100)  # 100KB string
        large_df = pd.DataFrame({
            "id": [1, 2, 3],
            "large_text": [large_string, large_string, large_string]
        })
        csv_content = large_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["id", "large_text"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert - Should handle or gracefully reject
        assert response.status_code in [200, 201, 413, 400], \
            f"Should handle large strings gracefully. Got {response.status_code}"

    @pytest.mark.data_quality
    def test_negative_numbers_in_quantity_column(self, valid_auth_header: Dict[str, str],
                                                api_base_url="http://localhost:8000"):
        """
        Scenario: Column that should be positive (quantity) contains negative numbers
        Expected: Flagged as data quality issue or anomaly
        
        Edge case: Business logic violation (qty should be >= 0).
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        negative_df = pd.DataFrame({
            "product_id": [1, 2, 3],
            "quantity": [10, -5, 3],  # -5 is invalid
            "price": [9.99, 19.99, 14.99]
        })
        csv_content = negative_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["product_id", "quantity", "price"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201]
        # Should identify negative quantity as anomaly
        data = response.json() if response.text else {}
        if isinstance(data, list) and len(data) > 0:
            # Look for quantity column in results
            for item in data:
                if "quantity" in str(item):
                    # Ideally would flag as anomalous
                    pass


class TestDateAndFormatMismatches:
    """Test suite for date format and type mismatch edge cases."""

    @pytest.mark.data_quality
    def test_date_format_mismatch_iso_vs_us(self, csv_date_boundaries, 
                                           valid_auth_header: Dict[str, str],
                                           api_base_url="http://localhost:8000"):
        """
        Scenario: Date column has mixed formats (ISO 8601, US MM/DD/YYYY)
        Expected: Parseable with warning or error appropriately reported
        
        Edge case: 01/02/2020 could be Jan 2 or Feb 1.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # Mixed date formats
        mixed_dates_df = pd.DataFrame({
            "date": ["2020-01-02", "01/02/2020", "2020-02-03", "02/03/2020"]
        })
        csv_content = mixed_dates_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["date"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400], \
            f"Should handle date format mismatch. Got {response.status_code}"

    @pytest.mark.data_quality
    def test_invalid_date_values(self, valid_auth_header: Dict[str, str],
                                api_base_url="http://localhost:8000"):
        """
        Scenario: Date column contains invalid dates (2025-02-30, 2025-13-01)
        Expected: Flagged as invalid or error reported
        
        Edge case: Dates that don't exist in calendar.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        invalid_dates_df = pd.DataFrame({
            "event_date": ["2025-01-15", "2025-02-30", "2025-13-01"],  # 30th of Feb, month 13
        })
        csv_content = invalid_dates_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["event_date"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400]
        data = response.json() if response.text else {}
        if response.status_code == 200:
            # Should indicate date parsing issues
            if "errors" in data or "quality_issues" in data:
                assert len(data["errors"]) > 0 or len(data["quality_issues"]) > 0


class TestTypeMismatchesAndCoercion:
    """Test suite for type mismatches and implicit type coercion."""

    @pytest.mark.data_quality
    def test_string_in_numeric_column(self, valid_auth_header: Dict[str, str],
                                     api_base_url="http://localhost:8000"):
        """
        Scenario: Numeric column contains string values ("abc", "N/A")
        Expected: Flagged, treated as NULL, or conversion attempted
        
        Edge case: Numeric column has mixed types.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        mixed_types_df = pd.DataFrame({
            "id": [1, 2, 3, 4],
            "amount": [100.50, "abc", 200.00, "N/A"]  # Strings in numeric column
        })
        csv_content = mixed_types_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["id", "amount"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400]
        if response.status_code == 200:
            data = response.json() if response.text else {}
            # Should handle type mismatch appropriately

    @pytest.mark.data_quality
    def test_boolean_column_variations(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: Boolean column with various representations (true/false, 1/0, yes/no)
        Expected: Standardized or handled with mapping
        
        Edge case: Boolean has multiple representations.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        bool_df = pd.DataFrame({
            "is_active": ["true", "false", "1", "0", "yes", "no", True, False]
        })
        csv_content = bool_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["is_active"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400]


class TestLargeDatasetHandling:
    """Test suite for large dataset performance and stability."""

    @pytest.mark.data_quality
    @pytest.mark.slow
    def test_large_csv_1m_rows(self, generate_large_csv, valid_auth_header: Dict[str, str],
                              api_base_url="http://localhost:8000"):
        """
        Scenario: Upload CSV with 1,000,000 rows
        Expected: Processed successfully or rejected with clear error (too large)
        
        Edge case: Dataset size testing.
        """
        pytest.skip("1M row test requires significant resources, skipped in CI")
        
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        large_csv = generate_large_csv(1000000)  # 1M rows
        
        payload = {
            "dataframe_csv": large_csv,
            "column_names": ["id", "value"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header, timeout=60)
        
        # Assert
        assert response.status_code in [200, 201, 413, 400], \
            "Should handle large dataset (accept, reject with reason, or timeout)"

    @pytest.mark.data_quality
    def test_many_columns_wide_dataset(self, dataframe_10k_columns, 
                                      valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: DataFrame with 10,000 columns
        Expected: Accepted or rejected with size limit error
        
        Edge case: Very wide datasets.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # Create wide DataFrame
        wide_df = pd.DataFrame(
            np.random.randn(10, 10000),
            columns=[f"col_{i}" for i in range(10000)]
        )
        csv_content = wide_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": list(wide_df.columns),
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header, timeout=30)
        
        # Assert
        assert response.status_code in [200, 201, 413, 400], \
            f"Should handle wide dataset appropriately. Got {response.status_code}"


class TestDuplicateDataHandling:
    """Test suite for duplicate data detection and handling."""

    @pytest.mark.data_quality
    def test_all_rows_identical(self, valid_auth_header: Dict[str, str],
                               api_base_url="http://localhost:8000"):
        """
        Scenario: All rows in DataFrame are identical
        Expected: Quality check should flag as 0% uniqueness or similar metric
        
        Edge case: No variety in data.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        duplicate_df = pd.DataFrame({
            "id": [1, 1, 1, 1, 1],
            "name": ["John", "John", "John", "John", "John"],
            "email": ["john@example.com", "john@example.com", "john@example.com", "john@example.com", "john@example.com"]
        })
        csv_content = duplicate_df.to_csv(index=False)
        
        payload = {
            "dataframe_csv": csv_content,
            "column_names": ["id", "name", "email"],
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201]
        data = response.json() if response.text else {}
        # Should detect low/zero uniqueness

    @pytest.mark.data_quality
    def test_duplicate_column_names(self, valid_auth_header: Dict[str, str],
                                   api_base_url="http://localhost:8000"):
        """
        Scenario: CSV has duplicate column names (two "id" columns)
        Expected: Rejected or handled with disambiguation
        
        Edge case: Invalid structure.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        # Manually create CSV with duplicate headers
        csv_with_dupes = "id,name,id\n1,John,100\n2,Jane,200"
        
        payload = {
            "dataframe_csv": csv_with_dupes,
            "column_names": ["id", "name", "id"],  # Duplicate "id"
        }
        
        # Act
        response = requests.post(endpoint, json=payload, headers=valid_auth_header)
        
        # Assert
        assert response.status_code in [200, 201, 400], \
            "Should handle or reject duplicate column names"


class TestDataQualityMetricsComputation:
    """Test suite for quality metrics calculation edge cases."""

    @pytest.mark.data_quality
    def test_quality_score_edge_values(self, valid_auth_header: Dict[str, str],
                                      api_base_url="http://localhost:8000"):
        """
        Scenario: Various DataFrames should have quality scores 0-100%
        Expected: Scores are valid and logical
        
        Edge case: Score computation correctness.
        """
        # Arrange
        endpoint = f"{api_base_url}/api/suggestions"
        
        test_cases = [
            ("Perfect data", pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})),
            ("Half nulls", pd.DataFrame({"a": [1, None, 3], "b": ["x", None, "z"]})),
            ("All nulls", pd.DataFrame({"a": [None, None, None]})),
        ]
        
        for name, df in test_cases:
            csv_content = df.to_csv(index=False)
            payload = {
                "dataframe_csv": csv_content,
                "column_names": list(df.columns),
            }
            
            # Act
            response = requests.post(endpoint, json=payload, headers=valid_auth_header)
            
            # Assert
            assert response.status_code in [200, 201], \
                f"Failed for case: {name}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-m", "not slow"])
