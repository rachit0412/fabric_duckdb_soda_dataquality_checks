-- Initialize Data Quality Platform Database
-- This script runs automatically when PostgreSQL container starts

-- Create scan_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS scan_results (
    id SERIAL PRIMARY KEY,
    scan_id VARCHAR(100) UNIQUE NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    data_source VARCHAR(255),
    total_checks INTEGER,
    passed_checks INTEGER,
    failed_checks INTEGER,
    warned_checks INTEGER,
    pass_rate DECIMAL(5,2),
    status VARCHAR(50),
    duration_seconds DECIMAL(10,2),
    check_details JSONB,
    anomalies JSONB,
    profile JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scan_results_timestamp ON scan_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_table_name ON scan_results(table_name);
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON TABLE scan_results TO postgres;

SELECT 'Database initialized successfully' AS message;
