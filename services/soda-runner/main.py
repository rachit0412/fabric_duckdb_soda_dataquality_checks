"""
Soda Core Runner — standalone microservice.
Receives a data source + SodaCL YAML, executes checks, returns results.

POST /execute   — run a Soda scan
GET  /health    — liveness probe
"""

import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soda-runner")

app = FastAPI(title="Soda Core Runner", version="1.0.0")

_TEMP = Path(tempfile.gettempdir()) / "soda_runner"
_TEMP.mkdir(parents=True, exist_ok=True)


# ── models ────────────────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    run_id: str
    connection_type: str          # csv | parquet | postgres
    remote_url: str               # file path or connection string
    dataset_identifier: str       # table/view name Soda should scan
    checks_yaml: str              # raw SodaCL YAML string


class CheckResult(BaseModel):
    check_name: str
    outcome: str                  # pass | fail | warn
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
    return {"status": "ok", "service": "soda-runner"}


# ── execution ──────────────────────────────────────────────────────────────────

@app.post("/execute", response_model=ExecuteResponse)
def execute(req: ExecuteRequest):
    """Run a Soda scan and return structured results."""
    logger.info(f"[{req.run_id}] Executing Soda scan on {req.dataset_identifier}")
    try:
        results = _run_scan(req)
        return ExecuteResponse(
            run_id=req.run_id,
            success=True,
            execution_mode="soda",
            summary={
                "total":  len(results),
                "passed": sum(1 for r in results if r.outcome == "pass"),
                "failed": sum(1 for r in results if r.outcome == "fail"),
            },
            results=results,
        )
    except Exception as exc:
        logger.error(f"[{req.run_id}] Soda scan failed: {exc}", exc_info=True)
        return ExecuteResponse(
            run_id=req.run_id,
            success=False,
            execution_mode="soda",
            summary={"total": 0, "passed": 0, "failed": 0},
            results=[CheckResult(check_name="execution_error", outcome="fail", message=str(exc))],
            error=str(exc),
        )


# ── internals ──────────────────────────────────────────────────────────────────

def _quote(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _run_scan(req: ExecuteRequest) -> List[CheckResult]:
    checks_path = _TEMP / f"checks_{req.run_id}.yml"
    config_path = _TEMP / f"config_{req.run_id}.yml"

    checks_path.write_text(req.checks_yaml, encoding="utf-8")

    try:
        from soda.scan import Scan

        scan = Scan()

        if req.connection_type in {"csv", "parquet"}:
            conn = duckdb.connect(":memory:")
            table = _quote(req.dataset_identifier or "data")
            path_escaped = req.remote_url.replace("'", "''")
            if req.connection_type == "csv":
                conn.execute(
                    f"CREATE OR REPLACE TABLE {table} AS "
                    f"SELECT * FROM read_csv_auto('{path_escaped}', HEADER=TRUE, SAMPLE_SIZE=-1)"
                )
            else:
                conn.execute(
                    f"CREATE OR REPLACE TABLE {table} AS SELECT * FROM read_parquet('{path_escaped}')"
                )
            scan.add_duckdb_connection(conn)
            scan.set_data_source_name("duckdb")
        else:
            # postgres / other — write a minimal config yaml
            config_path.write_text(_pg_config(req.remote_url), encoding="utf-8")
            scan.add_configuration_yaml_file(str(config_path))
            scan.set_data_source_name("data")

        scan.add_sodacl_yaml_files(str(checks_path))
        scan.execute()

        raw = scan.get_scan_results() or {}
        results = []
        for chk in raw.get("checks", []):
            outcome_str = str(chk.get("outcome", "")).lower()
            outcome = "pass" if outcome_str in {"pass", "passed"} else (
                "warn" if outcome_str in {"warn", "warned", "warning"} else "fail"
            )
            diagnostic_value = chk.get("diagnostics", {}).get("value")
            raw_message = diagnostic_value if diagnostic_value not in {None, ""} else chk.get("message")
            results.append(CheckResult(
                check_name=chk.get("name", "unknown"),
                outcome=outcome,
                message=str(raw_message) if raw_message not in {None, ""} else None,
                details={
                    "metrics":      chk.get("metrics"),
                    "diagnostics":  chk.get("diagnostics", {}),
                    "table":        chk.get("table"),
                    "column":       chk.get("column"),
                },
            ))
        return results

    finally:
        checks_path.unlink(missing_ok=True)
        config_path.unlink(missing_ok=True)


def _pg_config(dsn: str) -> str:
    """Minimal Soda postgres config from a connection string."""
    import os
    return f"""data_source data:
  type: postgres
  host: {os.getenv('SODA_PG_HOST', 'postgres')}
  port: {os.getenv('SODA_PG_PORT', '5432')}
  username: {os.getenv('SODA_PG_USER', 'postgres')}
  password: {os.getenv('SODA_PG_PASSWORD', '')}
  database: {os.getenv('SODA_PG_DB', 'data_quality')}
"""
