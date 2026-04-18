export interface Connection {
  id: string;
  name: string;
  connection_type: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  warehouse?: string;
  account?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetadataProfile {
  connection_id: string;
  table_name: string;
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
  created_at: string;
}

export interface ColumnProfile {
  name: string;
  data_type: string;
  null_count: number;
  null_percentage: number;
  unique_count?: number;
  min_value?: any;
  max_value?: any;
  avg_value?: number;
}

export interface CheckSuggestion {
  check_type: string;
  column: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  rationale: string;
}

export interface CheckPlan {
  id: string;
  name: string;
  connection_id: string;
  table_name: string;
  checks: Check[];
  schedule?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Check {
  check_type: string;
  column: string;
  parameters?: Record<string, any>;
  severity: string;
}

export interface Run {
  id: string;
  check_plan_id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'warning';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
}

export interface CheckResult {
  id: string;
  run_id: string;
  check_type: string;
  column: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
  actual_value?: any;
  expected_value?: any;
  created_at: string;
}
