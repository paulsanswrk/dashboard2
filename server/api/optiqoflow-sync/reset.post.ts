import { createClient } from '@supabase/supabase-js'
import { pgClient } from '../../../lib/db'

/**
 * POST /api/optiqoflow-sync/reset
 * Clears all synced data from the optiqoflow schema, preserving global configuration and tenants.
 * Only accessible by SUPERADMIN.
 */
export default defineEventHandler(async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw createError({ statusCode: 500, statusMessage: 'Missing Supabase configuration' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth & Role Check
    const authorization = getHeader(event, 'authorization')
    if (!authorization) throw createError({ statusCode: 401, statusMessage: 'Authorization header required' })

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid token' })

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (profileData?.role !== 'SUPERADMIN') {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    // Tables to PRESERVE (Tenants and Webhook Logs only)
    const PRESERVE_TABLES = [
        'tenants',            // optiqoflow.tenants (Keep)
        'webhook_logs',       // optiqoflow.webhook_logs (Keep Sync History)

        // PostGIS & System (if present in optiqoflow schema context)
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
    ]

    try {
        // Get all tables in optiqoflow schema
        const tablesResult = await pgClient.unsafe(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'optiqoflow' 
              AND table_type = 'BASE TABLE'
        `) as { table_name: string }[]

        const allTables = tablesResult.map(r => r.table_name)

        // Filter out tables to preserve
        const tablesToTruncate = allTables.filter(t => !PRESERVE_TABLES.includes(t))

        if (tablesToTruncate.length === 0) {
            return { success: true, message: 'No tables to clear', tables: [] }
        }

        console.log('[Global Reset] Clearing tables:', tablesToTruncate.join(', '))

        // Truncate all target tables
        // using CASCADE to handle FKs
        const truncateSql = `TRUNCATE TABLE ${tablesToTruncate.map(t => `"optiqoflow"."${t}"`).join(', ')} CASCADE`

        await pgClient.unsafe(truncateSql)

        // Drop tenant schemas
        const schemasResult = await pgClient.unsafe(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE 'tenant\\_%'
        `) as { schema_name: string }[]

        const schemasToDrop = schemasResult.map(r => r.schema_name)
        if (schemasToDrop.length > 0) {
            console.log('[Global Reset] Dropping schemas:', schemasToDrop.join(', '))
            const dropSchemaSql = schemasToDrop.map(s => `DROP SCHEMA IF EXISTS "${s}" CASCADE`).join('; ')
            await pgClient.unsafe(dropSchemaSql)
        }

        return {
            success: true,
            message: `Cleared ${tablesToTruncate.length} tables and dropped ${schemasToDrop.length} tenant schemas`,
            cleared_tables: tablesToTruncate,
            dropped_schemas: schemasToDrop
        }

    } catch (error: any) {
        console.error('[Global Reset] Error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to reset data'
        })
    }
})
