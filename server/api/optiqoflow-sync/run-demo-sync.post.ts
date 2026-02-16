import { createClient } from '@supabase/supabase-js'
import { pgClient } from '../../../lib/db'
import { sql } from 'drizzle-orm'
import { TABLE_MAPPING } from '../../utils/optiqoflow-constants'
import { createOrUpdateTenantView } from '../../utils/tenant-views'
import { invalidateCacheForTables } from '../../utils/chart-cache'
import { randomUUID } from 'crypto'

/**
 * Updates tenant column access and regenerates view if columns changed or view doesn't exist
 * Uses pgClient (Drizzle) for direct SQL access to tenants schema
 */
async function updateTenantColumnAccess(
    tenantId: string,
    tableName: string,
    columns: string[]
): Promise<boolean> {
    console.log(`[DemoSync] updateTenantColumnAccess called:`, { tenantId, tableName, columnCount: columns.length })
    const sortedColumns = [...columns].sort()

    try {
        // Check current columns using raw SQL
        const existingRows = await pgClient.unsafe(`
            SELECT columns FROM tenants.tenant_column_access 
            WHERE tenant_id = $1 AND table_name = $2
        `, [tenantId, tableName]) as Array<{ columns: string[] }>

        const existingColumns = existingRows[0]?.columns?.sort() || []
        const columnsChanged = JSON.stringify(sortedColumns) !== JSON.stringify(existingColumns)

        // Upsert column access using raw SQL
        const pgArrayLiteral = `{${sortedColumns.join(',')}}`
        await pgClient.unsafe(`
            INSERT INTO tenants.tenant_column_access (tenant_id, table_name, columns, last_push_at, updated_at)
            VALUES ($1, $2, $3::text[], NOW(), NOW())
            ON CONFLICT (tenant_id, table_name) 
            DO UPDATE SET columns = $3::text[], last_push_at = NOW(), updated_at = NOW()
        `, [tenantId, tableName, pgArrayLiteral])

        // Check if view exists by looking up tenant's schema
        const schemaResult = await pgClient.unsafe(
            `SELECT tenants.get_tenant_schema($1) as schema_name`,
            [tenantId]
        ) as Array<{ schema_name: string | null }>
        const schemaName = schemaResult[0]?.schema_name

        let viewExists = false
        if (schemaName) {
            const viewCheck = await pgClient.unsafe(`
                SELECT 1 FROM pg_views 
                WHERE schemaname = $1 AND viewname = $2
            `, [schemaName, tableName]) as Array<{ count: number }>
            viewExists = viewCheck.length > 0
        }

        // Regenerate view if columns changed OR view doesn't exist
        if (sortedColumns.length > 0 && (columnsChanged || !viewExists)) {
            console.log(`[DemoSync] Regenerating tenant view for ${tenantId}/${tableName}...`)
            await createOrUpdateTenantView(tenantId, tableName, sortedColumns)
        }

        return columnsChanged
    } catch (error: any) {
        console.error(`[DemoSync] Failed to update column access:`, error?.message || error)
        return false
    }
}

/**
 * Logs data push for cache invalidation tracking
 */
async function logDataPush(
    tenantId: string,
    pushId: string,
    affectedTables: string[],
    recordCounts: Record<string, number>
): Promise<void> {
    try {
        const uuidPushId = pushId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            ? pushId
            : randomUUID()
        const pgArrayLiteral = `{${affectedTables.join(',')}}`
        await pgClient.unsafe(`
            INSERT INTO tenants.tenant_data_push_log 
            (tenant_id, push_id, affected_tables, pushed_at, record_counts)
            VALUES ($1, $2, $3::text[], NOW(), $4::jsonb)
        `, [tenantId, uuidPushId, pgArrayLiteral, JSON.stringify(recordCounts)])
    } catch (error: any) {
        console.error(`[DemoSync] Failed to log data push:`, error?.message || error)
    }
}

async function logWebhook(
    tenantId: string | undefined,
    operation: string,
    tableName: string | undefined,
    targetTable: string | undefined,
    success: boolean,
    errorMessage: string | null,
    duration: number,
    clientIp: string,
    userAgent: string,
    metadata: any = {}
) {
    try {
        await pgClient.unsafe(`
            INSERT INTO tenants.webhook_logs 
            (tenant_id, operation, table_name, target_table, success, error_message, duration_ms, client_ip, user_agent, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            (tenantId ?? null) as any,
            operation || 'UNKNOWN',
            tableName || null,
            targetTable || null,
            success,
            errorMessage,
            duration,
            clientIp,
            userAgent,
            JSON.stringify(metadata || {})
        ])
    } catch (e) {
        console.error('[DemoSync] Failed to insert into tenants.webhook_logs:', e)
    }
}

/**
 * POST /api/optiqoflow-sync/run-demo-sync
 * Triggers a sync from optiqoflow-demo-source to optiqoflow schema
 */
export default defineEventHandler(async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw createError({ statusCode: 500, statusMessage: 'Missing Supabase configuration' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: 'optiqoflow' }
    })
    const publicSupabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth check using serverSupabaseUser (cookies) or Authorization header
    let user = null
    try {
        user = await serverSupabaseUser(event)
    } catch (e) { /* ignore */ }

    if (!user) {
        const authorization = getHeader(event, 'authorization')
        if (!authorization) throw createError({ statusCode: 401, statusMessage: 'Authorization header required' })

        const token = authorization.replace('Bearer ', '')
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !authUser) throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
        user = authUser
    }

    // Superadmin check
    const { data: profileData, error: profileError } = await publicSupabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (profileData?.role !== 'SUPERADMIN') {
        console.error('[DemoSync] Forbidden: User role is', profileData?.role)
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { tenantId, tables } = body
    if (!tenantId || !Array.isArray(tables)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
    }

    console.log(`[DemoSync] Starting sync for tenant ${tenantId}, tables: ${tables.join(', ')}`)

    const startTime = Date.now()
    const forwarded = getHeader(event, 'x-forwarded-for')
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : (event.node.req.socket.remoteAddress || 'unknown')
    const userAgent = getHeader(event, 'user-agent') || 'unknown'

    const results: Record<string, any> = {}
    const affectedTables: string[] = []
    const recordCounts: Record<string, number> = {}

    // Global tables that don't have tenant_id filtering
    const GLOBAL_TABLES = ['tenants', 'insta_quality_levels', 'service_types']

    for (const sourceTable of tables) {
        // Map source table to target table
        const targetTable = TABLE_MAPPING[sourceTable]
        if (!targetTable) {
            results[sourceTable] = { success: false, error: 'Unmapped table' }
            continue
        }

        try {
            // 1. Fetch data from source
            // Note: "optiqoflow-demo-source" tables should match sourceTable name
            // Tenants table in demo source is "tenants", others match standard names
            const sourceRows = await pgClient.unsafe(`
                SELECT * FROM "optiqoflow-demo-source"."${sourceTable}"
                ${sourceTable === 'tenants' ? 'WHERE id = $1' : 'WHERE tenant_id = $1'}
            `, [tenantId]) as any[]

            console.log(`[DemoSync] Fetched ${sourceRows.length} rows from ${sourceTable}`)

            // 2. Clear existing data in target (if not global)
            // For 'tenants' table, we might update or upsert, but definitely don't delete all tenants!
            // Actually, we probably don't want to clear 'tenants' table based on tenant_id query anyway.
            if (!GLOBAL_TABLES.includes(targetTable) && targetTable !== 'tenants') {
                await supabase.from(targetTable).delete().eq('tenant_id', tenantId)
            }

            // 3. Insert data into target
            if (sourceRows.length > 0) {
                // Remove any columns that might not exist in target or cause issues?
                // For now assuming schema parity.

                // For device_tenants, conflict on composite key
                const conflictColumn = targetTable === 'device_tenants' ? 'device_id,tenant_id' : 'id'

                const { error: upsertError } = await supabase
                    .from(targetTable) // Ensure using optiqoflow schema
                    .upsert(sourceRows, { onConflict: conflictColumn })

                if (upsertError) throw upsertError
            }

            // 4. Update helpers
            if (sourceRows.length > 0) {
                const columns = Object.keys(sourceRows[0])
                await updateTenantColumnAccess(tenantId, targetTable, columns)
            }

            results[sourceTable] = { success: true, count: sourceRows.length }
            affectedTables.push(targetTable)
            recordCounts[targetTable] = sourceRows.length

        } catch (error: any) {
            console.error(`[DemoSync] Error syncing ${sourceTable}:`, error)
            results[sourceTable] = { success: false, error: error.message }
        }
    }

    // 5. Invalidate cache and log
    if (affectedTables.length > 0) {
        // Run in background / non-blocking
        event.waitUntil(
            Promise.all([
                invalidateCacheForTables(publicSupabase as any, tenantId, affectedTables),
                logDataPush(tenantId, randomUUID(), affectedTables, recordCounts),
                logWebhook(
                    tenantId,
                    'DEMO_SYNC',
                    'MULTIPLE',
                    'MULTIPLE',
                    true,
                    null,
                    Date.now() - startTime,
                    clientIp,
                    userAgent,
                    { affected_tables: affectedTables, record_counts: recordCounts }
                )
            ]).catch(e => console.error('[DemoSync] Background task error:', e))
        )
    } else {
        // Log even if no tables affected (but success)
        event.waitUntil(
            logWebhook(
                tenantId,
                'DEMO_SYNC',
                'MULTIPLE',
                'MULTIPLE',
                true,
                null,
                Date.now() - startTime,
                clientIp,
                userAgent,
                { affected_tables: [], record_counts: {} }
            ).catch(e => console.error('[DemoSync] Log error:', e))
        )
    }

    return { success: true, results }
})
