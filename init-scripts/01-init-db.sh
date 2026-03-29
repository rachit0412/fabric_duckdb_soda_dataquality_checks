#!/bin/bash
# PostgreSQL initialization script
# Automatically runs when database is first created

set -e

echo "=========================================="
echo "Initializing Data Quality Database"
echo "=========================================="

# Create extensions if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension (useful for generating unique IDs)
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Enable pg_stat_statements for query performance monitoring
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    
    -- Log initialization
    SELECT 'Database initialized successfully' AS status;
EOSQL

echo "✅ Database initialization complete!"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"
echo "=========================================="
