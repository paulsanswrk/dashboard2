-- ============================================
-- Chart Data Cache Schema
-- Tables for caching chart query results with intelligent invalidation
-- ============================================

-- ============================================
-- Chart Table Dependencies
-- Tracks which tables each chart queries
-- ============================================
CREATE TABLE IF NOT EXISTS public.chart_table_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id bigint NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  schema_name text DEFAULT 'optiqoflow',
  dependency_type text DEFAULT 'query',  -- 'query', 'join', 'subquery'
  created_at timestamptz DEFAULT now(),
  UNIQUE(chart_id, table_name, schema_name)
);

CREATE INDEX IF NOT EXISTS idx_deps_table 
  ON public.chart_table_dependencies(table_name);
CREATE INDEX IF NOT EXISTS idx_deps_chart 
  ON public.chart_table_dependencies(chart_id);
CREATE INDEX IF NOT EXISTS idx_deps_schema_table 
  ON public.chart_table_dependencies(schema_name, table_name);

-- ============================================
-- Chart Data Cache
-- Stores pre-computed chart query results
-- ============================================
CREATE TABLE IF NOT EXISTS public.chart_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id bigint NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  cache_key text NOT NULL,             -- Hash of query parameters + filters
  cached_data jsonb NOT NULL,          -- The actual chart data
  row_count integer,
  
  -- Cache validity
  cached_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,             -- Optional TTL
  is_valid boolean DEFAULT true,
  
  -- Dependencies for invalidation
  source_tables text[] NOT NULL,       -- Tables this cache depends on
  last_data_push_at timestamptz,       -- Timestamp of data used for this cache
  
  -- Metadata
  query_duration_ms integer,
  compressed boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(chart_id, tenant_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_cache_chart_tenant 
  ON public.chart_data_cache(chart_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_cache_valid 
  ON public.chart_data_cache(is_valid) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_cache_tables 
  ON public.chart_data_cache USING GIN(source_tables);
CREATE INDEX IF NOT EXISTS idx_cache_tenant 
  ON public.chart_data_cache(tenant_id);

-- ============================================
-- Add columns to charts table for cache optimization
-- ============================================
ALTER TABLE public.charts 
ADD COLUMN IF NOT EXISTS has_dynamic_filter boolean DEFAULT false;

ALTER TABLE public.charts 
ADD COLUMN IF NOT EXISTS cache_status text DEFAULT 'unknown';

-- Add check constraint for cache_status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'charts_cache_status_check'
  ) THEN
    ALTER TABLE public.charts 
    ADD CONSTRAINT charts_cache_status_check 
    CHECK (cache_status IN ('cached', 'stale', 'dynamic', 'unknown'));
  END IF;
END $$;

-- ============================================
-- Add dynamic_columns to dashboards table
-- ============================================
ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS dynamic_columns jsonb DEFAULT '[]';

-- ============================================
-- Function to invalidate cache for specific tables
-- Called when data is pushed via webhook
-- Skips MySQL permanent cache entries (marked with _mysql_permanent)
-- ============================================
CREATE OR REPLACE FUNCTION public.invalidate_chart_cache_for_tables(
  p_tenant_id uuid,
  p_table_names text[]
)
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Mark cache entries as invalid (skip MySQL permanent cache)
  UPDATE public.chart_data_cache
  SET is_valid = false, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND is_valid = true
    AND source_tables && p_table_names
    AND NOT ('_mysql_permanent' = ANY(source_tables));
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Update chart cache_status to 'stale'
  UPDATE public.charts c
  SET cache_status = 'stale'
  FROM public.chart_table_dependencies d
  WHERE c.id = d.chart_id
    AND d.table_name = ANY(p_table_names)
    AND c.cache_status = 'cached';
  
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to clean up old cache entries
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_chart_cache()
RETURNS void AS $$
BEGIN
  -- Delete invalid cache entries older than 7 days
  DELETE FROM public.chart_data_cache
  WHERE is_valid = false 
    AND updated_at < NOW() - INTERVAL '7 days';
  
  -- Delete expired cache entries
  DELETE FROM public.chart_data_cache
  WHERE valid_until IS NOT NULL 
    AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql;
