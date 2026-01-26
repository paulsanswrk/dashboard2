/**
 * Tenant Query Context Utilities
 * 
 * Provides role-based context switching for executing queries
 * within a tenant's schema without needing schema-qualified table names.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface TenantContext {
    tenantId: string
    shortName: string
    schemaName: string
    roleName: string
}

/**
 * Gets the tenant context (schema and role names) for a given tenant ID
 */
export async function getTenantContext(
    supabase: SupabaseClient,
    tenantId: string
): Promise<TenantContext | null> {
    const { data, error } = await supabase
        .from('optiqoflow.tenants')
        .select('short_name')
        .eq('id', tenantId)
        .single()

    if (error || !data?.short_name) {
        // Try via RPC if direct query fails
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('exec_sql', {
                sql_query: `SELECT short_name FROM optiqoflow.tenants WHERE id = '${tenantId}'`
            })

        if (rpcError || !rpcData?.[0]?.short_name) {
            console.error('Failed to get tenant context:', error || rpcError)
            return null
        }

        const shortName = rpcData[0].short_name
        return {
            tenantId,
            shortName,
            schemaName: `tenant_${shortName}`,
            roleName: `tenant_${shortName}_role`,
        }
    }

    const shortName = data.short_name
    return {
        tenantId,
        shortName,
        schemaName: `tenant_${shortName}`,
        roleName: `tenant_${shortName}_role`,
    }
}

/**
 * Executes a SQL query in the context of a tenant's role.
 * Uses SET ROLE to switch to the tenant's role, which automatically
 * sets the search_path to the tenant's schema.
 * 
 * This allows unqualified table names in queries (e.g., `SELECT * FROM work_orders`)
 * instead of requiring schema-qualified names.
 */
export async function executeWithTenantContext<T = unknown>(
    supabase: SupabaseClient,
    tenantId: string,
    sql: string
): Promise<{ data: T[] | null; error: Error | null; context: TenantContext | null }> {
    // Get tenant context
    const context = await getTenantContext(supabase, tenantId)

    if (!context) {
        return {
            data: null,
            error: new Error(`Tenant ${tenantId} not found or missing short_name`),
            context: null,
        }
    }

    try {
        // Execute query with role context
        // The role's default search_path is the tenant's schema
        const wrappedSql = `
            SET ROLE ${context.roleName};
            ${sql}
        `

        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: wrappedSql,
        })

        if (error) {
            return { data: null, error: new Error(error.message), context }
        }

        return { data: data as T[], error: null, context }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
            context,
        }
    }
}

/**
 * Gets the schema name for a tenant (for use in view generation)
 */
export function getTenantSchemaName(shortName: string): string {
    return `tenant_${shortName}`
}

/**
 * Gets the role name for a tenant
 */
export function getTenantRoleName(shortName: string): string {
    return `tenant_${shortName}_role`
}

/**
 * Ensures a tenant has their schema and role created.
 * Calls the PostgreSQL function that handles this.
 */
export async function ensureTenantSchema(
    supabase: SupabaseClient,
    tenantId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.rpc('exec_sql', {
            sql_query: `SELECT optiqoflow.create_tenant_schema('${tenantId}'::uuid)`,
        })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }
}
