-- Migration: Move tenant short_names to tenants schema
-- The optiqoflow schema is externally managed and recreated, so we need
-- to persist short_names in the tenants schema which is dashboard-controlled.

-- ============================================
-- 1. Create tenant_short_names table
-- ============================================

CREATE TABLE IF NOT EXISTS tenants.tenant_short_names (
    tenant_id UUID PRIMARY KEY,
    short_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by short_name
CREATE INDEX IF NOT EXISTS idx_tenant_short_names_short_name 
ON tenants.tenant_short_names(short_name);

-- ============================================
-- 2. Migrate existing short_names from optiqoflow.tenants
-- ============================================

INSERT INTO tenants.tenant_short_names (tenant_id, short_name)
SELECT id, short_name 
FROM optiqoflow.tenants 
WHERE short_name IS NOT NULL
ON CONFLICT (tenant_id) DO UPDATE SET 
    short_name = EXCLUDED.short_name,
    updated_at = NOW();

-- ============================================
-- 3. Update helper functions to use tenants schema
-- ============================================

-- Generate unique short name (standalone, doesn't depend on optiqoflow)
CREATE OR REPLACE FUNCTION tenants.generate_tenant_short_name(
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
    
    -- Check for collisions in our persistent table
    WHILE EXISTS (
        SELECT 1 FROM tenants.tenant_short_names 
        WHERE short_name = v_short_name 
        AND (p_tenant_id IS NULL OR tenant_id != p_tenant_id)
    ) LOOP
        v_short_name := v_base_name || '_' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;
    
    RETURN v_short_name;
END;
$$ LANGUAGE plpgsql;

-- Get tenant role name
CREATE OR REPLACE FUNCTION tenants.get_tenant_role(
    p_tenant_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_short_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN 'tenant_' || v_short_name || '_role';
END;
$$ LANGUAGE plpgsql STABLE;

-- Get tenant schema name
CREATE OR REPLACE FUNCTION tenants.get_tenant_schema(
    p_tenant_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_short_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN 'tenant_' || v_short_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get tenant short_name
CREATE OR REPLACE FUNCTION tenants.get_tenant_short_name(
    p_tenant_id UUID
) RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT short_name 
        FROM tenants.tenant_short_names 
        WHERE tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create tenant schema and role (using tenants schema for short_name lookup)
CREATE OR REPLACE FUNCTION tenants.create_tenant_schema(
    p_tenant_id UUID
) RETURNS VOID AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_role_name TEXT;
BEGIN
    -- Get the short_name from our persistent table
    SELECT short_name INTO v_short_name
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    IF v_short_name IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not have a short_name in tenants.tenant_short_names', p_tenant_id;
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
    
    -- Grant the role to service_role so it can SET ROLE
    EXECUTE format('GRANT %I TO service_role', v_role_name);
    
    RAISE NOTICE 'Created schema % and role % for tenant %', v_schema_name, v_role_name, p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop tenant schema and role
CREATE OR REPLACE FUNCTION tenants.drop_tenant_schema(
    p_tenant_id UUID
) RETURNS VOID AS $$
DECLARE
    v_short_name TEXT;
    v_schema_name TEXT;
    v_role_name TEXT;
BEGIN
    SELECT short_name INTO v_short_name
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
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

-- Register or update a tenant's short_name and ensure schema exists
CREATE OR REPLACE FUNCTION tenants.register_tenant(
    p_tenant_id UUID,
    p_tenant_name TEXT
) RETURNS TEXT AS $$
DECLARE
    v_short_name TEXT;
    v_existing TEXT;
BEGIN
    -- Check if already registered
    SELECT short_name INTO v_existing
    FROM tenants.tenant_short_names
    WHERE tenant_id = p_tenant_id;
    
    IF v_existing IS NOT NULL THEN
        -- Already registered, ensure schema exists and return
        PERFORM tenants.create_tenant_schema(p_tenant_id);
        RETURN v_existing;
    END IF;
    
    -- Generate new short_name
    v_short_name := tenants.generate_tenant_short_name(p_tenant_name, p_tenant_id);
    
    -- Insert into our persistent table
    INSERT INTO tenants.tenant_short_names (tenant_id, short_name)
    VALUES (p_tenant_id, v_short_name);
    
    -- Create schema and role
    PERFORM tenants.create_tenant_schema(p_tenant_id);
    
    RETURN v_short_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION tenants.generate_tenant_short_name TO service_role;
GRANT EXECUTE ON FUNCTION tenants.get_tenant_role TO service_role;
GRANT EXECUTE ON FUNCTION tenants.get_tenant_schema TO service_role;
GRANT EXECUTE ON FUNCTION tenants.get_tenant_short_name TO service_role;
GRANT EXECUTE ON FUNCTION tenants.create_tenant_schema TO service_role;
GRANT EXECUTE ON FUNCTION tenants.drop_tenant_schema TO service_role;
GRANT EXECUTE ON FUNCTION tenants.register_tenant TO service_role;

-- Grant table access to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants.tenant_short_names TO service_role;
