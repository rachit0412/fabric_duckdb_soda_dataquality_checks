from collections import OrderedDict
from pathlib import Path
from typing import Optional

import yaml

from src.api.models import CheckLibraryResponse, CheckTemplate, CheckTemplateParameter


def _param(
    key: str,
    label: str,
    input_type: str,
    *,
    required: bool = True,
    placeholder: Optional[str] = None,
    default: Optional[str] = None,
    options: Optional[list[str]] = None,
) -> CheckTemplateParameter:
    return CheckTemplateParameter(
        key=key,
        label=label,
        input_type=input_type,
        required=required,
        placeholder=placeholder,
        default=default,
        options=options,
    )


CHECK_TEMPLATES: list[CheckTemplate] = [
    CheckTemplate(
        id='soda_row_count_nonzero',
        name='Table has rows',
        description='Fail if the dataset is empty.',
        category='Table health',
        engine='soda',
        scope='table',
        template='- row_count > 0',
        preview='checks for data:\n  - row_count > 0',
    ),
    CheckTemplate(
        id='soda_row_count_between',
        name='Row count between bounds',
        description='Keep row counts within an expected operating range.',
        category='Table health',
        engine='soda',
        scope='table',
        template='- row_count between {{min_rows}} and {{max_rows}}',
        preview='checks for data:\n  - row_count between 100 and 100000',
        parameters=[
            _param('min_rows', 'Min rows', 'number', default='100'),
            _param('max_rows', 'Max rows', 'number', default='100000'),
        ],
    ),
    CheckTemplate(
        id='soda_missing_count_zero',
        name='Column is never null',
        description='Standard completeness rule for required columns.',
        category='Completeness',
        engine='soda',
        scope='column',
        template='- missing_count({{column}}) = 0',
        preview='checks for data:\n  - missing_count(customer_id) = 0',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='soda_duplicate_count_zero',
        name='Column is unique',
        description='Detect duplicate values in keys or identifiers.',
        category='Uniqueness',
        engine='soda',
        scope='column',
        template='- duplicate_count({{column}}) = 0',
        preview='checks for data:\n  - duplicate_count(customer_id) = 0',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='soda_numeric_range',
        name='Numeric values in range',
        description='Use Soda validity rules to keep numeric values inside a min/max band.',
        category='Validity',
        engine='soda',
        scope='column',
        template='- invalid_count({{column}}) = 0:\n    valid min: {{min_value}}\n    valid max: {{max_value}}',
        preview='checks for data:\n  - invalid_count(age) = 0:\n      valid min: 0\n      valid max: 150',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_value', 'Min value', 'number', default='0'),
            _param('max_value', 'Max value', 'number', default='100'),
        ],
    ),
    CheckTemplate(
        id='soda_valid_values',
        name='Column values from list',
        description='Restrict a column to a known set of business-valid values.',
        category='Validity',
        engine='soda',
        scope='column',
        template='- invalid_count({{column}}) = 0:\n    valid values: {{value_set}}',
        preview='checks for data:\n  - invalid_count(status) = 0:\n      valid values: [active, inactive]',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('value_set', 'Allowed values', 'list', placeholder='active, inactive'),
        ],
    ),
    CheckTemplate(
        id='soda_min_value',
        name='Column minimum threshold',
        description='Ensure the observed minimum never drops below a threshold.',
        category='Numeric',
        engine='soda',
        scope='column',
        template='- min({{column}}) >= {{min_value}}',
        preview='checks for data:\n  - min(order_total) >= 0',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_value', 'Minimum allowed', 'number', default='0'),
        ],
    ),
    CheckTemplate(
        id='soda_max_value',
        name='Column maximum threshold',
        description='Ensure the observed maximum never exceeds a threshold.',
        category='Numeric',
        engine='soda',
        scope='column',
        template='- max({{column}}) <= {{max_value}}',
        preview='checks for data:\n  - max(order_total) <= 10000',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('max_value', 'Maximum allowed', 'number', default='10000'),
        ],
    ),
    CheckTemplate(
        id='soda_avg_between',
        name='Column average between bounds',
        description='Watch aggregate drift for numeric columns.',
        category='Numeric',
        engine='soda',
        scope='column',
        template='- avg({{column}}) between {{min_avg}} and {{max_avg}}',
        preview='checks for data:\n  - avg(amount) between 10 and 100',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_avg', 'Min average', 'number', default='10'),
            _param('max_avg', 'Max average', 'number', default='100'),
        ],
    ),
    CheckTemplate(
        id='soda_max_length',
        name='Maximum text length',
        description='Cap text length for codes, IDs, or normalized strings.',
        category='Format',
        engine='soda',
        scope='column',
        template='- max_length({{column}}) <= {{max_length}}',
        preview='checks for data:\n  - max_length(country_code) <= 3',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('max_length', 'Maximum length', 'number', default='255'),
        ],
    ),
    CheckTemplate(
        id='soda_freshness',
        name='Freshness under threshold',
        description='Keep timestamp columns within an acceptable recency window.',
        category='Freshness',
        engine='soda',
        scope='column',
        template='- freshness({{column}}) < {{freshness_limit}}',
        preview='checks for data:\n  - freshness(updated_at) < 24h',
        parameters=[
            _param('column', 'Timestamp column', 'column'),
            _param('freshness_limit', 'Max age', 'text', default='24h', placeholder='24h'),
        ],
    ),
    CheckTemplate(
        id='soda_missing_percent_below',
        name='Missing percent below threshold',
        description='Track null-ratio drift for partially optional columns.',
        category='Completeness',
        engine='soda',
        scope='column',
        template='- missing_percent({{column}}) < {{max_missing_percent}}',
        preview='checks for data:\n  - missing_percent(email) < 5',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('max_missing_percent', 'Max missing %', 'number', default='5'),
        ],
    ),
    CheckTemplate(
        id='soda_forbidden_values',
        name='Column excludes blocked values',
        description='Detect values that should never appear in a column.',
        category='Validity',
        engine='soda',
        scope='column',
        template='- invalid_count({{column}}) = 0:\n    invalid values: {{value_set}}',
        preview='checks for data:\n  - invalid_count(status) = 0:\n      invalid values: [deleted, unknown]',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('value_set', 'Blocked values', 'list', placeholder='deleted, unknown'),
        ],
    ),
    CheckTemplate(
        id='soda_regex_validity',
        name='Column matches regex',
        description='Validate field format patterns like email, country code, or SKU.',
        category='Format',
        engine='soda',
        scope='column',
        template='- invalid_count({{column}}) = 0:\n    valid regex: {{regex}}',
        preview='checks for data:\n  - invalid_count(email) = 0:\n      valid regex: "^[\\\\w\\\\.-]+@[\\\\w\\\\.-]+\\\\.\\\\w+$"',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('regex', 'Regex', 'text', placeholder='^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$'),
        ],
    ),
    CheckTemplate(
        id='soda_no_invalid_count',
        name='Invalid count below threshold',
        description='Allow a small number of invalid rows in noisy pipelines.',
        category='Validity',
        engine='soda',
        scope='column',
        template='- invalid_count({{column}}) <= {{max_invalid}}',
        preview='checks for data:\n  - invalid_count(zip_code) <= 10',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('max_invalid', 'Max invalid rows', 'number', default='0'),
        ],
    ),
    CheckTemplate(
        id='soda_sum_between',
        name='Column sum between bounds',
        description='Catch spikes or drops in total amount-like columns.',
        category='Numeric',
        engine='soda',
        scope='column',
        template='- sum({{column}}) between {{min_sum}} and {{max_sum}}',
        preview='checks for data:\n  - sum(amount) between 1000 and 500000',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_sum', 'Min sum', 'number', default='1000'),
            _param('max_sum', 'Max sum', 'number', default='500000'),
        ],
    ),
    CheckTemplate(
        id='soda_stddev_below',
        name='Column stddev below threshold',
        description='Use dispersion limits to detect distribution anomalies.',
        category='Distribution',
        engine='soda',
        scope='column',
        template='- stddev({{column}}) <= {{max_stddev}}',
        preview='checks for data:\n  - stddev(amount) <= 2500',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('max_stddev', 'Max stddev', 'number', default='2500'),
        ],
    ),
    CheckTemplate(
        id='soda_schema_required_column',
        name='Required column exists',
        description='Fail when a required column disappears.',
        category='Schema',
        engine='soda',
        scope='table',
        template='- schema:\n    fail:\n      when required column missing: [{{column}}]',
        preview='checks for data:\n  - schema:\n      fail:\n        when required column missing: [customer_id]',
        parameters=[_param('column', 'Required column', 'text', placeholder='customer_id')],
    ),
    CheckTemplate(
        id='soda_schema_type',
        name='Column has expected SQL type',
        description='Protect contracts by enforcing expected column types.',
        category='Schema',
        engine='soda',
        scope='table',
        template='- schema:\n    fail:\n      when wrong column type:\n        {{column}}: {{expected_type}}',
        preview='checks for data:\n  - schema:\n      fail:\n        when wrong column type:\n          age: INTEGER',
        parameters=[
            _param('column', 'Column', 'text', placeholder='age'),
            _param('expected_type', 'Expected SQL type', 'text', default='INTEGER', placeholder='INTEGER'),
        ],
    ),
    CheckTemplate(
        id='soda_failed_rows_count',
        name='Custom failed rows threshold',
        description='Apply a SQL predicate and alert on failing-row volume.',
        category='Comparison',
        engine='soda',
        scope='table',
        template='- failed rows:\n    name: {{check_name}}\n    fail query: |\n      SELECT * FROM {{table_name}} WHERE {{predicate}}\n    fail: when > {{max_rows}}',
        preview='checks for data:\n  - failed rows:\n      name: invalid_age\n      fail query: |\n        SELECT * FROM data WHERE age < 0\n      fail: when > 0',
        parameters=[
            _param('check_name', 'Check name', 'text', default='custom_failed_rows', placeholder='invalid_age'),
            _param('table_name', 'Table name', 'text', default='data', placeholder='data'),
            _param('predicate', 'SQL predicate', 'text', placeholder='age < 0'),
            _param('max_rows', 'Max failing rows', 'number', default='0'),
        ],
    ),
    CheckTemplate(
        id='ge_table_column_count_between',
        name='Table column count between bounds',
        description='Guard against sudden schema expansion or shrinkage.',
        category='Table health',
        engine='great_expectations',
        scope='table',
        template='- type: expect_table_column_count_to_be_between\n  min_value: {{min_columns}}\n  max_value: {{max_columns}}',
        preview='expectations for data:\n  - type: expect_table_column_count_to_be_between\n    min_value: 5\n    max_value: 200',
        parameters=[
            _param('min_columns', 'Min columns', 'number', default='1'),
            _param('max_columns', 'Max columns', 'number', default='200'),
        ],
    ),
    CheckTemplate(
        id='ge_columns_match_set',
        name='Table columns match expected set',
        description='Require an exact unordered set of columns.',
        category='Schema',
        engine='great_expectations',
        scope='table',
        template='- type: expect_table_columns_to_match_set\n  column_set: {{column_set}}',
        preview='expectations for data:\n  - type: expect_table_columns_to_match_set\n    column_set: [id, amount, created_at]',
        parameters=[_param('column_set', 'Column set', 'list', placeholder='id, amount, created_at')],
    ),
    CheckTemplate(
        id='ge_column_exists',
        name='Column exists',
        description='Fail when a required column is missing.',
        category='Schema',
        engine='great_expectations',
        scope='table',
        template='- type: expect_column_to_exist\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_to_exist\n    column: customer_id',
        parameters=[_param('column', 'Column', 'text', placeholder='customer_id')],
    ),
    CheckTemplate(
        id='ge_not_in_set',
        name='Column values not in blocked set',
        description='Reject known bad values like placeholders or deleted markers.',
        category='Validity',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_not_be_in_set\n  column: {{column}}\n  value_set: {{value_set}}',
        preview='expectations for data:\n  - type: expect_column_values_to_not_be_in_set\n    column: status\n    value_set: [deleted, unknown]',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('value_set', 'Blocked values', 'list', placeholder='deleted, unknown'),
        ],
    ),
    CheckTemplate(
        id='ge_not_match_regex',
        name='Column does not match regex',
        description='Detect values that should never match a forbidden pattern.',
        category='Format',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_not_match_regex\n  column: {{column}}\n  regex: {{regex}}',
        preview='expectations for data:\n  - type: expect_column_values_to_not_match_regex\n    column: email\n    regex: "^test@"',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('regex', 'Regex', 'text', placeholder='^test@'),
        ],
    ),
    CheckTemplate(
        id='ge_values_increasing',
        name='Column values are increasing',
        description='Enforce monotonic increase for sequence-like columns.',
        category='Comparison',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_increasing\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_increasing\n    column: event_time',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='ge_values_decreasing',
        name='Column values are decreasing',
        description='Enforce monotonic decrease where required.',
        category='Comparison',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_decreasing\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_decreasing\n    column: rank',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='ge_json_parseable',
        name='Column values are JSON parseable',
        description='Validate JSON text payload columns.',
        category='Format',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_json_parseable\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_json_parseable\n    column: payload',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='ge_strftime_format',
        name='Column matches datetime format',
        description='Ensure values follow a required datetime pattern.',
        category='Format',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_match_strftime_format\n  column: {{column}}\n  strftime_format: {{strftime_format}}',
        preview='expectations for data:\n  - type: expect_column_values_to_match_strftime_format\n    column: created_at\n    strftime_format: "%Y-%m-%d"',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('strftime_format', 'Datetime format', 'text', default='%Y-%m-%d', placeholder='%Y-%m-%d'),
        ],
    ),
    CheckTemplate(
        id='ge_distinct_values_in_set',
        name='Distinct values are in set',
        description='Ensure all distinct values belong to an approved list.',
        category='Validity',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_distinct_values_to_be_in_set\n  column: {{column}}\n  value_set: {{value_set}}',
        preview='expectations for data:\n  - type: expect_column_distinct_values_to_be_in_set\n    column: country\n    value_set: [US, CA, GB]',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('value_set', 'Allowed distinct values', 'list', placeholder='US, CA, GB'),
        ],
    ),
    CheckTemplate(
        id='ge_mean_between',
        name='Column mean between bounds',
        description='Detect shifts in average values.',
        category='Numeric',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_mean_to_be_between\n  column: {{column}}\n  min_value: {{min_value}}\n  max_value: {{max_value}}',
        preview='expectations for data:\n  - type: expect_column_mean_to_be_between\n    column: amount\n    min_value: 5\n    max_value: 500',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_value', 'Min mean', 'number', default='0'),
            _param('max_value', 'Max mean', 'number', default='1000'),
        ],
    ),
    CheckTemplate(
        id='ge_median_between',
        name='Column median between bounds',
        description='Detect median drift independent of outliers.',
        category='Numeric',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_median_to_be_between\n  column: {{column}}\n  min_value: {{min_value}}\n  max_value: {{max_value}}',
        preview='expectations for data:\n  - type: expect_column_median_to_be_between\n    column: amount\n    min_value: 5\n    max_value: 500',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_value', 'Min median', 'number', default='0'),
            _param('max_value', 'Max median', 'number', default='1000'),
        ],
    ),
    CheckTemplate(
        id='ge_column_pair_equal',
        name='Column A equals column B',
        description='Validate mirrored values across two related columns.',
        category='Comparison',
        engine='great_expectations',
        scope='pair',
        template='- type: expect_column_pair_values_to_be_equal\n  column_A: {{column_a}}\n  column_B: {{column_b}}',
        preview='expectations for data:\n  - type: expect_column_pair_values_to_be_equal\n    column_A: state_code\n    column_B: shipping_state_code',
        parameters=[
            _param('column_a', 'Column A', 'column'),
            _param('column_b', 'Column B', 'column'),
        ],
    ),
    CheckTemplate(
        id='ge_row_count_between',
        name='Table row count between bounds',
        description='Great Expectations table-size guardrail.',
        category='Table health',
        engine='great_expectations',
        scope='table',
        template='- type: expect_table_row_count_to_be_between\n  min_value: {{min_rows}}\n  max_value: {{max_rows}}',
        preview='expectations for data:\n  - type: expect_table_row_count_to_be_between\n    min_value: 100\n    max_value: 100000',
        parameters=[
            _param('min_rows', 'Min rows', 'number', default='100'),
            _param('max_rows', 'Max rows', 'number', default='100000'),
        ],
    ),
    CheckTemplate(
        id='ge_not_null',
        name='Column values not null',
        description='Classic completeness expectation.',
        category='Completeness',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_not_be_null\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_values_to_not_be_null\n    column: customer_id',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='ge_unique',
        name='Column values unique',
        description='Ensure identifier columns have no duplicates.',
        category='Uniqueness',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_unique\n  column: {{column}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_unique\n    column: customer_id',
        parameters=[_param('column', 'Column', 'column')],
    ),
    CheckTemplate(
        id='ge_between',
        name='Column values between bounds',
        description='Numeric range expectation for measures like age, score, or amount.',
        category='Validity',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_between\n  column: {{column}}\n  min_value: {{min_value}}\n  max_value: {{max_value}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_between\n    column: age\n    min_value: 0\n    max_value: 150',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_value', 'Min value', 'number', default='0'),
            _param('max_value', 'Max value', 'number', default='100'),
        ],
    ),
    CheckTemplate(
        id='ge_in_set',
        name='Column values in allowed set',
        description='Use a curated value set for status, country, or category fields.',
        category='Validity',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_in_set\n  column: {{column}}\n  value_set: {{value_set}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_in_set\n    column: status\n    value_set: [active, inactive]',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('value_set', 'Allowed values', 'list', placeholder='active, inactive'),
        ],
    ),
    CheckTemplate(
        id='ge_regex',
        name='Column matches regex',
        description='Validate email, code, or identifier formats with a regex.',
        category='Format',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_match_regex\n  column: {{column}}\n  regex: {{regex}}',
        preview='expectations for data:\n  - type: expect_column_values_to_match_regex\n    column: email\n    regex: ^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('regex', 'Regex', 'text', placeholder='^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$'),
        ],
    ),
    CheckTemplate(
        id='ge_length_between',
        name='Value length between bounds',
        description='Check string lengths for standardized text fields.',
        category='Format',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_value_lengths_to_be_between\n  column: {{column}}\n  min_value: {{min_length}}\n  max_value: {{max_length}}',
        preview='expectations for data:\n  - type: expect_column_value_lengths_to_be_between\n    column: country_code\n    min_value: 2\n    max_value: 3',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('min_length', 'Min length', 'number', default='1'),
            _param('max_length', 'Max length', 'number', default='255'),
        ],
    ),
    CheckTemplate(
        id='ge_type',
        name='Column has expected type',
        description='Ensure a column resolves to the intended data type.',
        category='Schema',
        engine='great_expectations',
        scope='column',
        template='- type: expect_column_values_to_be_of_type\n  column: {{column}}\n  type: {{expected_type}}',
        preview='expectations for data:\n  - type: expect_column_values_to_be_of_type\n    column: age\n    type: int64',
        parameters=[
            _param('column', 'Column', 'column'),
            _param('expected_type', 'Expected type', 'select', default='string', options=['string', 'int64', 'float64', 'bool', 'datetime64[ns]']),
        ],
    ),
    CheckTemplate(
        id='ge_pair_greater_than',
        name='Column A greater than column B',
        description='Cross-column chronology or amount comparison rule.',
        category='Comparison',
        engine='great_expectations',
        scope='pair',
        template='- type: expect_column_pair_values_A_to_be_greater_than_B\n  column_A: {{column_a}}\n  column_B: {{column_b}}',
        preview='expectations for data:\n  - type: expect_column_pair_values_A_to_be_greater_than_B\n    column_A: shipped_at\n    column_B: created_at',
        parameters=[
            _param('column_a', 'Column A', 'column'),
            _param('column_b', 'Column B', 'column'),
        ],
    ),
]


def _load_external_templates() -> list[CheckTemplate]:
    """Load optional user-provided catalog entries from YAML.

    The first existing file is used:
    - soda_duckdb/check_library_extra.yml
    - backend/src/services/check_library_extra.yml
    """
    candidates = [
        Path(__file__).resolve().parents[2] / 'soda_duckdb' / 'check_library_extra.yml',
        Path(__file__).resolve().parent / 'check_library_extra.yml',
    ]

    for catalog_path in candidates:
        if not catalog_path.exists():
            continue

        try:
            payload = yaml.safe_load(catalog_path.read_text(encoding='utf-8')) or {}
        except Exception:
            continue

        raw_templates = payload.get('templates') if isinstance(payload, dict) else None
        if not isinstance(raw_templates, list):
            continue

        parsed: list[CheckTemplate] = []
        for raw in raw_templates:
            if not isinstance(raw, dict):
                continue
            try:
                parsed.append(CheckTemplate(**raw))
            except Exception:
                continue

        if parsed:
            return parsed

    return []


def get_check_library(engine: Optional[str] = None) -> CheckLibraryResponse:
    all_templates = [*CHECK_TEMPLATES, *_load_external_templates()]

    selected_templates = [
        template
        for template in all_templates
        if not engine or engine == 'all' or template.engine == engine
    ]

    categories: OrderedDict[str, list[CheckTemplate]] = OrderedDict()
    for template in selected_templates:
        categories.setdefault(template.category, []).append(template)

    return CheckLibraryResponse(categories=categories)