# PHASE 2: Edge Case Matrix - Exhaustive Test Catalog

**Date Started:** 2026-04-03  
**Objective:** Build comprehensive edge case scenarios across 9 dimensions  
**Total Tests to Create:** 100+ scenarios

---

## Overview: 9 Dimensions of Edge Cases

This matrix catalogs every edge case scenario to ensure complete coverage of:
1. **Authentication & Authorization** (8 scenarios)
2. **Multi-Tenancy & Data Isolation** (7 scenarios)
3. **Data Quality Edge Cases** (18 scenarios)
4. **UI State Management** (12 scenarios)
5. **API Behavior & Responses** (15 scenarios)
6. **Concurrency & Race Conditions** (8 scenarios)
7. **Resilience & Fault Tolerance** (10 scenarios)
8. **Security Vulnerabilities** (12 scenarios)
9. **Accessibility & UX** (10 scenarios)

**Total: 100+ test scenarios**

---

## 1️⃣ Authentication & Authorization (8 scenarios)

### 1.1 Unauthenticated Access
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **No Auth Token** | GET /api/v1/connections/ without token | 401 Unauthorized | Unit | HIGH |
| **Expired Token** | Use outdated JWT | 401 Unauthorized + clear message | Unit | HIGH |
| **Malformed Token** | Send garbage in Authorization header | 401 Invalid token | Unit | HIGH |
| **Wrong Token Type** | Send "Basic" instead of "Bearer" | 401 Invalid format | Unit | MEDIUM |

### 1.2 Authorization Failures
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Insufficient Role** | Admin endpoint with user role | 403 Forbidden | Unit | HIGH |
| **Wrong Tenant ID** | Access data from different tenant | 403 Forbidden | Unit | HIGH |
| **Deleted User** | Auth with deactivated account | 401 User not found | Unit | MEDIUM |
| **Expired Session** | Session timeout after inactivity | 401 Session expired + clear error | Integration | MEDIUM |

### Test File Location
```
tests/test_auth_scenarios.py (NEW)
- test_no_auth_token()
- test_expired_token()
- test_malformed_token()
- test_wrong_token_type()
- test_insufficient_role()
- test_wrong_tenant_access()
- test_deleted_user_auth()
- test_expired_session()
```

---

## 2️⃣ Multi-Tenancy & Data Isolation (7 scenarios)

### 2.1 Tenant Data Isolation
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Cross-Tenant Query** | Query tenant_id=X with auth for Y | 403 Forbidden, return empty | Unit | HIGH |
| **Null Tenant ID** | POST without tenant_id field | 400 Bad Request | Unit | HIGH |
| **Missing Tenant Header** | Request without X-Tenant-ID header | 400 Missing header | Unit | HIGH |
| **Tenant Param Not Validated** | URL traversal: /tenant/../../admin | 400 Invalid tenant | Unit | HIGH |

### 2.2 Multi-Tenant Data Conflicts
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Same Connection Name** | Two tenants create connection with same name | Both created, separately isolated | Integration | MEDIUM |
| **Shared Connection Attempt** | Tenant A tries to add connection from B | 403 Forbidden | Integration | MEDIUM |
| **Orphaned Metadata** | Tenant deleted but metadata exists | Cleanup or error handling clear | Integration | MEDIUM |

### Test File Location
```
tests/test_multitenant_scenarios.py (NEW)
- test_cross_tenant_query()
- test_null_tenant_id()
- test_missing_tenant_header()
- test_tenant_param_traversal()
- test_same_connection_names()
- test_shared_connection_access()
- test_orphaned_metadata_handling()
```

---

## 3️⃣ Data Quality Edge Cases (18 scenarios)

### 3.1 Empty & Missing Data
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Empty CSV File** | Upload CSV with headers only, 0 rows | Handled gracefully, 0 row count | E2E | HIGH |
| **Empty String Values** | All columns contain "" | Treated as valid non-NULL | Unit | HIGH |
| **NULL All Columns** | Every cell is NULL | 0% data quality, clear report | Unit | HIGH |
| **Missing Headers** | CSV with data but no header row | Error or auto-generate headers | Unit | MEDIUM |
| **Incomplete Row** | Last row has fewer columns | Error or pad with NULL | Unit | MEDIUM |

### 3.2 All-NULL Columns
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **100% NULL Column** | Profile column where all values NULL | Stats: min=NULL, max=NULL, count=0 valid | Unit | HIGH |
| **All False Boolean** | Boolean column all FALSE | valid_count=rows, invalid=0 | Unit | MEDIUM |
| **All Empty Strings** | String column all "" | Distinct count=1, NULL count=0 | Unit | MEDIUM |

### 3.3 Type Mismatches
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **String in Numeric** | "abc" in INT column | Error or coerce, clear validation | Unit | HIGH |
| **Date Format Mismatch** | "13/32/2025" in DATE column | Parse error, suggest format | Unit | HIGH |
| **Mixed Types** | Column has "123", "1e4", "abc" | Type inference handles variety | Unit | MEDIUM |
| **Boolean Variations** | Values: True, "true", 1, "YES" | Recognized as same logical type | Unit | MEDIUM |

### 3.4 Extreme Values
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Very Large Numbers** | INT: 2^63-1, 2^64 | Handled without overflow | Unit | MEDIUM |
| **Very Small Numbers** | FLOAT: 1e-300 | Precision preserved | Unit | MEDIUM |
| **Very Long Strings** | 1MB+ string in cell | Processed, not truncated silently | Unit | MEDIUM |
| **Unicode & Special Chars** | Emoji, CJK, RTL text | Preserved correctly, sorted OK | Unit | MEDIUM |

### 3.5 Boundary Conditions
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Date Boundaries** | 1900-01-01, 2099-12-31, etc. | Handled correctly, no Y2K issues | Unit | LOW |
| **Timezone Edge Cases** | DST transitions, UTC±12:00 | Normalized correctly | Unit | LOW |
| **Duplicate Values** | 50% of rows identical | Duplicate detection works | Unit | MEDIUM |

### 3.6 Large Datasets
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **1M rows** | Process 1M row dataset | Complete < 10s, memory bounded | Performance | MEDIUM |
| **10K columns** | Dataset with 10K columns | Handled, displays sample | Performance | LOW |
| **Partial Load** | Interrupt mid-scan | Graceful partial results | Integration | MEDIUM |

### Test File Location
```
tests/test_data_quality_scenarios.py (NEW)
- test_empty_csv_file()
- test_empty_string_values()
- test_null_all_columns()
- test_missing_headers()
- test_incomplete_row()
- test_100_percent_null_column()
- test_all_false_boolean()
- test_all_empty_strings()
- test_string_in_numeric_column()
- test_date_format_mismatch()
- test_mixed_types()
- test_boolean_variations()
- test_very_large_numbers()
- test_very_small_numbers()
- test_very_long_strings()
- test_unicode_special_chars()
- test_date_boundaries()
- test_timezone_edge_cases()
- test_duplicate_values()
- test_1m_row_dataset()
- test_10k_column_dataset()
- test_partial_load_interruption()
```

---

## 4️⃣ UI State Management (12 scenarios)

### 4.1 Empty & Error States
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Empty Check List** | Connection with 0 suggested checks | "No checks available" message | E2E | HIGH |
| **No Columns** | Metadata with columns=[] | Step 3 disabled or "No columns" | E2E | HIGH |
| **Error on Profile** | Profile endpoint returns 500 | Error banner, retry button visible | E2E | HIGH |
| **Failed Suggestion** | Suggestion engine unhealthy | Graceful degradation, offline mode | E2E | MEDIUM |

### 4.2 Loading & Async States
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Slow Profile (5s)** | Profile takes 5 seconds | Loading spinner shown, not frozen | E2E | MEDIUM |
| **Double Click Submit** | Click "Generate Suggestions" twice | Idempotent: only 1 request | E2E | HIGH |
| **Rapid Navigation** | Click Step 3 → 4 → 3 → 4 | Last navigation wins, no crashes | E2E | MEDIUM |
| **Back/Forward Browser** | Use browser back/forward buttons | State preserved, no infinite loops | E2E | MEDIUM |

### 4.3 Cache & Stale Data
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Stale Metadata** | Cache 5min old metadata, then refresh | Shows "stale" warning or auto-refresh | E2E | MEDIUM |
| **Cache Invalidation** | Delete connection, re-upload with same name | New data, not served from cache | E2E | MEDIUM |
| **localStorage Corruption** | localStorage contains invalid JSON | Graceful clear and reset | E2E | MEDIUM |

### Test File Location
```
tests/e2e/test_ui_state_scenarios.spec.ts (NEW)
- test_empty_check_list()
- test_no_columns_state()
- test_error_on_profile()
- test_failed_suggestion_graceful()
- test_slow_profile_loading_spinner()
- test_double_click_submit_idempotent()
- test_rapid_navigation()
- test_back_forward_browser()
- test_stale_metadata_warning()
- test_cache_invalidation()
- test_localstorage_corruption_recovery()
```

---

## 5️⃣ API Behavior & Responses (15 scenarios)

### 5.1 Response Format Variations
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Empty List vs Null** | GET /connections when none exist | Return {"connections": [], "total": 0}, NOT null | Unit | HIGH |
| **200 Empty vs 204** | DELETE successful connection | Return 200 with {}, NOT 204 | Unit | MEDIUM |
| **Pagination Missing** | GET /results without ?page=1 | Default to page 1, include total_pages | Unit | MEDIUM |
| **Invalid Pagination** | GET /results?page=999999 | 400 Bad Request, not 200 empty | Unit | MEDIUM |

### 5.2 Error Responses
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Missing Required Field** | POST check without "name" field | 400 Bad Request, field listed in error | Unit | HIGH |
| **Invalid Enum Value** | status="PENDING" (vs "pending") | 400 Bad Request, valid values listed | Unit | MEDIUM |
| **Type Mismatch** | POST with body {"row_count": "text"} not number | 400 Bad Request, type described | Unit | MEDIUM |
| **Array vs Object** | POST body ["item"] vs {"item": []} | 400 Bad Request, correct format shown | Unit | MEDIUM |

### 5.3 Malformed Requests
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Broken JSON** | POST body: {invalid json} | 400 Bad Request, parse error details | Unit | HIGH |
| **Oversized Body** | POST 100MB body | 413 Payload Too Large | Unit | MEDIUM |
| **Invalid Content-Type** | POST JSON with Content-Type=text/plain | 400 Unsupported Media Type | Unit | MEDIUM |
| **Binary in JSON** | POST with binary data in field | 400 Bad Request, decode error | Unit | MEDIUM |

### 5.4 Filtering & Searching
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Filter by Nonexistent Field** | GET /results?status=NONEXISTENT_STATUS | Empty list or error (consistent) | Unit | MEDIUM |
| **Case-Sensitive Filter** | GET /results?name=Test (vs test) | Filter behavior documented & consistent | Unit | MEDIUM |

### Test File Location
```
tests/test_api_behavior_scenarios.py (NEW)
- test_empty_list_not_null()
- test_delete_returns_200_not_204()
- test_pagination_defaults()
- test_invalid_pagination()
- test_missing_required_field()
- test_invalid_enum_value()
- test_type_mismatch()
- test_array_vs_object()
- test_broken_json()
- test_oversized_body()
- test_invalid_content_type()
- test_binary_in_json()
- test_filter_nonexistent_field()
- test_case_sensitive_filter()
```

---

## 6️⃣ Concurrency & Race Conditions (8 scenarios)

### 6.1 Simultaneous Requests
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Double Submit Same Data** | 2 identical POST /check-plans simultaneously | Only 1 created or clear error | Integration | HIGH |
| **Create-Delete Race** | Create connection, delete before list completes | List shows deleted (eventual consistency) | Integration | HIGH |
| **Concurrent Scans** | Start 2 scans on same data simultaneously | Both complete, no corruption | Integration | MEDIUM |
| **Retry Storm** | Client retries same request 10x/sec | Server throttles gracefully, 429 after N | Integration | MEDIUM |

### 6.2 Idempotency
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Idempotent Key** | POST with Idempotency-Key header twice | Second returns cached result, 200 | Unit | MEDIUM |
| **Duplicate Submission** | Submit same form twice quickly | Server deduplicates, clear feedback | Integration | MEDIUM |

### 6.3 Cancellation & Interruption
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Cancel In-Flight Request** | Start scan, abort mid-way | Cleanup performed, no orphaned records | Integration | MEDIUM |
| **Queue Delays** | 100 scans in queue, monitor response time | P95 latency < 5s, clear position | Performance | LOW |

### Test File Location
```
tests/test_concurrency_scenarios.py (NEW)
- test_double_submit_same_data()
- test_create_delete_race()
- test_concurrent_scans()
- test_retry_storm()
- test_idempotent_key()
- test_duplicate_submission_deduplication()
- test_cancel_inflight_request()
- test_queue_delays()
```

---

## 7️⃣ Resilience & Fault Tolerance (10 scenarios)

### 7.1 Service Unavailability
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Database Unavailable** | Stop PostgreSQL during operation | Graceful error, not 500 | Integration | HIGH |
| **API Server Restart** | Kill API mid-request | Client retries automatically | Integration | HIGH |
| **Partial Outage** | 1/3 APIs down (metadata, not suggestions) | Degrade gracefully, show what's available | Integration | MEDIUM |
| **Cascading Failure** | Chain: DB down → API errors → UI hangs | Circuit breaker prevents cascade | Integration | MEDIUM |

### 7.2 Network Issues
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **High Latency** | 30s latency on profile endpoint | Timeout after 30s, retry shown | Integration | MEDIUM |
| **Packet Loss** | Lose 10% of packets | Exponential backoff, eventual success | Integration | MEDIUM |
| **Connection Timeout** | TCP never completes | Fail fast < 5s, show error | Integration | MEDIUM |
| **DNS Resolution Failure** | Invalid hostname in config | Clear hostname/DNS error, not generic | Integration | MEDIUM |

### 7.3 Data Corruption & Recovery
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Corrupt Metadata Record** | Manually corrupt DB record | Graceful error, recovery path offered | Integration | LOW |
| **Incomplete Transaction** | Interrupt mid-scan, DB half-written | Rollback or clear state, no inconsistency | Integration | MEDIUM |

### Test File Location
```
tests/test_resilience_scenarios.py (NEW)
- test_database_unavailable()
- test_api_server_restart()
- test_partial_outage()
- test_cascading_failure()
- test_high_latency()
- test_packet_loss()
- test_connection_timeout()
- test_dns_resolution_failure()
- test_corrupt_metadata_recovery()
- test_incomplete_transaction_rollback()
```

---

## 8️⃣ Security Vulnerabilities (12 scenarios)

### 8.1 Injection Attacks
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **SQL Injection in Name** | POST connection name: `'; DROP TABLE;--` | Escaped safely, stored as literal | Security | HIGH |
| **XSS in Description** | POST check description: `<img src=x onerror=alert()>` | Escaped in HTML, rendered as text | Security | HIGH |
| **Command Injection** | File path: `../../etc/passwd` | Normalized, rejected if path traversal | Security | HIGH |
| **LDAP Injection** | Username: `*)(uid=*` | Escaped, no tree traversal | Security | MEDIUM |

### 8.2 Access Control
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **IDOR: Predictable IDs** | User A accesses /results/1, tries /results/2 | 403 if not owned by user A | Security | HIGH |
| **Direct Object Reference** | Guess connection_id, access without auth | 403 Forbidden, even if guess correct | Security | HIGH |
| **Parameter Tampering** | Change user_id in POST body | Server ignores, uses authenticated user | Security | HIGH |

### 8.3 Information Disclosure
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Verbose Error Messages** | Trigger 500 error | Generic message, no stack traces | Security | MEDIUM |
| **Sensitive in Logs** | Check if password logged | Not present in logs (check /logs) | Security | HIGH |
| **API Response Leaks** | Check GET /results for user PII | No sensitive data in responses | Security | MEDIUM |
| **Headers Expose Version** | Check response for Server/X-Version headers | Minimal or absent | Security | LOW |

### 8.4 File Upload Security
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Oversized File** | Upload 1GB CSV | 413 Payload Too Large | Security | MEDIUM |
| **Malicious File Extension** | Upload .exe disguised as .csv | Rejected or sandboxed | Security | HIGH |

### Test File Location
```
tests/test_security_scenarios.py (NEW)
- test_sql_injection_in_name()
- test_xss_in_description()
- test_command_injection_path_traversal()
- test_ldap_injection()
- test_idor_predictable_ids()
- test_direct_object_reference()
- test_parameter_tampering()
- test_verbose_error_messages()
- test_sensitive_in_logs()
- test_api_response_leaks()
- test_headers_expose_version()
- test_oversized_file_upload()
- test_malicious_file_extension()
```

---

## 9️⃣ Accessibility & UX (10 scenarios)

### 9.1 Keyboard Navigation
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Tab Order** | Navigate entire Step 3 with Tab only | Logical order, no invisible focus | A11y | MEDIUM |
| **Escape Key** | Press Escape in modal | Modal closes cleanly | A11y | MEDIUM |
| **Enter Key** | Submit form with Enter, not just mouse | Form submits successfully | A11y | MEDIUM |
| **Arrow Keys** | Navigate dropdown with arrow keys | Focus moves correctly | A11y | MEDIUM |

### 9.2 Focus & Visual Indicators
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Focus Ring Visible** | Tab to button | Clear focus ring visible | A11y | MEDIUM |
| **Focus Not Lost** | Click outside then Tab | Focus resumes logically | A11y | MEDIUM |
| **Error Focus** | Form validation fails | Focus moves to first error | A11y | MEDIUM |

### 9.3 Screen Reader & Labels
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Unlabeled Inputs** | Check inputs with screen reader | All have aria-label or <label> | A11y | MEDIUM |
| **Icon-Only Buttons** | Check button with only icon | aria-label present | A11y | MEDIUM |
| **Dynamic Content** | Add check to list, screen reader announces | aria-live region announces change | A11y | MEDIUM |

### 9.4 Long Content & Responsiveness
| Scenario | Steps | Expected | Test Type | Priority |
|----------|-------|----------|-----------|----------|
| **Very Long Column Name** | Column name 500 chars | Truncated with ellipsis or wraps | UX | LOW |
| **Mobile Screen Width** | 320px width viewport | Layout not broken, readable | Responsive | MEDIUM |
| **Zoom 200%** | Browser zoom 200% | Content readable, no UI clipping | UX | MEDIUM |

### Test File Location
```
tests/e2e/test_accessibility_scenarios.spec.ts (NEW)
- test_keyboard_tab_order()
- test_escape_key_closes_modal()
- test_enter_key_submits_form()
- test_arrow_keys_navigate_dropdown()
- test_focus_ring_visible()
- test_focus_not_lost()
- test_error_focus_moves_to_error()
- test_unlabeled_inputs()
- test_icon_only_buttons()
- test_dynamic_content_announces()
- test_very_long_column_name()
- test_mobile_screen_width()
- test_zoom_200_percent()
```

---

## 📋 Test Execution Plan

### Phase 2A: Setup (2-3 hours)
1. Create test fixtures & helpers
2. Set up test data factories
3. Create mock servers for failure scenarios
4. Organize test structure

### Phase 2B: Implement High-Priority Tests (4-6 hours)
**HIGH Priority Scenarios (38 total):**
- All Authentication tests (8)
- All Tenant Isolation tests (7)
- Core Data Quality tests (8)
- UI Empty/Error States (3)
- API response format validation (3)
- Concurrency double-submit (2)
- Database unavailable (1)
- Injection attacks (3)
- IDOR vulnerabilities (3)
- Keyboard/A11y basics (1)

### Phase 2C: Implement Medium-Priority Tests (6-8 hours)
**MEDIUM Priority Scenarios (54 total):** Data quality edge cases, async states, caching, pagination, timeouts, etc.

### Phase 2D: Implement Low-Priority Tests (2-3 hours)
**LOW Priority Scenarios (8 total):** Date boundaries, large datasets, zoom responsiveness, etc.

---

## 🎯 Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| **Coverage** | 100+ edge case scenarios | Count: 100+ test methods |
| **Pass Rate** | ≥95% (allow 5% for known issues) | All tests pass or marked xfail |
| **Determinism** | 100% (run 3x, all pass) | No flaky tests |
| **Execution Time** | <10 minutes for full suite | pytest | tee report.txt |
| **Documentation** | Every test documented | Docstring + Jira link |
| **Coverage Report** | ≥85% code coverage | pytest --cov=src --cov-report=html |

---

## 📁 Test File Structure

```
tests/
├── test_auth_scenarios.py           (NEW - 8 tests)
├── test_multitenant_scenarios.py    (NEW - 7 tests)
├── test_data_quality_scenarios.py   (NEW - 18 tests)
├── test_api_behavior_scenarios.py   (NEW - 14 tests)
├── test_concurrency_scenarios.py    (NEW - 8 tests)
├── test_resilience_scenarios.py     (NEW - 10 tests)
├── test_security_scenarios.py       (NEW - 12 tests)
├── e2e/
│   ├── test_ui_state_scenarios.spec.ts    (NEW - 11 tests)
│   ├── test_accessibility_scenarios.spec.ts (NEW - 13 tests)
└── fixtures/
    ├── auth_fixtures.py             (NEW - test users, tokens, tenants)
    ├── data_fixtures.py             (NEW - test datasets, large data)
    ├── mock_services.py             (NEW - mock API, DB failures)
    └── factories.py                 (NEW - test data factories)
```

---

## 🔄 Dependencies & Fixtures Needed

### Python Unit Test Fixtures
```python
# fixtures/auth_fixtures.py
@pytest.fixture def valid_token(): ...
@pytest.fixture def expired_token(): ...
@pytest.fixture def user_object(): ...
@pytest.fixture def admin_user(): ...
@pytest.fixture def cross_tenant_user(): ...

# fixtures/data_fixtures.py
@pytest.fixture def empty_dataframe(): ...
@pytest.fixture def all_null_dataframe(): ...
@pytest.fixture def large_1m_row_dataframe(): ...
@pytest.fixture def unicode_dataframe(): ...

# fixtures/mock_services.py
@pytest.fixture def mock_db_unavailable(): ...
@pytest.fixture def mock_slow_api(monkeypatch): ...
@pytest.fixture def mock_network_failure(): ...
```

### Playwright E2E Fixtures
```typescript
// fixtures/test-setup.ts
import { test as base } from '@playwright/test';
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => { ... },
  slowPage: async ({ page }, use) => { ... },
  accessiblePage: async ({ page }, use) => { ... },
});
```

---

## 📊 Test Inventory Summary

| Dimension | Scenarios | Unit | E2E | Security |
|-----------|-----------|------|-----|----------|
| 1. Auth | 8 | 6 | 2 | 0 |
| 2. Tenant | 7 | 5 | 2 | 2 |
| 3. Data Quality | 18 | 18 | 0 | 0 |
| 4. UI State | 12 | 0 | 12 | 0 |
| 5. API Behavior | 14 | 14 | 0 | 0 |
| 6. Concurrency | 8 | 2 | 6 | 0 |
| 7. Resilience | 10 | 2 | 8 | 0 |
| 8. Security | 12 | 4 | 1 | 7 |
| 9. Accessibility | 13 | 0 | 13 | 0 |
| **TOTAL** | **102** | **51** | **44** | **9** |

**Unit Tests:** 51  
**E2E Tests:** 44  
**Security Tests:** 9 (overlap)

---

## 🚀 Next Steps

1. ✅ Finalize edge case matrix (this document)
2. 🔜 Create test fixtures & helpers
3. 🔜 Implement HIGH-priority tests (38 scenarios)
4. 🔜 Implement MEDIUM-priority tests (54 scenarios)
5. 🔜 Implement LOW-priority tests (8 scenarios)
6. 🔜 Run full suite: validate 100% pass
7. 🔜 Generate coverage report: ≥85%
8. 🔜 Proceed to PHASE 3: Playwright Framework enhancement

---

**Status:** Ready to implement  
**Estimated Duration:** 12-18 hours total (can be parallelized)  
**Target Completion:** Within next session

