# Soda Core Integration Guide

## Overview

This document explains how the MVP integrates with **Soda Core** for executing data quality checks. Soda Core is the open-source framework that actually runs the checks; the platform handles check configuration, result normalization, and UI.

---

## 1. SodaCL Template Storage

Templates are stored as YAML files in `backend/src/soda_templates/templates/`. Each template defines:
- Name and category
- Parameter schema
- SodaCL YAML generator template

### Example: Completeness Check

**File:** `backend/src/soda_templates/templates/completeness.yml`

```yaml
name: "Completeness Check - Missing Values"
category: "Completeness"
description: "Verify that a column has no (or minimal) NULL values"
type: "completeness"

parameters:
  column_name:
    type: string
    required: true
    description: "Column to check"
  
  threshold_percent:
    type: float
    required: true
    default: 2.0
    description: "Max % of NULLs allowed (1–100)"
  
  fail_count:
    type: integer
    required: false
    description: "Absolute count of NULLs to fail on (overrides %)"

sodacl_template: |
  checks:
    - name: "{check_name}"
      type: missing_count
      column: {column_name}
      {%- if fail_count %}
      fail: when > {fail_count}
      {%- else %}
      fail: when > {row_count} * {threshold_percent / 100}
      {%- endif %}
```

### Loader & Registry

**File:** `backend/src/soda_templates/base.py`

```python
import yaml
from pathlib import Path
from typing import Dict, Any

class SodaTemplateRegistry:
    """Load and manage SodaCL templates."""
    
    def __init__(self):
        self.templates = {}
        self._load_templates()
    
    def _load_templates(self):
        """Load all YAML templates from templates/ directory."""
        template_dir = Path(__file__).parent / "templates"
        for template_file in template_dir.glob("*.yml"):
            with open(template_file) as f:
                template_data = yaml.safe_load(f)
                template_id = template_file.stem
                self.templates[template_id] = template_data
    
    def get_template(self, template_id: str) -> Dict[str, Any]:
        return self.templates.get(template_id)
    
    def render_check(self, template_id: str, parameters: Dict[str, Any]) -> str:
        """Render SodaCL YAML from template and parameters."""
        template = self.get_template(template_id)
        if not template:
            raise ValueError(f"Unknown template: {template_id}")
        
        # Simple substitution engine (can use Jinja2 for complex logic)
        sodacl = template["sodacl_template"]
        for key, value in parameters.items():
            sodacl = sodacl.replace(f"{{{key}}}", str(value))
        
        return sodacl

# Singleton
template_registry = SodaTemplateRegistry()
```

---

## 2. Generated SodaCL Example

Given a check plan with selections, the platform generates combined SodaCL YAML:

### Input Check Plan
```json
{
  "name": "Daily Customer Checks",
  "checks": [
    {
      "template_id": "completeness-null",
      "columns": ["customer_id"],
      "threshold": 0
    },
    {
      "template_id": "uniqueness-duplicate",
      "columns": ["customer_id"]
    },
    {
      "template_id": "pattern-email",
      "columns": ["email"]
    }
  ],
  "custom_checks_yaml": "checks:\n  - name: email length check\n    type: invalid_count\n    column: email\n    valid_max_length: 100"
}
```

### Generated SodaCL

**File:** Generated at runtime, written to temp file for Soda CLI

```yaml
configuration:
  data_source: postgres_prod

checks:
  # Generated from templates
  - name: "customer_id is not null"
    type: missing_count
    column: customer_id
    fail: when > 0

  - name: "customer_id is unique"
    type: duplicate_count
    column: customer_id
    fail: when > 0

  - name: "email format validation"
    type: invalid_count
    column: email
    valid_regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    fail: when > 0

  # Custom checks (user-provided)
  - name: "email length check"
    type: invalid_count
    column: email
    valid_max_length: 100
```

---

## 3. Check Execution Flow

### Step 1: Generate SodaCL

```python
def generate_sodacl(check_plan: CheckPlan, metadata: MetadataSnapshot) -> str:
    """Compose all checks into single SodaCL YAML."""
    
    sodacl = "configuration:\n  data_source: postgres_prod\n\nchecks:\n"
    
    # Render template-based checks
    for check_selection in check_plan.checks:
        template_id = check_selection["template_id"]
        parameters = check_selection.get("parameters", {})
        
        rendered = template_registry.render_check(template_id, parameters)
        sodacl += f"\n{rendered}\n"
    
    # Append custom checks
    if check_plan.custom_checks_yaml:
        sodacl += f"\n# Custom checks\n{check_plan.custom_checks_yaml}\n"
    
    return sodacl
```

### Step 2: Run Soda Core

```python
import subprocess
import tempfile
import json
from pathlib import Path

class SodaExecutor:
    def __init__(self, connection_config: Dict[str, str]):
        self.connection_config = connection_config
    
    async def run_checks(self, sodacl_yaml: str, dataset_identifier: str) -> Dict[str, Any]:
        """Execute Soda Core on generated SodaCL."""
        
        # 1. Write SodaCL to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            f.write(sodacl_yaml)
            sodacl_file = f.name
        
        # 2. Write connection config to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            f.write(self._render_soda_config())
            config_file = f.name
        
        try:
            # 3. Run Soda CLI
            result = subprocess.run(
                [
                    "soda",
                    "scan",
                    "-d", dataset_identifier,
                    "-c", config_file,
                    sodacl_file
                ],
                capture_output=True,
                timeout=self.timeout_seconds,
                text=True
            )
            
            # 4. Parse output (Soda generates JSON + CLI output)
            # For MVP: parse CLI stdout/stderr
            # Phase 2: use Soda Python SDK directly for better output parsing
            
            return self._parse_soda_output(result.stdout, result.stderr)
        
        finally:
            # Cleanup
            Path(sodacl_file).unlink()
            Path(config_file).unlink()
    
    def _render_soda_config(self) -> str:
        """Generate Soda configuration YAML."""
        return f"""
data_sources:
  postgres_prod:
    type: postgres
    host: {self.connection_config['host']}
    port: {self.connection_config['port']}
    username: {self.connection_config['username']}
    password: {self.connection_config['password']}
    database: {self.connection_config['database']}
"""
    
    def _parse_soda_output(self, stdout: str, stderr: str) -> Dict[str, Any]:
        """Parse Soda CLI output into normalized result format."""
        # Parse CLI output to extract:
        # - Check status (passed, warned, failed)
        # - Metrics (if available)
        # - Error messages
        
        results = {
            "checks": [],
            "summary": {
                "passed": 0,
                "warned": 0,
                "failed": 0,
                "errored": 0
            }
        }
        
        # TODO: Implement parser for Soda CLI output
        # For MVP: parse text output
        # For Phase 2: use Soda SDK to get structured results
        
        return results
```

### Step 3: Normalize Results

```python
class ResultNormalizer:
    """Convert Soda output to platform result schema."""
    
    @staticmethod
    def normalize(soda_output: Dict[str, Any], run_id: UUID) -> List[CheckResult]:
        """Map Soda results to CheckResult objects."""
        
        results = []
        for soda_check in soda_output["checks"]:
            result = CheckResult(
                run_id=run_id,
                check_name=soda_check["name"],
                check_type=self._infer_check_type(soda_check),
                status=self._map_status(soda_check["status"]),
                metric_name=soda_check.get("metric_name"),
                metric_value=soda_check.get("metric_value"),
                metric_threshold=soda_check.get("threshold"),
                query_used=soda_check.get("query"),
                execution_time_ms=soda_check.get("execution_time_ms"),
                sample_failing_rows=soda_check.get("sample_rows"),
                error_message=soda_check.get("error")
            )
            results.append(result)
        
        return results
    
    @staticmethod
    def _infer_check_type(soda_check: Dict) -> str:
        """Map Soda check type to platform category."""
        check_type = soda_check.get("type", "").lower()
        
        if "missing" in check_type:
            return "Completeness"
        elif "duplicate" in check_type:
            return "Uniqueness"
        elif "invalid" in check_type or "valid" in check_type:
            return "Validity"
        elif "freshness" in check_type or "timestamp" in check_type:
            return "Freshness"
        else:
            return "Other"
```

---

## 4. Custom Check Validation

Before execution, custom checks are validated:

```python
def validate_custom_checks(custom_yaml: str, metadata: MetadataSnapshot) -> List[str]:
    """Validate custom SodaCL before execution.
    
    Returns:
        List of validation errors (empty if valid).
    """
    
    errors = []
    
    try:
        # 1. Parse YAML
        checks_data = yaml.safe_load(custom_yaml)
        if not checks_data or "checks" not in checks_data:
            errors.append("Custom YAML must contain 'checks' key")
            return errors
        
        checks = checks_data["checks"]
        column_names = {col["name"] for col in metadata.schema["columns"]}
        
        # 2. Validate each check
        for check in checks:
            if not isinstance(check, dict):
                errors.append("Each check must be a dictionary")
                continue
            
            # Validate required fields
            if "name" not in check:
                errors.append("Each check must have a 'name' field")
            
            if "type" not in check:
                errors.append(f"Check '{check.get('name')}' must have a 'type' field")
            
            # Validate column references
            for field in ["column", "columns"]:
                if field in check:
                    cols = check[field] if isinstance(check[field], list) else [check[field]]
                    for col in cols:
                        if col not in column_names:
                            errors.append(f"Check '{check.get('name')}': column '{col}' not found in dataset")
            
            # Validate thresholds (warn if unrealistic)
            if "fail" in check:
                # Parse "when > N" syntax
                fail_condition = check["fail"]
                if isinstance(fail_condition, str) and ">" in fail_condition:
                    try:
                        threshold_str = fail_condition.split(">")[1].strip()
                        threshold = float(threshold_str.replace("%", ""))
                        if threshold > metadata.row_count:
                            errors.append(
                                f"Check '{check.get('name')}': threshold {threshold} > row_count {metadata.row_count}"
                            )
                    except:
                        pass  # Can't parse, Soda will validate at runtime
    
    except yaml.YAMLError as e:
        errors.append(f"Invalid YAML syntax: {e}")
    except Exception as e:
        errors.append(f"Validation error: {e}")
    
    return errors
```

---

## 5. Worker Job Processing

The background worker picks up queued jobs and executes them:

```python
class CheckJobProcessor:
    """Process queued check jobs."""
    
    def __init__(self, db_session, timeout_seconds=300):
        self.db = db_session
        self.timeout_seconds = timeout_seconds
    
    async def process_job(self, job: JobQueue):
        """Execute a single check job."""
        
        payload = job.payload
        run_id = payload["run_id"]
        plan_id = payload["check_plan_id"]
        
        run = self.db.query(Run).filter(Run.id == run_id).first()
        plan = self.db.query(CheckPlan).filter(CheckPlan.id == plan_id).first()
        connection = self.db.query(Connection).filter(Connection.id == plan.connection_id).first()
        
        run.status = "running"
        run.started_at = datetime.utcnow()
        self.db.commit()
        
        try:
            # 1. Generate SodaCL
            sodacl = generate_sodacl(plan, metadata)
            
            # 2. Validate custom checks
            validation_errors = validate_custom_checks(plan.custom_checks_yaml or "", metadata)
            if validation_errors:
                run.status = "failed"
                run.error_message = f"Custom check validation failed: {validation_errors}"
                self.db.commit()
                return
            
            # 3. Execute Soda
            executor = SodaExecutor(connection_config)
            soda_output = await executor.run_checks(sodacl, plan.dataset_identifier)
            
            # 4. Normalize results
            check_results = ResultNormalizer.normalize(soda_output, run_id)
            
            # 5. Store results
            for result in check_results:
                self.db.add(result)
            
            # 6. Update run status
            run.status = "succeeded"
            run.completed_at = datetime.utcnow()
            run.total_duration_ms = int((datetime.utcnow() - run.started_at).total_seconds() * 1000)
            run.pass_count = sum(1 for r in check_results if r.status == "passed")
            run.fail_count = sum(1 for r in check_results if r.status == "failed")
            run.warn_count = sum(1 for r in check_results if r.status == "warned")
            run.error_count = sum(1 for r in check_results if r.status == "error")
            
            self.db.commit()
        
        except asyncio.TimeoutError:
            run.status = "failed"
            run.error_message = f"Execution timeout after {self.timeout_seconds}s"
            self.db.commit()
        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            self.db.commit()
            logger.exception(f"Job processing failed for run {run_id}")
```

---

## 6. Soda Check Types Reference

Common Soda Core check types supported in MVP:

| Check Type | Example | SodaCL |
|-----------|---------|--------|
| Missing Count | NULL values | `type: missing_count` |
| Duplicate Count | Duplicate IDs | `type: duplicate_count` |
| Valid Count | Invalid format | `type: invalid_count` with `valid_regex` or `valid_values` |
| Freshness | Last updated | `type: freshness` with `column` and `max_age` |
| Row Count | Expected # rows | `type: row_count` |
| Schema | Column exists | `type: schema` |

See [Soda Core Checks](https://docs.soda.io/soda-core/checks.html) for full reference.

---

## 7. Limitations & Future Enhancements

### MVP Limitations
- No cross-table joins or multi-dataset checks  
- No custom Python plugins (Soda UDFs)
- Basic result parsing from CLI output (not structured API)
- Single-threaded job execution

### Phase 2+ Enhancements
- Direct Soda Python SDK integration for rich result data
- Support for Soda UDFs (custom Python checks)
- Distributed job execution (Celery + Redis)
- Result aggregation and trend analysis
- Alert/notification integration

---

End of Soda Integration Guide
