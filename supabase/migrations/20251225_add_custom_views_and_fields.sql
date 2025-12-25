-- Add custom views column (stores SQL-based virtual tables)
-- Structure: [{ id, name, sql, columns: [{name, type}...] }]
ALTER TABLE data_connections
    ADD COLUMN IF NOT EXISTS custom_views JSONB DEFAULT '[]'::jsonb;

-- Add custom fields column (stores calculated and merged fields)
-- Structure: [{ id, name, type: 'calculated'|'merged', formula?, sourceFields?, joinType?, resultType? }]
ALTER TABLE data_connections
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_data_connections_custom_views
    ON data_connections USING GIN (custom_views);

CREATE INDEX IF NOT EXISTS idx_data_connections_custom_fields
    ON data_connections USING GIN (custom_fields);
