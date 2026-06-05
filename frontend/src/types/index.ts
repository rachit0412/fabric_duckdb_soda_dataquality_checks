export interface Connection {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by?: string;
}

export interface MetadataProfile {
  snapshot_id: string;
  connection_id: string;
  schema: {
    columns: ColumnProfile[];
    row_count?: number;
  };
  profile: Record<string, any>;
  profiled_at: string;
}

export interface ColumnProfile {
  name: string;
  type: string;
  nullable?: boolean;
  row_count?: number;
  null_count: number;
  null_percentage?: number;
  distinct_count?: number;
  is_pk?: boolean;
  min?: any;
  max?: any;
  mean?: number;
  stddev?: number;
  min_length?: number;
  max_length?: number;
}

export interface CheckSuggestion {
  id: string;
  rule_id: string;
  check_name: string;
  check_type: string;
  rationale: string;
  confidence: number;
  suggested_check_yaml: string;
}

export interface CheckPlan {
  id: string;
  name: string;
  connection_id: string;
  metadata_snapshot_id?: string;
  dataset_identifier?: string;
  description?: string;
  checks_yaml?: string;
  custom_checks_yaml?: string;
  check_engine?: string;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateCheckPlanPayload {
  name: string;
  metadata_snapshot_id?: string;
  connection_id?: string;
  dataset_identifier?: string;
  description?: string;
  checks_yaml?: string;
  custom_checks_yaml?: string;
  check_engine?: string;
  enabled?: boolean;
}

export interface Run {
  id: string;
  check_plan_id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'warning' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
}

export interface RunStatus {
  id: string;
  check_plan_id: string;
  status: string;
  progress_percent: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface CheckResult {
  check_name: string;
  check_type: string;
  status: string;
  message?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface RunResults {
  run_id: string;
  check_plan_id: string;
  status: string;
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    warning: number;
    pass_rate_percent: number;
  };
  results: CheckResult[];
  created_at: string;
  finished_at?: string;
}

export interface RunMetrics {
  run_id: string;
  status: string;
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    pass_rate: number;
  };
  by_column: Record<string, { quality_score: number; passed: number; failed: number }>;
  by_check_type: Record<string, { passed: number; failed: number }>;
}

export interface TrendDataPoint {
  date: string;
  pass_rate: number;
  passed: number;
  failed: number;
  total: number;
}
