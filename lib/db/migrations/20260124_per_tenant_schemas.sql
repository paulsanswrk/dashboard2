-- Migration: Per-Tenant Schema Architecture
-- Creates per-tenant schemas with dedicated roles for data isolation
-- Enables unqualified SQL queries by setting role's default search_path

-- ============================================
-- 1. Add short_name column to tenants table
-- ============================================

ALTER TABLE optiqoflow.tenants 
ADD COLUMN IF NOT EXISTS short_name TEXT UNIQUE;

-- ============================================
-- 2. Helper function: Generate short name
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.generate_tenant_short_name(
    p_name TEXT,
    p_tenant_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_base_name TEXT;
    v_short_name TEXT;
    v_counter INTEGER := 1;
BEGIN
    -- Sanitize: lowercase, replace non-alphanumeric with underscore, collapse multiple underscores
    v_base_name := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '_', 'g'));
    -- Remove leading/trailing underscores
    v_base_name := trim(both '_' from v_base_name);
    -- Truncate to 30 chars to leave room for suffix
    v_base_name := left(v_base_name, 30);
    
    -- If empty after sanitization, use 'tenant' as base
    IF v_base_name = '' OR v_base_name IS NULL THEN
        v_base_name := 'tenant';
    END IF;
    
    v_short_name := v_base_name;
    
    -- Check for collisions and add suffix if needed
    WHILE EXISTS (
        SELECT 1 FROM optiqoflow.tenants 
        WHERE short_name = v_short_name 
        AND (p_tenant_id IS NULL OR id != p_tenant_id)
    ) LOOP
        v_short_name := v_base_name || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;
    
    RETURN v_short_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Create tenant schema and role
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.create_tenant_schema(
    p_tenant_id UUID
) RETURNS VOID AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_role_name TEXT;
BEGIN
    -- Get the short_name for this tenant
    SELECT short_name INTO v_short_name
    FROM optiqoflow.tenants
    WHERE id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not have a short_name', p_tenant_id;
    END IF;
    
    v_schema_name := 'tenant_' || v_short_name;
    v_role_name := 'tenant_' || v_short_name || '_role';
    
    -- Create schema if not exists
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);
    
    -- Create role if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role_name) THEN
        EXECUTE format('CREATE ROLE %I NOLOGIN', v_role_name);
    END IF;
    
    -- Grant usage on schema
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', v_schema_name, v_role_name);
    
    -- Grant select on all existing tables/views in schema
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', v_schema_name, v_role_name);
    
    -- Set default privileges for future tables/views
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO %I', v_schema_name, v_role_name);
    
    -- Set default search_path for the role
    EXECUTE format('ALTER ROLE %I SET search_path TO %I', v_role_name, v_schema_name);
    
    -- Also grant the role to the service role so it can SET ROLE
    EXECUTE format('GRANT %I TO service_role', v_role_name);
    
    RAISE NOTICE 'Created schema % and role % for tenant %', v_schema_name, v_role_name, p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Drop tenant schema and role
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.drop_tenant_schema(
    p_tenant_id UUID
) RETURNS VOID AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_role_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM optiqoflow.tenants
    WHERE id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN; -- Nothing to drop
    END IF;
    
    v_schema_name := 'tenant_' || v_short_name;
    v_role_name := 'tenant_' || v_short_name || '_role';
    
    -- Drop schema cascade (removes all views)
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
    
    -- Revoke role from service_role and drop
    BEGIN
        EXECUTE format('REVOKE %I FROM service_role', v_role_name);
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if role doesn't exist
    END;
    
    BEGIN
        EXECUTE format('DROP ROLE IF EXISTS %I', v_role_name);
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
    END;
    
    RAISE NOTICE 'Dropped schema % and role % for tenant %', v_schema_name, v_role_name, p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Create/update tenant view in their schema
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.create_tenant_view(
    p_tenant_id UUID,
    p_table_name TEXT,
    p_columns TEXT[],
    p_filter_sql TEXT
) RETURNS VOID AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_view_sql TEXT;
    v_column_list TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM optiqoflow.tenants
    WHERE id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not have a short_name', p_tenant_id;
    END IF;
    
    v_schema_name := 'tenant_' || v_short_name;
    
    -- Build column list
    v_column_list := array_to_string(
        ARRAY(SELECT quote_ident(col) FROM unnest(p_columns) AS col),
        ', '
    );
    
    -- Build and execute view creation
    v_view_sql := format(
        'CREATE OR REPLACE VIEW %I.%I AS SELECT %s FROM optiqoflow.%I WHERE %s',
        v_schema_name,
        p_table_name,
        v_column_list,
        p_table_name,
        p_filter_sql
    );
    
    EXECUTE v_view_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Get tenant role name
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.get_tenant_role(
    p_tenant_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_short_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM optiqoflow.tenants
    WHERE id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN 'tenant_' || v_short_name || '_role';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. Get tenant schema name
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.get_tenant_schema(
    p_tenant_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_short_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM optiqoflow.tenants
    WHERE id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN 'tenant_' || v_short_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 8. Backfill existing tenants
-- ============================================

DO $$
DECLARE
    v_tenant RECORD;
    v_short_name TEXT;
BEGIN
    FOR v_tenant IN 
        SELECT id, name FROM optiqoflow.tenants WHERE short_name IS NULL
    LOOP
        -- Generate and set short_name
        v_short_name := optiqoflow.generate_tenant_short_name(
            COALESCE(v_tenant.name, 'tenant'),
            v_tenant.id
        );
        
        UPDATE optiqoflow.tenants 
        SET short_name = v_short_name 
        WHERE id = v_tenant.id;
        
        -- Create schema and role
        PERFORM optiqoflow.create_tenant_schema(v_tenant.id);
        
        RAISE NOTICE 'Backfilled tenant % with short_name %', v_tenant.id, v_short_name;
    END LOOP;
END;
$$;

-- ============================================
-- 9. Migrate existing views from tenants schema
-- ============================================

-- Drop old views that were in tenants schema with uuid naming
-- New views will be recreated by the application on next data push
DO $$
DECLARE
    v_view RECORD;
BEGIN
    FOR v_view IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'tenants' 
        AND viewname ~ '^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}_'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I', v_view.schemaname, v_view.viewname);
        RAISE NOTICE 'Dropped legacy view %', v_view.viewname;
    END LOOP;
END;
$$;

-- ============================================
-- 10. Add trigger for auto short_name on insert
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.tenant_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.short_name IS NULL THEN
        NEW.short_name := optiqoflow.generate_tenant_short_name(
            COALESCE(NEW.name, 'tenant'),
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_before_insert_trigger ON optiqoflow.tenants;
CREATE TRIGGER tenant_before_insert_trigger
    BEFORE INSERT ON optiqoflow.tenants
    FOR EACH ROW
    EXECUTE FUNCTION optiqoflow.tenant_before_insert();

-- ============================================
-- 11. Add trigger to create schema on insert
-- ============================================

CREATE OR REPLACE FUNCTION optiqoflow.tenant_after_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM optiqoflow.create_tenant_schema(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_after_insert_trigger ON optiqoflow.tenants;
CREATE TRIGGER tenant_after_insert_trigger
    AFTER INSERT ON optiqoflow.tenants
    FOR EACH ROW
    EXECUTE FUNCTION optiqoflow.tenant_after_insert();

-- Grant execute on functions to service_role
GRANT EXECUTE ON FUNCTION optiqoflow.generate_tenant_short_name TO service_role;
GRANT EXECUTE ON FUNCTION optiqoflow.create_tenant_schema TO service_role;
GRANT EXECUTE ON FUNCTION optiqoflow.drop_tenant_schema TO service_role;
GRANT EXECUTE ON FUNCTION optiqoflow.create_tenant_view TO service_role;
GRANT EXECUTE ON FUNCTION optiqoflow.get_tenant_role TO service_role;
GRANT EXECUTE ON FUNCTION optiqoflow.get_tenant_schema TO service_role;
