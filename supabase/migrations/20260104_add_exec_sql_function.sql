-- Migration: Add exec_sql function for data transfer schema management
-- This function allows executing arbitrary SQL via the service_role key
-- SECURITY: Only callable by service_role, not accessible via anon or authenticated

-- Create the exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS
$$
DECLARE
    result json;
BEGIN
    -- Execute the query and capture result as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information as JSON
        RETURN json_build_object(
                'error', true,
                'message', SQLERRM,
                'hint', SQLSTATE
               );
END;
$$;

-- Revoke access from public (anon and authenticated)
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;

-- Grant access only to service_role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.exec_sql(text) IS 'Execute arbitrary SQL. Service role only - used for data transfer schema management.';

-- ============================================================
-- Enable RLS on datasource_sync and sync_queue tables
-- ============================================================

-- Enable RLS on datasource_sync
ALTER TABLE public.datasource_sync
    ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role full access on datasource_sync"
    ON public.datasource_sync
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their organization's syncs
CREATE POLICY "Users can view organization datasource_sync"
    ON public.datasource_sync
    FOR SELECT
    TO authenticated
    USING (
    EXISTS (SELECT 1
            FROM public.data_connections dc
            WHERE dc.id = datasource_sync.connection_id
              AND dc.organization_id = (SELECT organization_id
                                        FROM public.profiles
                                        WHERE user_id = auth.uid()))
    );

-- Enable RLS on sync_queue
ALTER TABLE public.sync_queue
    ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access on sync_queue
CREATE POLICY "Service role full access on sync_queue"
    ON public.sync_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their organization's queue items (via datasource_sync)
CREATE POLICY "Users can view organization sync_queue"
    ON public.sync_queue
    FOR SELECT
    TO authenticated
    USING (
    EXISTS (SELECT 1
            FROM public.datasource_sync ds
                     JOIN public.data_connections dc ON dc.id = ds.connection_id
            WHERE ds.id = sync_queue.sync_id
              AND dc.organization_id = (SELECT organization_id
                                        FROM public.profiles
                                        WHERE user_id = auth.uid()))
    );
