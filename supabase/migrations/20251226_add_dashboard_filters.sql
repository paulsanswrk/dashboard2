-- Migration: Add dashboard_filters table for dashboard-level filtering
-- This table stores filter configurations that apply across all charts in a dashboard

CREATE TABLE IF NOT EXISTS dashboard_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    connection_id BIGINT REFERENCES data_connections(id) ON DELETE SET NULL,
    
    -- Field identification
    field_id TEXT NOT NULL,           -- Column name
    field_table TEXT NOT NULL,        -- Table name
    field_type TEXT NOT NULL,         -- Data type: 'text', 'numeric', 'date'
    
    -- Display settings
    filter_name TEXT NOT NULL,        -- Display label
    is_visible BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    
    -- Filter configuration
    filter_mode TEXT NOT NULL DEFAULT 'values', -- 'values', 'text_rule', 'constraint', 'dynamic_range', 'static_period'
    config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Filter-specific configuration
    
    -- Current selection (runtime state)
    current_value JSONB DEFAULT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dashboard_filters_dashboard_id ON dashboard_filters(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_filters_connection_id ON dashboard_filters(connection_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_filters_position ON dashboard_filters(dashboard_id, position);

-- Enable RLS
ALTER TABLE dashboard_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow access if user has access to the dashboard
-- Users can manage filters on dashboards they own or have edit access to
CREATE POLICY "dashboard_filters_access" ON dashboard_filters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboards d
            WHERE d.id = dashboard_filters.dashboard_id
            AND (
                -- User is the creator
                d.creator = auth.uid()
                OR
                -- Dashboard is public
                d.is_public = true
                OR
                -- User has explicit access
                EXISTS (
                    SELECT 1 FROM dashboard_access da
                    WHERE da.dashboard_id = d.id
                    AND (
                        da.target_user_id = auth.uid()
                        OR da.target_org_id IN (
                            SELECT organization_id FROM profiles WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

-- Comment on table
COMMENT ON TABLE dashboard_filters IS 'Stores dashboard-level filter configurations that apply across all charts';
COMMENT ON COLUMN dashboard_filters.filter_mode IS 'Filter mode: values (checkbox list), text_rule (operator+value), constraint (numeric comparison), dynamic_range (relative dates), static_period (fixed date intervals)';
COMMENT ON COLUMN dashboard_filters.config IS 'Filter-specific configuration: for values mode contains available values, for text_rule contains operator and pattern, etc.';
COMMENT ON COLUMN dashboard_filters.current_value IS 'Current filter selection at runtime, null means no filter applied';
