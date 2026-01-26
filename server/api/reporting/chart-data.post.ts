/**
 * Chart Data Endpoint with Caching
 * 
 * Fetches chart data with intelligent caching:
 * - Checks cache_status on chart to decide caching strategy
 * - Bypasses cache for dynamic filters
 * - Stores results in chart_data_cache for reuse
 * - MySQL data sources use permanent cache (no auto-invalidation)
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { executeOptiqoflowQuery, translateIdentifiers } from '../../utils/optiqoflowQuery'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../utils/internalStorageQuery'
import { db } from '../../../lib/db'
import { dataConnections, organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import {
    generateCacheKey,
    getCachedChartData,
    setCachedChartData,
    extractTablesFromStateJson
} from '../../utils/chart-cache'

interface ChartDataRequest {
    chartId: number
    // tenantId removed for security - derived from authenticated user's organization
    connectionId?: number
    sql: string
    filters?: Record<string, unknown>
    bypassCache?: boolean
}

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody<ChartDataRequest>(event)
    const { chartId, connectionId, sql, filters = {}, bypassCache = false } = body

    if (!chartId || !sql) {
        throw createError({ statusCode: 400, statusMessage: 'Missing chartId or sql' })
    }

    // SECURITY: Derive tenantId from authenticated user's organization
    // Never trust client-provided tenantId to prevent cross-tenant data access
    let tenantId: string | undefined
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profile?.organization_id) {
        const org = await db.select({ tenantId: organizations.tenantId })
            .from(organizations)
            .where(eq(organizations.id, profile.organization_id))
            .limit(1)
            .then(rows => rows[0])

        tenantId = org?.tenantId || undefined
    }

    const startTime = Date.now()

    // Get chart metadata including cache status and data connection
    const { data: chart, error: chartError } = await supabaseAdmin
        .from('charts')
        .select('id, cache_status, has_dynamic_filter, state_json, data_connection_id')
        .eq('id', chartId)
        .single()

    if (chartError || !chart) {
        throw createError({ statusCode: 404, statusMessage: 'Chart not found' })
    }

    // Determine data source type from storage_location
    const effectiveConnectionId = connectionId || chart.data_connection_id
    let connection: { id: number; storageLocation: string | null } | null = null

    if (effectiveConnectionId) {
        connection = await db.query.dataConnections.findFirst({
            where: eq(dataConnections.id, effectiveConnectionId),
            columns: { id: true, storageLocation: true }
        }) || null
    }

    const storageLocation = connection?.storageLocation || 'external'
    console.log(`[chart-data] Chart ${chartId}, Connection ${effectiveConnectionId}, storageLocation=${storageLocation}`)
    const cacheKey = generateCacheKey(chartId, { sql, dataSource: storageLocation, ...filters })
    const effectiveTenantId = tenantId || 'default'

    // Determine caching strategy based on storage location
    // - external (MySQL): Always cache (permanent until manual refresh)
    // - optiqoflow: Cache based on cache_status and dynamic filters
    // - supabase_synced: Always cache (permanent until manual refresh)
    const shouldUseCache = !bypassCache && (
        storageLocation === 'external' ||
        storageLocation === 'supabase_synced' ||
        (storageLocation === 'optiqoflow' && chart.cache_status !== 'dynamic' && !chart.has_dynamic_filter)
    )

    // Try to get cached data
    if (shouldUseCache) {
        const cached = await getCachedChartData(
            supabaseAdmin,
            chartId,
            effectiveTenantId,
            cacheKey
        )

        if (cached) {
            return {
                data: cached.data,
                meta: {
                    cached: true,
                    cacheHit: true,
                    dataSource: storageLocation,
                    permanent: storageLocation !== 'optiqoflow',
                    durationMs: Date.now() - startTime
                }
            }
        }
    }

    // Execute query based on storage location
    let rows: unknown[]
    try {
        console.log(`[chart-data] Routing to ${storageLocation} handler`)
        switch (storageLocation) {
            case 'external': {
                // Direct MySQL connection
                console.log(`[chart-data] Using external MySQL for connection ${effectiveConnectionId}`)
                const cfg = await loadConnectionConfigFromSupabase(event, effectiveConnectionId!)
                rows = await withMySqlConnectionConfig(cfg, async (conn) => {
                    const [res] = await conn.query({ sql, timeout: 30000 } as any)
                    return res as any[]
                })
                break
            }

            case 'optiqoflow': {
                // OptiqoFlow data with tenant isolation
                console.log(`[chart-data] Using optiqoflow for tenant ${tenantId}`)
                if (!tenantId) {
                    return {
                        data: [],
                        meta: {
                            error: 'User must be associated with an organization that has a tenant_id configured for Optiqoflow data access.',
                            dataSource: 'optiqoflow',
                            durationMs: Date.now() - startTime
                        }
                    }
                }
                const pgSql = translateIdentifiers(sql)
                rows = await executeOptiqoflowQuery(pgSql, [], tenantId)
                break
            }

            case 'supabase_synced': {
                // Synced MySQL data in Supabase PostgreSQL
                const storageInfo = await loadInternalStorageInfo(effectiveConnectionId!)
                if (!storageInfo.useInternalStorage || !storageInfo.schemaName) {
                    return {
                        data: [],
                        meta: {
                            error: 'Synced storage not configured properly for this connection',
                            dataSource: 'supabase_synced',
                            durationMs: Date.now() - startTime
                        }
                    }
                }
                const pgSql = translateIdentifiers(sql)
                rows = await executeInternalStorageQuery(storageInfo.schemaName, pgSql, [])
                break
            }

            default:
                throw new Error(`Unknown storage_location: ${storageLocation}`)
        }
    } catch (error: any) {
        return {
            data: [],
            meta: {
                error: error.message || 'Query execution failed',
                dataSource: storageLocation,
                durationMs: Date.now() - startTime
            }
        }
    }

    const queryDurationMs = Date.now() - startTime

    // Extract tables from chart state for cache tracking
    const stateJson = chart.state_json as Record<string, unknown> || {}
    const sourceTables = extractTablesFromStateJson(stateJson)

    // Store in cache (async, non-blocking)
    // - external: permanent cache (no validUntil)
    // - supabase_synced: permanent cache (no validUntil)
    // - optiqoflow: cache with table dependencies for invalidation
    if (shouldUseCache) {
        event.waitUntil(
            setCachedChartData(
                supabaseAdmin,
                chartId,
                effectiveTenantId,
                cacheKey,
                rows,
                storageLocation !== 'optiqoflow' ? ['_permanent'] : sourceTables,
                queryDurationMs
            ).catch(e => console.error('Cache storage error:', e))
        )
    }

    return {
        data: rows,
        meta: {
            cached: false,
            cacheHit: false,
            dataSource: storageLocation,
            permanent: storageLocation !== 'optiqoflow',
            rowCount: Array.isArray(rows) ? rows.length : 0,
            durationMs: queryDurationMs,
            sourceTables: storageLocation === 'optiqoflow' ? sourceTables : []
        }
    }
})

