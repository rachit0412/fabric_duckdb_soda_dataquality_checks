"""
Data Fixtures for Edge Case Testing

Provides test datasets, DataFrames, and data generation utilities for PHASE 2 testing.
"""

import pytest
import pandas as pd
import numpy as np
from io import StringIO
from typing import Generator


# ============================================================================
# CSV String Fixtures (for file upload testing)
# ============================================================================

EMPTY_CSV = """id,name,email
"""

CSV_HEADERS_ONLY = """id,name,email
"""

CSV_NO_HEADERS = """1,Alice,alice@example.com
2,Bob,bob@example.com
"""

CSV_INCOMPLETE_ROW = """id,name,email
1,Alice,alice@example.com
2,Bob
"""

CSV_ALL_NULLS = """id,name,email
,,
,,
,,
"""

CSV_MIXED_NULLS = """id,name,email
1,Alice,alice@example.com
,Bob,bob@example.com
3,,charlie@example.com
"""

CSV_LARGE_STRINGS = """id,name,email
1,{"text": "x" * 10000},long_email_xxxxxxxx@example.com
2,{"text": "y" * 10000},another_long_email@example.com
"""

CSV_UNICODE = """id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
3,张三,zhangsan@example.com
4,محمد,mohammad@example.com
5,José,jose@example.com
6,😀😃😄,emoji@example.com
"""

CSV_INVALID_TYPES = """id,name,amount
1,Alice,100.50
2,Bob,not_a_number
3,Charlie,one_hundred
"""

CSV_DATE_EDGE_CASES = """id,date,timestamp
1,1900-01-01,1900-01-01 00:00:00
2,2099-12-31,2099-12-31 23:59:59
3,2025-02-29,2025-02-29
4,invalid-date,invalid
"""

CSV_BOOLEAN_VARIATIONS = """id,status,active
1,true,True
2,false,False
3,yes,YES
4,no,NO
5,1,1
6,0,0
"""

CSV_DUPLICATE_VALUES = """id,name,city
1,Alice,NYC
2,Alice,NYC
3,Bob,LA
4,Bob,LA
5,Bob,LA
"""

# ============================================================================
# DataFrame Fixtures (for programmatic testing)
# ============================================================================


@pytest.fixture
def empty_dataframe() -> pd.DataFrame:
    """Fixture: Empty DataFrame (0 rows)."""
    return pd.DataFrame(columns=["id", "name", "email"])


@pytest.fixture
def dataframe_headers_only() -> pd.DataFrame:
    """Fixture: DataFrame with headers but no data rows."""
    return pd.DataFrame(columns=["id", "name", "email"])


@pytest.fixture
def dataframe_null_everywhere() -> pd.DataFrame:
    """Fixture: DataFrame where every cell is NULL."""
    return pd.DataFrame({
        "id": [None, None, None],
        "name": [None, None, None],
        "email": [None, None, None],
    })


@pytest.fixture
def dataframe_single_null_column() -> pd.DataFrame:
    """Fixture: One column is 100% NULL."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "name": ["Alice", "Bob", "Charlie"],
        "email": [None, None, None],  # 100% NULL
    })


@pytest.fixture
def dataframe_bool_all_false() -> pd.DataFrame:
    """Fixture: Boolean column with all False values."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "active": [False, False, False],
    })


@pytest.fixture
def dataframe_string_all_empty() -> pd.DataFrame:
    """Fixture: String column with all empty strings."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["", "", ""],
    })


@pytest.fixture
def dataframe_mixed_types() -> pd.DataFrame:
    """Fixture: Column with mixed types (123, "123", 1e2)."""
    return pd.DataFrame({
        "id": [1, 2, 3],
        "value": [123, "123", 1e2],  # Will be object dtype
    })


@pytest.fixture
def dataframe_unicode() -> pd.DataFrame:
    """Fixture: Unicode and special characters."""
    return pd.DataFrame({
        "id": [1, 2, 3, 4, 5, 6],
        "name": [
            "Alice",
            "Bob",
            "张三",           # Chinese
            "محمد",           # Arabic (RTL)
            "José",           # With accent
            "😀😃😄",        # Emoji
        ],
    })


@pytest.fixture
def dataframe_large_strings() -> pd.DataFrame:
    """Fixture: Very long string values (1MB+)."""
    long_string = "x" * 100000
    return pd.DataFrame({
        "id": [1, 2],
        "text": [long_string, long_string],
    })


@pytest.fixture
def dataframe_extreme_numbers() -> pd.DataFrame:
    """Fixture: Extreme numeric values."""
    return pd.DataFrame({
        "id": [1, 2, 3, 4],
        "big_int": [2**63 - 1, 2**62, -2**63, 0],
        "small_float": [1e-300, 1e-100, 1e-50, 0.0],
        "huge_float": [1e300, 1e200, 1e100, np.inf],
    })


@pytest.fixture
def dataframe_duplication() -> pd.DataFrame:
    """Fixture: Dataset with 50% row duplication."""
    data = pd.DataFrame({
        "id": [1, 2, 3, 1, 2, 3],
        "name": ["Alice", "Bob", "Charlie", "Alice", "Bob", "Charlie"],
    })
    return data


@pytest.fixture
def dataframe_normal_data() -> pd.DataFrame:
    """Fixture: Normal, well-formed dataset (baseline)."""
    return pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
        "email": [
            "alice@example.com",
            "bob@example.com",
            "charlie@example.com",
            "diana@example.com",
            "eve@example.com",
        ],
        "age": [28, 32, 25, 30, 27],
        "salary": [50000.0, 60000.0, 55000.0, 70000.0, 52000.0],
    })


@pytest.fixture
def large_dataframe_1m_rows() -> pd.DataFrame:
    """Fixture: Large dataset with 1M rows."""
    n_rows = 1_000_000
    return pd.DataFrame({
        "id": np.arange(1, n_rows + 1),
        "name": np.random.choice(["Alice", "Bob", "Charlie", "Diana", "Eve"], n_rows),
        "value": np.random.randint(0, 1000, n_rows),
        "score": np.random.uniform(0, 100, n_rows),
    })


@pytest.fixture
def dataframe_10k_columns() -> pd.DataFrame:
    """Fixture: Dataset with 10,000 columns."""
    n_cols = 10000
    data = {f"col_{i}": np.random.randint(0, 100, 100) for i in range(n_cols)}
    return pd.DataFrame(data)


@pytest.fixture
def date_boundary_dataframe() -> pd.DataFrame:
    """Fixture: Date boundary test cases (Y2K, far future, etc.)."""
    return pd.DataFrame({
        "id": [1, 2, 3, 4],
        "date": pd.to_datetime([
            "1900-01-01",
            "2000-01-01",
            "2099-12-31",
            "2025-02-29",
        ]),
    })


# ============================================================================
# CSV String Fixtures as Function Fixtures
# ============================================================================


@pytest.fixture
def csv_empty() -> str:
    """Fixture: Empty CSV (headers only)."""
    return EMPTY_CSV


@pytest.fixture
def csv_no_headers() -> str:
    """Fixture: CSV with data but no headers."""
    return CSV_NO_HEADERS


@pytest.fixture
def csv_incomplete_rows() -> str:
    """Fixture: CSV with incomplete rows (fewer columns)."""
    return CSV_INCOMPLETE_ROW


@pytest.fixture
def csv_all_nulls() -> str:
    """Fixture: CSV where all cells are empty."""
    return CSV_ALL_NULLS


@pytest.fixture
def csv_unicode_chars() -> str:
    """Fixture: CSV with unicode characters."""
    return CSV_UNICODE


@pytest.fixture
def csv_invalid_types() -> str:
    """Fixture: CSV with type mismatches."""
    return CSV_INVALID_TYPES


@pytest.fixture
def csv_date_boundaries() -> str:
    """Fixture: CSV with date edge cases."""
    return CSV_DATE_EDGE_CASES


@pytest.fixture
def csv_boolean_variations() -> str:
    """Fixture: CSV with various boolean representations."""
    return CSV_BOOLEAN_VARIATIONS


@pytest.fixture
def csv_duplicates() -> str:
    """Fixture: CSV with duplicate rows."""
    return CSV_DUPLICATE_VALUES


@pytest.fixture
def csv_large_strings() -> str:
    """Fixture: CSV with very long string values."""
    return CSV_LARGE_STRINGS


# ============================================================================
# Utilities for generating test data at runtime
# ============================================================================


def generate_large_csv(n_rows: int = 100000) -> str:
    """Generate large CSV string with n_rows."""
    lines = ["id,name,value,score"]
    names = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
    for i in range(1, n_rows + 1):
        name = names[i % len(names)]
        value = i * 10
        score = (i % 100) + 0.5
        lines.append(f"{i},{name},{value},{score}")
    return "\n".join(lines)


def generate_dataframe_with_nulls(n_rows: int, null_percentage: float) -> pd.DataFrame:
    """Generate DataFrame with specified null percentage."""
    data = {
        "id": range(1, n_rows + 1),
        "value": np.random.randint(0, 1000, n_rows),
    }
    df = pd.DataFrame(data)
    
    # Add nulls to value column
    n_nulls = int(n_rows * null_percentage)
    null_indices = np.random.choice(n_rows, n_nulls, replace=False)
    df.loc[null_indices, "value"] = None
    
    return df


def generate_dataframe_mixed_types(n_rows: int) -> pd.DataFrame:
    """Generate DataFrame with mixed types in columns."""
    data = {
        "id": range(1, n_rows + 1),
        "mixed": [i if i % 2 == 0 else str(i) if i % 3 == 0 else float(i) for i in range(n_rows)],
    }
    return pd.DataFrame(data)


@pytest.fixture
def csv_generator() -> callable:
    """Fixture: Function to generate large CSV strings."""
    return generate_large_csv


@pytest.fixture
def dataframe_generator() -> callable:
    """Fixture: Function to generate DataFrames with custom null percentage."""
    return generate_dataframe_with_nulls
