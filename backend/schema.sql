-- Data Quality Platform - PostgreSQL Schema
-- Version: 1.0
-- Run: psql -U postgres -d dq_platform -f schema.sql

-- Extension for UUID support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Connections: Stores encrypted data source credentials
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('postgres', 'bigquery', 'snowflake', 'csv', 'parquet')),
    remote_url TEXT,                      -- JDBC, URI, or file path
    encrypted_secret TEXT,                -- Encrypted connection string (base64 or similar)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT connection_name_unique UNIQUE (name)
);

-- Metadata Snapshots: Versioned schema + profile data
CREATE TABLE metadata_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    dataset_identifier VARCHAR(255) NOT NULL,  -- table name, dataset.table, etc.
    version INT DEFAULT 1,
    schema_json JSONB NOT NULL,            -- Full schema definition
    profile_json JSONB NOT NULL,           -- Column profiling results
    row_count BIGINT,
    profile_duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT meta_version_unique UNIQUE (connection_id, dataset_identifier, version)
);

-- Check Plans: User-defined check configurations
CREATE TABLE check_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    dataset_identifier VARCHAR(255) NOT NULL,
    description TEXT,
    checks_yaml TEXT NOT NULL,            -- Generated/selected SodaCL checks
    custom_checks_yaml TEXT,              -- User-written custom checks
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT plan_name_dataset_unique UNIQUE (connection_id, dataset_identifier, name)
);

-- Check Suggestions: Heuristic suggestions (audit trail)
CREATE TABLE check_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata_snapshot_id UUID NOT NULL REFERENCES metadata_snapshots(id) ON DELETE CASCADE,
    suggestion_set_id UUID,               -- Group suggestions by generation
    rule_id VARCHAR(100) NOT NULL,        -- e.g., 'null_check_for_pk_like'
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50) NOT NULL,      -- Completeness, Uniqueness, Validity, etc.
    rationale TEXT,
    suggested_check_yaml TEXT,
    confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Runs: Execution records
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_plan_id UUID NOT NULL REFERENCES check_plans(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration_ms INT,
    pass_count INT DEFAULT 0,
    warn_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_message TEXT,
    environment VARCHAR(50) DEFAULT 'dev',  -- dev, staging, prod
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check Results: Per-check execution results
CREATE TABLE check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    check_name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50),
    status VARCHAR(50) NOT NULL 
        CHECK (status IN ('passed', 'warned', 'failed', 'error')),
    metric_name VARCHAR(255),
    metric_value FLOAT,
    metric_threshold FLOAT,
    query_used TEXT,                      -- Actual SQL executed
    execution_time_ms INT,
    sample_failing_rows JSONB,            -- Array of failing row samples
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Queue: Simple async job processing
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,               -- Serialized job config
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    worker_id VARCHAR(100),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Audit Logs: Compliance trail of all user actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,        -- create_connection, run_checks, etc.
    resource_type VARCHAR(100),          -- Connection, CheckPlan, Run
    resource_id UUID,
    details JSONB,                        -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_metadata_snapshots_connection ON metadata_snapshots(connection_id);
CREATE INDEX idx_metadata_snapshots_connection_dataset 
    ON metadata_snapshots(connection_id, dataset_identifier);
CREATE INDEX idx_check_plans_connection ON check_plans(connection_id);
CREATE INDEX idx_check_plans_dataset 
    ON check_plans(connection_id, dataset_identifier);
CREATE INDEX idx_check_suggestions_snapshot ON check_suggestions(metadata_snapshot_id);
CREATE INDEX idx_check_suggestions_type ON check_suggestions(check_type);
CREATE INDEX idx_runs_plan ON runs(check_plan_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_check_results_run ON check_results(run_id);
CREATE INDEX idx_check_results_status ON check_results(status);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_run_id ON job_queue(run_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- GRANTS (MVP: single user, can expand for multi-tenant)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
