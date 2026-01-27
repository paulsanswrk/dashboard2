-- ============================================
-- Tenant Cleanup Function
-- Safely removes all tenant-related objects from dashboard
-- ============================================

-- Main cleanup function
CREATE OR REPLACE FUNCTION tenants.delete_tenant_completely(
    p_tenant_id UUID,
    p_unlink_organizations BOOLEAN DEFAULT TRUE,  -- If TRUE: unlink orgs, if FALSE: delete orgs
    p_delete_optiqoflow_data BOOLEAN DEFAULT FALSE, -- WARNING: Deletes external data
    p_dry_run BOOLEAN DEFAULT TRUE  -- Preview without executing
) RETURNS JSONB AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_role_name TEXT;
    v_result JSONB;
    
    -- Counters
    v_orgs_affected INTEGER := 0;
    v_connections_deleted INTEGER := 0;
    v_charts_deleted INTEGER := 0;
    v_cache_entries_deleted INTEGER := 0;
    v_chart_deps_deleted INTEGER := 0;
    v_views_deleted INTEGER := 0;
    v_column_access_deleted INTEGER := 0;
    v_push_logs_deleted INTEGER := 0;
    v_optiqoflow_tables_affected INTEGER := 0;
    
    v_warnings TEXT[] := ARRAY[]::TEXT[];
    v_org_names TEXT[];
BEGIN
    -- Validate tenant exists
    SELECT short_name INTO v_short_name
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant not found',
            'tenant_id', p_tenant_id
        );
    END IF;
    
    v_schema_name := 'tenant_' || v_short_name;
    v_role_name := 'tenant_' || v_short_name || '_role';
    
    -- ============================================
    -- STEP 1: Count and handle organizations
    -- ============================================
    SELECT COUNT(*), ARRAY_AGG(name)
    INTO v_orgs_affected, v_org_names
    FROM public.organizations
    WHERE tenant_id = p_tenant_id;
    
    IF v_orgs_affected > 0 THEN
        v_warnings := array_append(v_warnings, 
            format('%s organization(s) linked to tenant: %s', 
                v_orgs_affected, 
                array_to_string(v_org_names, ', ')
            )
        );
    END IF;
    
    -- ============================================
    -- STEP 2: Count data connections (via organizations)
    -- ============================================
    SELECT COUNT(*)
    INTO v_connections_deleted
    FROM public.data_connections dc
    WHERE dc.organization_id IN (
        SELECT id FROM public.organizations WHERE tenant_id = p_tenant_id
    );
    
    -- ============================================
    -- STEP 3: Count charts (via connections)
    -- ============================================
    SELECT COUNT(*)
    INTO v_charts_deleted
    FROM public.charts c
    WHERE c.connection_id IN (
        SELECT dc.id FROM public.data_connections dc
        WHERE dc.organization_id IN (
            SELECT o.id FROM public.organizations o WHERE o.tenant_id = p_tenant_id
        )
    );
    
    -- ============================================
    -- STEP 4: Count cache entries and dependencies
    -- ============================================
    SELECT COUNT(*)
    INTO v_cache_entries_deleted
    FROM public.chart_data_cache
    WHERE tenant_id = p_tenant_id;
    
    SELECT COUNT(*)
    INTO v_chart_deps_deleted
    FROM public.chart_table_dependencies
    WHERE chart_id IN (
        SELECT c.id FROM public.charts c
        WHERE c.connection_id IN (
            SELECT dc.id FROM public.data_connections dc
            WHERE dc.organization_id IN (
                SELECT o.id FROM public.organizations o WHERE o.tenant_id = p_tenant_id
            )
        )
    );
    
    -- ============================================
    -- STEP 5: Count views in tenant schema
    -- ============================================
    SELECT COUNT(*)
    INTO v_views_deleted
    FROM pg_views
    WHERE schemaname = v_schema_name;
    
    -- ============================================
    -- STEP 6: Count metadata entries
    -- ============================================
    SELECT COUNT(*)
    INTO v_column_access_deleted
    FROM tenants.tenant_column_access
    WHERE tenant_id = p_tenant_id;
    
    SELECT COUNT(*)
    INTO v_push_logs_deleted
    FROM tenants.tenant_data_push_log
    WHERE tenant_id = p_tenant_id;
    
    -- ============================================
    -- STEP 7: Count optiqoflow data (if requested)
    -- ============================================
    IF p_delete_optiqoflow_data THEN
        -- This is dangerous - count tables with tenant_id data
        -- Note: This is a simplified count, actual implementation would need to check each table
        v_optiqoflow_tables_affected := 1; -- Placeholder
        v_warnings := array_append(v_warnings, 
            'WARNING: Optiqoflow data deletion requested - this will delete external tenant data!'
        );
    END IF;
    
    -- ============================================
    -- If dry-run, return counts without executing
    -- ============================================
    IF p_dry_run THEN
        RETURN jsonb_build_object(
            'success', true,
            'dry_run', true,
            'tenant_id', p_tenant_id,
            'tenant_short_name', v_short_name,
            'deleted', jsonb_build_object(
                'organizations_affected', v_orgs_affected,
                'data_connections', v_connections_deleted,
                'charts', v_charts_deleted,
                'cache_entries', v_cache_entries_deleted,
                'chart_dependencies', v_chart_deps_deleted,
                'views', v_views_deleted,
                'column_access_rows', v_column_access_deleted,
                'push_log_rows', v_push_logs_deleted,
                'schema', v_schema_name,
                'role', v_role_name,
                'optiqoflow_tables', v_optiqoflow_tables_affected
            ),
            'warnings', v_warnings,
            'action_planned', CASE 
                WHEN p_unlink_organizations THEN 'Organizations will be unlinked (tenant_id set to NULL)'
                ELSE 'Organizations will be DELETED'
            END
        );
    END IF;
    
    -- ============================================
    -- ACTUAL DELETION (not dry-run)
    -- ============================================
    
    -- STEP 1: Delete chart cache and dependencies (CASCADE handled by FK)
    DELETE FROM public.chart_data_cache
    WHERE tenant_id = p_tenant_id;
    
    -- STEP 2: Delete charts (CASCADE deletes widgets, dependencies via FK)
    DELETE FROM public.charts
    WHERE connection_id IN (
        SELECT dc.id FROM public.data_connections dc
        WHERE dc.organization_id IN (
            SELECT o.id FROM public.organizations o WHERE o.tenant_id = p_tenant_id
        )
    );
    
    -- STEP 3: Delete data connections
    DELETE FROM public.data_connections
    WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE tenant_id = p_tenant_id
    );
    
    -- STEP 4: Handle organizations
    IF p_unlink_organizations THEN
        -- Unlink organizations (set tenant_id to NULL)
        UPDATE public.organizations
        SET tenant_id = NULL
        WHERE tenant_id = p_tenant_id;
    ELSE
        -- Delete organizations entirely
        DELETE FROM public.organizations
        WHERE tenant_id = p_tenant_id;
    END IF;
    
    -- STEP 5: Drop tenant schema (CASCADE removes all views)
    PERFORM tenants.drop_tenant_schema(p_tenant_id);
    
    -- STEP 6: Delete tenant metadata
    DELETE FROM tenants.tenant_column_access
    WHERE tenant_id = p_tenant_id;
    
    DELETE FROM tenants.tenant_data_push_log
    WHERE tenant_id = p_tenant_id;
    
    -- STEP 7: Delete optiqoflow data (if requested - DANGEROUS!)
    IF p_delete_optiqoflow_data THEN
        -- This would require dynamic SQL to delete from all tenant-filtered tables
        -- Intentionally not implemented for safety - requires explicit implementation
        RAISE EXCEPTION 'Optiqoflow data deletion not yet implemented. Delete manually if needed.';
    END IF;
    
    -- STEP 8: Delete tenant registration (last!)
    DELETE FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    -- Return success summary
    RETURN jsonb_build_object(
        'success', true,
        'dry_run', false,
        'tenant_id', p_tenant_id,
        'tenant_short_name', v_short_name,
        'deleted', jsonb_build_object(
            'organizations_affected', v_orgs_affected,
            'data_connections', v_connections_deleted,
            'charts', v_charts_deleted,
            'cache_entries', v_cache_entries_deleted,
            'chart_dependencies', v_chart_deps_deleted,
            'views', v_views_deleted,
            'column_access_rows', v_column_access_deleted,
            'push_log_rows', v_push_logs_deleted,
            'schema', v_schema_name,
            'role', v_role_name
        ),
        'warnings', v_warnings,
        'action_taken', CASE 
            WHEN p_unlink_organizations THEN 'Organizations unlinked'
            ELSE 'Organizations deleted'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'tenant_id', p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION tenants.delete_tenant_completely TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION tenants.delete_tenant_completely IS 
'Safely removes all tenant-related objects from the dashboard. 
Use dry_run=true to preview what will be deleted before executing.
WARNING: This does NOT delete optiqoflow data by default.';
