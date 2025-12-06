-- GMX Indexer Performance Indexes
-- This script creates optimized indexes for common query patterns

-- Note: Ponder will create the main tables via Drizzle ORM
-- These are additional performance indexes for common query patterns

-- Function to create index if table exists
CREATE OR REPLACE FUNCTION create_index_if_table_exists(
    index_name TEXT,
    table_name TEXT,
    index_definition TEXT
)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $2
    ) THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I %s',
                      index_name, table_name, index_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Wait for Ponder to create tables, then create performance indexes
-- This will be executed after Ponder initializes the database schema

-- Common query pattern indexes that will be created after tables exist:

-- Block-related indexes for time-series queries
SELECT create_index_if_table_exists(
    'idx_blocks_timestamp',
    'blocks',
    '(timestamp DESC)'
);

SELECT create_index_if_table_exists(
    'idx_blocks_number_chain',
    'blocks',
    '(number DESC, chain_id)'
);

-- Transaction and event indexes
SELECT create_index_if_table_exists(
    'idx_transactions_block_timestamp',
    'transactions',
    '(block_timestamp DESC)'
);

SELECT create_index_if_table_exists(
    'idx_transactions_from_to',
    'transactions',
    '(from_address, to_address)'
);

-- Log/Event indexes for filtering
SELECT create_index_if_table_exists(
    'idx_logs_contract_event',
    'logs',
    '(address, topic0)'
);

SELECT create_index_if_table_exists(
    'idx_logs_block_timestamp',
    'logs',
    '(block_timestamp DESC)'
);

-- Account-specific indexes
SELECT create_index_if_table_exists(
    'idx_account_activity_timestamp',
    'account',
    '(last_seen DESC)'
);

-- Position-related indexes
SELECT create_index_if_table_exists(
    'idx_positions_account_status',
    'position',
    '(account, status)'
);

SELECT create_index_if_table_exists(
    'idx_positions_market_timestamp',
    'position',
    '(market, created_at DESC)'
);

-- Order-related indexes
SELECT create_index_if_table_exists(
    'idx_orders_account_status',
    'order',
    '(account, status)'
);

SELECT create_index_if_table_exists(
    'idx_orders_market_type',
    'order',
    '(market, order_type)'
);

-- Event-specific indexes for analytics
SELECT create_index_if_table_exists(
    'idx_swap_events_timestamp',
    'swap_event',
    '(timestamp DESC)'
);

SELECT create_index_if_table_exists(
    'idx_swap_events_tokens',
    'swap_event',
    '(token_in, token_out)'
);

-- Position event indexes
SELECT create_index_if_table_exists(
    'idx_position_events_account_timestamp',
    'position_event',
    '(account, timestamp DESC)'
);

-- Funding rate indexes
SELECT create_index_if_table_exists(
    'idx_funding_rate_market_timestamp',
    'funding_rate',
    '(market, timestamp DESC)'
);

-- Daily stats indexes for reporting
SELECT create_index_if_table_exists(
    'idx_daily_stats_date',
    'daily_stats',
    '(date DESC)'
);

-- Composite indexes for common filter combinations
SELECT create_index_if_table_exists(
    'idx_logs_address_timestamp',
    'logs',
    '(address, block_timestamp DESC)'
);

-- Partial indexes for active records
SELECT create_index_if_table_exists(
    'idx_positions_active',
    'position',
    '(market, size_delta) WHERE status = ''open'''
);

-- GIN indexes for array/JSONB columns if they exist
SELECT create_index_if_table_exists(
    'idx_logs_topics_gin',
    'logs',
    'USING gin(topics)'
);

-- Create function to analyze tables after indexing
CREATE OR REPLACE FUNCTION analyze_indexer_tables()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ANALYZE %I', table_record.table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the analyze function to run
SELECT analyze_indexer_tables();

-- Create maintenance function for reindexing
CREATE OR REPLACE FUNCTION maintenance_reindex_tables()
RETURNS void AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('REINDEX TABLE %I.%I', table_record.schemaname, table_record.tablename);
    END LOOP;

    INSERT INTO monitoring.maintenance_log (activity, executed_at)
    VALUES ('REINDEX completed for all tables', NOW());
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_index_if_table_exists IS 'Helper function to create indexes only if target table exists';
COMMENT ON FUNCTION analyze_indexer_tables IS 'Updates table statistics for all indexer tables';
COMMENT ON FUNCTION maintenance_reindex_tables IS 'Rebuilds all indexes for maintenance';