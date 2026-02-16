import { createClient } from '@supabase/supabase-js'
import { db } from '../../../lib/db'
import { sql } from 'drizzle-orm'

/**
 * GET /api/optiqoflow-sync/tenants-with-config
 * Lists all tenants with their sync configuration (joined)
 * Only accessible by SUPERADMIN
 */
export default defineEventHandler(async (event) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Missing Supabase configuration'
            })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get the authorization header
        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Authorization header required'
            })
        }

        const token = authorization.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            })
        }

        // Check if user is SUPERADMIN
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (profileError || profileData.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only superadmins can access sync configuration'
            })
        }

        // Fetch tenants LEFT JOINed with sync configs
        const result = await db.execute(sql`
            SELECT 
                t.id,
                t.name,
                c.id as config_id,
                c.webhook_url,
                c.webhook_secret,
                c.tables_to_sync,
                c.columns_to_sync,
                c.is_active,
                c.sync_deletes,
                c.last_sync_at,
                c.last_error,
                c.api_enabled,
                c.api_key_hash,
                c.api_key_created_at,
                c.api_last_request_at,
                c.api_request_count,
                c.created_at as config_created_at,
                c.updated_at as config_updated_at
            FROM "optiqoflow-demo-source".tenants t
            LEFT JOIN "optiqoflow-demo-source".tenant_data_sync_configs c
                ON t.id = c.tenant_id
            ORDER BY t.name
        `)

        // Transform into TenantWithSync shape
        const tenants = (result as any[]).map((row: any) => ({
            id: row.id,
            name: row.name,
            sync_config: row.config_id ? {
                id: row.config_id,
                tenant_id: row.id,
                webhook_url: row.webhook_url,
                webhook_secret: row.webhook_secret,
                tables_to_sync: row.tables_to_sync || [],
                columns_to_sync: row.columns_to_sync || {},
                is_active: row.is_active,
                sync_deletes: row.sync_deletes,
                last_sync_at: row.last_sync_at,
                last_error: row.last_error,
                api_enabled: row.api_enabled,
                api_key_hash: row.api_key_hash,
                api_key_created_at: row.api_key_created_at,
                api_last_request_at: row.api_last_request_at,
                api_request_count: row.api_request_count,
                created_at: row.config_created_at,
                updated_at: row.config_updated_at,
            } : null,
        }))

        return {
            success: true,
            tenants
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to fetch tenants with sync config'
        })
    }
})
