-- ============================================
-- Multi-Tenant Data Architecture: Tenants Schema
-- Creates schema and tables for tenant data isolation
-- ============================================

-- Create tenants schema (survives optiqoflow recreation)
CREATE SCHEMA IF NOT EXISTS tenants;

-- Grant permissions
GRANT USAGE ON SCHEMA tenants TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA tenants TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenants GRANT ALL ON TABLES TO anon;

GRANT USAGE ON SCHEMA tenants TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA tenants TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenants GRANT ALL ON TABLES TO authenticated;

GRANT USAGE ON SCHEMA tenants TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA tenants TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenants GRANT ALL ON TABLES TO service_role;

-- ============================================
-- Tenant Column Access Tracking
-- Tracks which columns each tenant has access to per table
-- ============================================
CREATE TABLE IF NOT EXISTS tenants.tenant_column_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  table_name text NOT NULL,
  columns text[] NOT NULL,           -- Array of column names synced for this tenant
  last_push_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_column_access_tenant 
  ON tenants.tenant_column_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_column_access_table 
  ON tenants.tenant_column_access(table_name);

-- ============================================
-- Tenant Data Push Log
-- Logs data pushes for cache invalidation timing
-- ============================================
CREATE TABLE IF NOT EXISTS tenants.tenant_data_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  push_id uuid NOT NULL,              -- Unique ID for this push (from webhook)
  affected_tables text[] NOT NULL,    -- Tables that received data in this push
  pushed_at timestamptz NOT NULL,
  record_counts jsonb DEFAULT '{}',   -- {table_name: count}
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_log_tenant_time 
  ON tenants.tenant_data_push_log(tenant_id, pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_log_tables 
  ON tenants.tenant_data_push_log USING GIN(affected_tables);
CREATE INDEX IF NOT EXISTS idx_push_log_push_id 
  ON tenants.tenant_data_push_log(push_id);

-- ============================================
-- Cleanup old push logs (keep last 30 days)
-- ============================================
CREATE OR REPLACE FUNCTION tenants.cleanup_old_push_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM tenants.tenant_data_push_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
