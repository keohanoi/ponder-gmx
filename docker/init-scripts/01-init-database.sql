-- GMX Indexer Database Initialization Script
-- This script sets up the database with proper extensions and initial configuration

-- First ensure the database exists (it should be created by POSTGRES_DB env var)
-- Connect to the GMX indexer database
\c gmx_indexer;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS gmx;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Set search path to include GMX schema
ALTER DATABASE gmx_indexer SET search_path TO public, gmx;

-- Create monitoring user for metrics collection
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitoring') THEN
        CREATE ROLE monitoring WITH LOGIN PASSWORD 'monitoring_password_change_me';
    END IF;
END
$$;

-- Grant necessary permissions to monitoring user
GRANT CONNECT ON DATABASE gmx_indexer TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT USAGE ON SCHEMA gmx TO monitoring;
GRANT USAGE ON SCHEMA analytics TO monitoring;
GRANT USAGE ON SCHEMA monitoring TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA gmx TO monitoring;

-- Create function to grant select on future tables
CREATE OR REPLACE FUNCTION grant_select_on_new_tables()
RETURNS event_trigger AS $$
DECLARE
    obj record;
    table_name text;
BEGIN
    IF tg_tag = 'CREATE TABLE' THEN
        FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
        LOOP
            IF obj.object_type = 'table' THEN
                -- Safely get the table name and handle schema qualification
                BEGIN
                    table_name := obj.objid::regclass::text;
                    -- Only grant if the table exists (avoid race conditions)
                    IF EXISTS (SELECT 1 FROM information_schema.tables
                              WHERE table_name = split_part(table_name, '.', 2)
                              AND table_schema = split_part(table_name, '.', 1)) THEN
                        EXECUTE format('GRANT SELECT ON TABLE %I TO monitoring', table_name);
                    END IF;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- Log the error but don't fail the transaction
                        RAISE NOTICE 'Failed to grant permissions on table %: %', table_name, SQLERRM;
                END;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger for automatic permissions
DROP EVENT TRIGGER IF EXISTS grant_select_trigger;
CREATE EVENT TRIGGER grant_select_trigger
    ON ddl_command_end
    WHEN tag IN ('CREATE TABLE')
    EXECUTE FUNCTION grant_select_on_new_tables();

-- Create performance monitoring views
CREATE OR REPLACE VIEW monitoring.table_stats AS
SELECT
    schemaname,
    relname as tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

CREATE OR REPLACE VIEW monitoring.index_usage AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Create indexes optimization view
CREATE OR REPLACE VIEW monitoring.missing_indexes AS
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Set up connection pooling recommendations
CREATE OR REPLACE VIEW monitoring.connection_stats AS
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Create maintenance procedures
CREATE OR REPLACE FUNCTION analytics.update_statistics()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE;

    -- Log maintenance activity
    INSERT INTO monitoring.maintenance_log (activity, executed_at)
    VALUES ('ANALYZE completed', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS monitoring.maintenance_log (
    id SERIAL PRIMARY KEY,
    activity TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to clean old maintenance logs
CREATE OR REPLACE FUNCTION monitoring.cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM monitoring.maintenance_log
    WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Set up default database settings optimized for indexing
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Configure auto-explain for slow queries
ALTER SYSTEM SET auto_explain.log_min_duration = '1s';
ALTER SYSTEM SET auto_explain.log_analyze = true;
ALTER SYSTEM SET auto_explain.log_verbose = true;

COMMENT ON DATABASE gmx_indexer IS 'GMX Protocol v2 indexer database optimized for blockchain event processing';
COMMENT ON SCHEMA gmx IS 'GMX protocol specific tables and views';
COMMENT ON SCHEMA analytics IS 'Analytics and reporting functions';
COMMENT ON SCHEMA monitoring IS 'Database monitoring and performance views';