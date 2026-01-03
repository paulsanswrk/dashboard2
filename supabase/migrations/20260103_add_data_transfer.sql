-- Migration: Add data transfer and sync capabilities
-- Description: Creates datasource_sync table and sync_queue for incremental sync

-- Create datasource_sync table (separate from data_connections)
CREATE TABLE IF NOT EXISTS datasource_sync
(
    id                   uuid PRIMARY KEY         DEFAULT gen_random_uuid(),
    connection_id        bigint                                 NOT NULL REFERENCES data_connections (id) ON DELETE CASCADE,
    target_schema_name   text,
    sync_schedule        jsonb,
    last_sync_at         timestamp with time zone,
    next_sync_at         timestamp with time zone,
    sync_status          text                                   NOT NULL DEFAULT 'idle'
        CHECK (sync_status IN ('idle', 'queued', 'syncing', 'completed', 'error')),
    sync_progress        jsonb                    DEFAULT '{}'::jsonb,
    foreign_key_metadata jsonb                    DEFAULT '[]'::jsonb,
    sync_error           text,
    created_at           timestamp with time zone DEFAULT now() NOT NULL,
    updated_at           timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE datasource_sync IS 'Sync configuration and status for data connections transferring to internal storage';
COMMENT ON COLUMN datasource_sync.target_schema_name IS 'UUID-based Postgres schema name for transferred data (e.g., conn_abc123)';
COMMENT ON COLUMN datasource_sync.sync_schedule IS 'JSONB schedule config: {interval, time, timezone, daysOfWeek}';
COMMENT ON COLUMN datasource_sync.sync_status IS 'Current sync status: idle, queued, syncing, completed, error';
COMMENT ON COLUMN datasource_sync.foreign_key_metadata IS 'Array of FK definitions from source DB (not created in Postgres)';

-- Create indexes for datasource_sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_datasource_sync_connection_id ON datasource_sync (connection_id);
CREATE INDEX IF NOT EXISTS idx_datasource_sync_next_sync_at ON datasource_sync (next_sync_at);
CREATE INDEX IF NOT EXISTS idx_datasource_sync_status ON datasource_sync (sync_status);

-- Create sync_queue table for incremental processing
CREATE TABLE IF NOT EXISTS sync_queue
(
    id              uuid PRIMARY KEY         DEFAULT gen_random_uuid(),
    sync_id         uuid                                   NOT NULL REFERENCES datasource_sync (id) ON DELETE CASCADE,
    table_name      text                                   NOT NULL,
    status          text                                   NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    last_row_offset integer                  DEFAULT 0,
    total_rows      integer,
    priority        integer                  DEFAULT 0,
    error           text,
    created_at      timestamp with time zone DEFAULT now() NOT NULL,
    updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE sync_queue IS 'Queue for incremental data transfer processing across cron invocations';
COMMENT ON COLUMN sync_queue.sync_id IS 'Reference to the datasource_sync record';
COMMENT ON COLUMN sync_queue.table_name IS 'Name of the table being transferred';
COMMENT ON COLUMN sync_queue.status IS 'Queue item status: pending, processing, completed, error';
COMMENT ON COLUMN sync_queue.last_row_offset IS 'Last successfully transferred row offset for resumable transfers';

-- Create indexes for sync_queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_sync_id ON sync_queue (sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
    ON sync_queue (priority DESC, created_at ASC)
    WHERE status = 'pending';

-- Grant permissions
GRANT ALL ON datasource_sync TO anon;
GRANT ALL ON datasource_sync TO authenticated;
GRANT ALL ON datasource_sync TO service_role;

GRANT ALL ON sync_queue TO anon;
GRANT ALL ON sync_queue TO authenticated;
GRANT ALL ON sync_queue TO service_role;
