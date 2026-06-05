"""
Great Expectations Runner — standalone microservice.

Accepts a simple expectations YAML format and runs GE checks against
a CSV/Parquet file or Postgres table using pandas + GE.

POST /execute   — run GE expectations
GET  /health    — liveness probe

Expectations YAML format:
  expectations for <dataset>:
    - type: expect_column_values_to_not_be_null
      column: customer_id
    - type: expect_column_values_to_be_between
      column: age
      min_value: 0
      max_value: 150
    - type: expect_table_row_count_to_be_between
      min_value: 100
      max_value: 1000000
    - type: expect_column_values_to_match_regex
      column: email
      regex: "^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$"
    - type: expect_column_values_to_be_in_set
      column: status
      value_set: ["active", "inactive"]
"""

import logging
import re
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import yaml
from fastapi import FastAPI
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ge-runner")

app = FastAPI(title="Great Expectations Runner", version="1.0.0")


# ── models ────────────────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    run_id: str
    connection_type: str          # csv | parquet | postgres
    remote_url: str               # file path or connection string
    dataset_identifier: str
    checks_yaml: str              # GE expectations YAML


class CheckResult(BaseModel):
    check_name: str
    outcome: str                  # pass | fail
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ExecuteResponse(BaseModel):
    run_id: str
    success: bool
    execution_mode: str
    summary: Dict[str, int]
    results: List[CheckResult]
    error: Optional[str] = None


# ── health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "ge-runner"}


# ── execution ──────────────────────────────────────────────────────────────────

@app.post("/execute", response_model=ExecuteResponse)
def execute(req: ExecuteRequest):
    logger.info(f"[{req.run_id}] Running GE expectations on {req.dataset_identifier}")
    try:
        df = _load_dataframe(req)
        expectations = _parse_expectations(req.checks_yaml)
        results = _run_expectations(df, expectations)
        return ExecuteResponse(
            run_id=req.run_id,
            success=True,
            execution_mode="great_expectations",
            summary={
                "total":  len(results),
                "passed": sum(1 for r in results if r.outcome == "pass"),
                "failed": sum(1 for r in results if r.outcome == "fail"),
            },
            results=results,
        )
    except Exception as exc:
        logger.error(f"[{req.run_id}] GE run failed: {exc}", exc_info=True)
        return ExecuteResponse(
            run_id=req.run_id,
            success=False,
            execution_mode="great_expectations",
            summary={"total": 0, "passed": 0, "failed": 0},
            results=[CheckResult(check_name="execution_error", outcome="fail", message=str(exc))],
            error=str(exc),
        )


# ── data loading ───────────────────────────────────────────────────────────────

def _load_dataframe(req: ExecuteRequest) -> pd.DataFrame:
    if req.connection_type == "csv":
        return pd.read_csv(req.remote_url)
    if req.connection_type == "parquet":
        return pd.read_parquet(req.remote_url)
    if req.connection_type == "postgres":
        import sqlalchemy
        engine = sqlalchemy.create_engine(req.remote_url)
        return pd.read_sql_table(req.dataset_identifier, engine)
    raise ValueError(f"Unsupported connection type: {req.connection_type}")


# ── YAML parsing ───────────────────────────────────────────────────────────────

def _parse_expectations(checks_yaml: str) -> List[Dict[str, Any]]:
    """Parse expectations YAML into a list of expectation dicts."""
    parsed = yaml.safe_load(checks_yaml) or {}
    if isinstance(parsed, dict):
        for key, value in parsed.items():
            if isinstance(value, list):
                return value
    if isinstance(parsed, list):
        return parsed
    return []


# ── expectation runners ────────────────────────────────────────────────────────

def _run_expectations(df: pd.DataFrame, expectations: List[Dict[str, Any]]) -> List[CheckResult]:
    results: List[CheckResult] = []
    for exp in expectations:
        exp_type = exp.get("type", "")
        try:
            result = _dispatch(df, exp_type, exp)
            results.append(result)
        except Exception as e:
            results.append(CheckResult(
                check_name=f"{exp_type} ({exp.get('column', 'table')})",
                outcome="fail",
                message=f"Error running expectation: {e}",
            ))
    return results


def _dispatch(df: pd.DataFrame, exp_type: str, params: Dict[str, Any]) -> CheckResult:
    col = params.get("column")
    name = f"{exp_type}({col})" if col else exp_type

    # ── table-level ──────────────────────────────────────────────────────────
    if exp_type == "expect_table_row_count_to_be_between":
        n = len(df)
        lo = params.get("min_value")
        hi = params.get("max_value")
        ok = (lo is None or n >= lo) and (hi is None or n <= hi)
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"Row count {n} (expected {lo}–{hi})" if not ok else None,
        )

    if exp_type == "expect_table_columns_to_match_ordered_list":
        expected = params.get("column_list", [])
        actual = list(df.columns)
        ok = actual == expected
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Columns {actual} ≠ expected {expected}",
        )

    if exp_type == "expect_table_column_count_to_be_between":
        n = len(df.columns)
        lo = params.get("min_value")
        hi = params.get("max_value")
        ok = (lo is None or n >= lo) and (hi is None or n <= hi)
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Column count {n} outside [{lo}, {hi}]",
        )

    if exp_type == "expect_table_columns_to_match_set":
        expected_set = set(params.get("column_set", []))
        actual_set = set(df.columns)
        ok = expected_set == actual_set
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Columns {sorted(actual_set)} ≠ expected set {sorted(expected_set)}",
        )

    if exp_type == "expect_column_to_exist":
        target_col = params.get("column")
        ok = bool(target_col and target_col in df.columns)
        return CheckResult(
            check_name=f"{exp_type}({target_col})",
            outcome="pass" if ok else "fail",
            message=None if ok else f"Column '{target_col}' not found in dataset",
        )

    # ── column-level: null / completeness ────────────────────────────────────
    if exp_type == "expect_column_values_to_not_be_null":
        _assert_col(df, col)
        n_null = int(df[col].isna().sum())
        ok = n_null == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{n_null} null values found in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_be_null":
        _assert_col(df, col)
        n_notnull = int(df[col].notna().sum())
        ok = n_notnull == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{n_notnull} non-null values in '{col}'" if not ok else None,
        )

    # ── numeric range ────────────────────────────────────────────────────────
    if exp_type == "expect_column_values_to_be_between":
        _assert_col(df, col)
        lo = params.get("min_value")
        hi = params.get("max_value")
        series = df[col].dropna()
        if lo is not None:
            bad_lo = int((series < lo).sum())
        else:
            bad_lo = 0
        if hi is not None:
            bad_hi = int((series > hi).sum())
        else:
            bad_hi = 0
        bad = bad_lo + bad_hi
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values out of range [{lo}, {hi}] in '{col}'" if not ok else None,
        )

    # ── unique / duplicate ───────────────────────────────────────────────────
    if exp_type == "expect_column_values_to_be_unique":
        _assert_col(df, col)
        n_dup = int(df[col].duplicated(keep=False).sum())
        ok = n_dup == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{n_dup} duplicate values in '{col}'" if not ok else None,
        )

    # ── value set / enum ─────────────────────────────────────────────────────
    if exp_type == "expect_column_values_to_be_in_set":
        _assert_col(df, col)
        allowed = set(params.get("value_set", []))
        bad = int((~df[col].isin(allowed)).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values not in allowed set in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_not_be_in_set":
        _assert_col(df, col)
        blocked = set(params.get("value_set", []))
        bad = int(df[col].isin(blocked).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values found in blocked set in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_distinct_values_to_be_in_set":
        _assert_col(df, col)
        allowed = set(params.get("value_set", []))
        distinct = set(df[col].dropna().tolist())
        disallowed = distinct - allowed
        ok = len(disallowed) == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Disallowed distinct values in '{col}': {sorted(disallowed)}",
        )

    # ── regex / format ───────────────────────────────────────────────────────
    if exp_type == "expect_column_values_to_match_regex":
        _assert_col(df, col)
        pattern = params.get("regex", "")
        bad = int(df[col].dropna().astype(str).apply(
            lambda v: not re.match(pattern, v)
        ).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values don't match regex '{pattern}' in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_not_match_regex":
        _assert_col(df, col)
        pattern = params.get("regex", "")
        bad = int(df[col].dropna().astype(str).apply(lambda v: bool(re.match(pattern, v))).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values matched forbidden regex '{pattern}' in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_be_json_parseable":
        _assert_col(df, col)
        def _is_json_parseable(value: Any) -> bool:
            try:
                json.loads(str(value))
                return True
            except Exception:
                return False
        bad = int(df[col].dropna().astype(str).apply(lambda v: not _is_json_parseable(v)).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values are not valid JSON in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_match_strftime_format":
        _assert_col(df, col)
        fmt = params.get("strftime_format", "%Y-%m-%d")
        def _matches(value: Any) -> bool:
            try:
                datetime.strptime(str(value), fmt)
                return True
            except Exception:
                return False
        bad = int(df[col].dropna().apply(lambda v: not _matches(v)).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values do not match format '{fmt}' in '{col}'" if not ok else None,
        )

    # ── length ───────────────────────────────────────────────────────────────
    if exp_type == "expect_column_value_lengths_to_be_between":
        _assert_col(df, col)
        lo = params.get("min_value", 0)
        hi = params.get("max_value")
        lengths = df[col].dropna().astype(str).str.len()
        bad = int((lengths < lo).sum() + ((lengths > hi).sum() if hi is not None else 0))
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} values with length outside [{lo}, {hi}] in '{col}'" if not ok else None,
        )

    # ── type ─────────────────────────────────────────────────────────────────
    if exp_type == "expect_column_values_to_be_of_type":
        _assert_col(df, col)
        expected_type = params.get("type_list", [params.get("type", "object")])[0]
        actual = str(df[col].dtype)
        ok = expected_type.lower() in actual.lower()
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"Column '{col}' is {actual}, expected {expected_type}" if not ok else None,
        )

    if exp_type == "expect_column_values_to_be_increasing":
        _assert_col(df, col)
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        bad = int((series.diff() < 0).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} decreases found in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_values_to_be_decreasing":
        _assert_col(df, col)
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        bad = int((series.diff() > 0).sum())
        ok = bad == 0
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=f"{bad} increases found in '{col}'" if not ok else None,
        )

    if exp_type == "expect_column_mean_to_be_between":
        _assert_col(df, col)
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        value = float(series.mean()) if len(series) > 0 else float('nan')
        lo = params.get("min_value")
        hi = params.get("max_value")
        ok = (lo is None or value >= lo) and (hi is None or value <= hi)
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Mean {value} outside [{lo}, {hi}] for '{col}'",
        )

    if exp_type == "expect_column_median_to_be_between":
        _assert_col(df, col)
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        value = float(series.median()) if len(series) > 0 else float('nan')
        lo = params.get("min_value")
        hi = params.get("max_value")
        ok = (lo is None or value >= lo) and (hi is None or value <= hi)
        return CheckResult(
            check_name=name,
            outcome="pass" if ok else "fail",
            message=None if ok else f"Median {value} outside [{lo}, {hi}] for '{col}'",
        )

    if exp_type == "expect_column_pair_values_to_be_equal":
        col_a = params.get("column_A")
        col_b = params.get("column_B")
        _assert_col(df, col_a)
        _assert_col(df, col_b)
        bad = int((df[col_a] != df[col_b]).fillna(False).sum())
        ok = bad == 0
        return CheckResult(
            check_name=f"{exp_type}({col_a},{col_b})",
            outcome="pass" if ok else "fail",
            message=f"{bad} mismatched pairs between '{col_a}' and '{col_b}'" if not ok else None,
        )

    # ── unknown ───────────────────────────────────────────────────────────────
    return CheckResult(
        check_name=name,
        outcome="fail",
        message=f"Unknown expectation type: '{exp_type}'",
    )


def _assert_col(df: pd.DataFrame, col: Optional[str]):
    if not col:
        raise ValueError("Expectation requires a 'column' field")
    if col not in df.columns:
        raise ValueError(f"Column '{col}' not found in dataset (available: {list(df.columns)})")
