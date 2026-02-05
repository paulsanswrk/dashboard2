import { createHash } from 'crypto'
import { defineEventHandler, getQuery } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../../../supabase'
import { withMySqlConnectionConfig } from '../../../../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../../../../utils/connectionConfig'
import { validateRenderContext } from '../../../../../utils/renderContext'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../../../../utils/internalStorageQuery'
import { executeOptiqoflowQuery, translateIdentifiers } from '../../../../../utils/optiqoflowQuery'
import { injectFiltersIntoSql, type FilterOverride } from '../../../../../utils/filterInjection'
import {
    generateCacheKey,
    getCachedChartData,
    setCachedChartData,
    extractTablesFromStateJson
} from '../../../../../utils/chart-cache'
import { db } from '../../../../../../lib/db'
import { dataConnections, organizations } from '../../../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any


/**
 * GET /api/dashboards/:id/charts/:chartId/data
 * 
 * Fetches data for a specific chart within a dashboard.
 * This endpoint is designed for progressive loading - dashboards load metadata first,
 * then each chart fetches its data independently.
 * 
 * Query params:
 *   - context: Optional render context token for public dashboards
 *   - filterOverrides: Optional JSON-encoded array of filter overrides
 */
export default defineEventHandler(async (event) => {
    const dashboardId = event.context.params?.id as string
    const chartIdParam = event.context.params?.chartId as string
    const chartId = parseInt(chartIdParam, 10)

    if (!dashboardId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })
    }
    if (!chartId || isNaN(chartId)) {
        throw createError({ statusCode: 400, statusMessage: 'Missing or invalid chart id' })
    }

    const query = getQuery(event)
    const contextToken = query.context as string | undefined
    const authToken = query.authToken as string | undefined
    const filterOverridesParam = query.filterOverrides as string | undefined
    const isRenderContext = contextToken ? validateRenderContext(contextToken) : false

    // Parse filter overrides if provided
    let filterOverrides: FilterOverride[] = []
    if (filterOverridesParam) {
        try {
            filterOverrides = JSON.parse(filterOverridesParam)
        } catch (e) {
            console.warn('[chart-data] Failed to parse filterOverrides:', e)
        }
    }

    // Load dashboard for access control
    let dashboard: any
    try {
        const { data, error: dashError } = await supabaseAdmin
            .from('dashboards')
            .select('id, name, organization_id, creator, is_public, password')
            .eq('id', dashboardId)
            .single()

        if (dashError || !data) {
            throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
        }
        dashboard = data
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[chart-data] Error loading dashboard:', e?.message || e)
        throw createError({ statusCode: 500, statusMessage: 'Failed to load dashboard' })
    }

    // Access control
    let sameOrg = false
    try {
        if (!dashboard.is_public && !isRenderContext) {
            const user = await serverSupabaseUser(event)
            if (!user) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            }
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('organization_id, role')
                .eq('user_id', user.id)
                .single()
            if (profileError || !profile?.organization_id) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            }
            sameOrg = profile.organization_id === dashboard.organization_id

            const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(profile.role)
            const isCreator = dashboard.creator === user.id

            if (isAdmin || isCreator) {
                if (!sameOrg) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            } else {
                if (!sameOrg) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

                const { data: accessRules } = await supabaseAdmin
                    .from('dashboard_access')
                    .select('access_level')
                    .eq('dashboard_id', dashboard.id)
                    .or(`target_user_id.eq.${user.id},target_org_id.eq.${profile.organization_id}`)

                if (!accessRules || accessRules.length === 0) {
                    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
                }
            }
        } else if (dashboard.is_public && dashboard.password) {
            // Check password protection for public dashboards
            const user = await serverSupabaseUser(event).catch(() => null as any)
            let hasPermission = false

            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('organization_id, role')
                    .eq('user_id', user.id)
                    .single()

                if (profile) {
                    if (dashboard.creator === user.id) {
                        hasPermission = true
                    } else if (profile.role === 'SUPERADMIN' || (profile.role === 'ADMIN' && profile.organization_id === dashboard.organization_id)) {
                        hasPermission = true
                    }
                }
            }

            if (!hasPermission && authToken) {
                const expectedToken = createHash('sha256').update(dashboard.password).digest('hex')
                if (authToken === expectedToken) {
                    hasPermission = true
                }
            }

            if (!hasPermission && !isRenderContext) {
                throw createError({ statusCode: 403, statusMessage: 'Password required' })
            }
        } else {
            // For public dashboards or render context, capture org context if user is present
            const user = await serverSupabaseUser(event).catch(() => null as any)
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .maybeSingle()
                sameOrg = !!profile?.organization_id && profile.organization_id === dashboard.organization_id
            }
        }
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[chart-data] Error in access control:', e?.message || e)
        throw createError({ statusCode: 500, statusMessage: 'Access control error' })
    }

    // Verify chart belongs to this dashboard
    let chart: any
    try {
        // First check if the chart is linked to this dashboard via dashboard_widgets
        const { data: widget, error: widgetError } = await supabaseAdmin
            .from('dashboard_widgets')
            .select('chart_id')
            .eq('dashboard_id', dashboardId)
            .eq('chart_id', chartId)
            .maybeSingle()

        if (widgetError) {
            console.error('[chart-data] Error checking widget:', widgetError)
            throw createError({ statusCode: 500, statusMessage: 'Failed to verify chart' })
        }

        if (!widget) {
            throw createError({ statusCode: 404, statusMessage: 'Chart not found in this dashboard' })
        }

        // Load the chart
        const { data: chartData, error: chartError } = await supabaseAdmin
            .from('charts')
            .select('id, name, state_json, cache_status, has_dynamic_filter, data_connection_id')
            .eq('id', chartId)
            .single()

        if (chartError || !chartData) {
            throw createError({ statusCode: 404, statusMessage: 'Chart not found' })
        }
        chart = chartData
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[chart-data] Error loading chart:', e?.message || e)
        throw createError({ statusCode: 500, statusMessage: 'Failed to load chart' })
    }

    // Execute query and return data
    const sj = (chart.state_json || {}) as any
    const internal = sj.internal || {}

    let columns: any[] = []
    let rows: any[] = []
    const meta: Record<string, any> = {}
    const queryStartTime = Date.now()

    try {
        const sql = internal.actualExecutedSql || internal.sqlText || ''
        const sqlParams = internal.actualExecutedSqlParams || []
        const connectionId = internal.dataConnectionId ?? null

        if (sql) {
            let safeSql = sql.trim()
            if (!/\blimit\b/i.test(safeSql)) safeSql = `${safeSql} LIMIT 500`

            // Store original SQL for fallback
            const originalSql = safeSql
            let filterResult: any = { sql: safeSql, appliedFilters: 0, skippedFilters: 0, skippedReasons: [] }

            // Apply filter overrides to the SQL
            if (filterOverrides.length > 0 && connectionId) {
                filterResult = injectFiltersIntoSql(safeSql, filterOverrides, Number(connectionId))
                safeSql = filterResult.sql

                if (filterResult.appliedFilters > 0) {
                    console.log('[chart-data] Applied', filterResult.appliedFilters, 'filters to chart', chartId)
                    meta.filtersApplied = filterResult.appliedFilters
                }
                if (filterResult.skippedFilters > 0) {
                    console.log('[chart-data] Skipped', filterResult.skippedFilters, 'filters for chart', chartId)
                    meta.filtersSkipped = filterResult.skippedFilters
                }
            }

            if (connectionId) {
                // Get connection to check storage location
                const connection = await db.query.dataConnections.findFirst({
                    where: eq(dataConnections.id, Number(connectionId)),
                    columns: { id: true, storageLocation: true, organizationId: true }
                })

                const storageLocation = connection?.storageLocation || 'external'
                console.log(`[chart-data] Chart ${chartId}, Connection ${connectionId}, storageLocation=${storageLocation}`)

                // Derive tenant ID for caching (used as cache partition key)
                let tenantId: string | undefined
                const user = await serverSupabaseUser(event).catch(() => null as any)
                let effectiveOrgId = dashboard.organization_id

                if (user) {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('organization_id')
                        .eq('user_id', user.id)
                        .maybeSingle()

                    if (profile?.organization_id) {
                        effectiveOrgId = profile.organization_id
                    }
                }

                if (effectiveOrgId) {
                    const org = await db.select({ tenantId: organizations.tenantId })
                        .from(organizations)
                        .where(eq(organizations.id, effectiveOrgId))
                        .limit(1)
                        .then(rows => rows[0])

                    tenantId = org?.tenantId || undefined
                }
                const NIL_UUID = '00000000-0000-0000-0000-000000000000'
                const effectiveTenantId = tenantId || NIL_UUID

                // Generate cache key
                const cacheKey = generateCacheKey(chartId, {
                    sql: safeSql,
                    dataSource: storageLocation,
                    filters: filterOverrides
                })

                // Determine caching strategy based on storage location
                // - external (MySQL): Always cache (permanent until manual refresh)
                // - optiqoflow: Cache based on cache_status and dynamic filters
                // - supabase_synced: Always cache (permanent until manual refresh)
                const shouldUseCache =
                    usePermanentCache(storageLocation) ||
                    (storageLocation === 'optiqoflow' && chart.cache_status !== 'dynamic' && !chart.has_dynamic_filter)

                // Try to get cached data
                if (shouldUseCache) {
                    const cached = await getCachedChartData(
                        supabaseAdmin,
                        chartId,
                        effectiveTenantId,
                        cacheKey
                    )

                    if (cached) {
                        console.log(`[chart-data] Cache HIT for chart ${chartId}`)
                        const cachedRows = cached.data as any[]
                        columns = cachedRows.length ? Object.keys(cachedRows[0]).map((k) => ({ key: k, label: k })) : []
                        return {
                            columns,
                            rows: cachedRows,
                            meta: {
                                cached: true,
                                cacheHit: true,
                                dataSource: storageLocation,
                                permanent: storageLocation !== 'optiqoflow',
                                durationMs: Date.now() - queryStartTime
                            }
                        }
                    }
                    console.log(`[chart-data] Cache MISS for chart ${chartId}`)
                }

                // Helper function to execute query with fallback
                async function executeQuery(querySql: string): Promise<any[]> {
                    // Route based on storage_location
                    if (storageLocation === 'optiqoflow') {
                        // OptiqoFlow data with tenant isolation
                        console.log(`[chart-data] Using optiqoflow for connection ${connectionId}`)

                        // Get tenant ID from user's organization (fallback to dashboard org)
                        let tenantIdForQuery: string | undefined
                        const user = await serverSupabaseUser(event).catch(() => null as any)
                        let orgIdForLookup = dashboard.organization_id

                        if (user) {
                            const { data: profile } = await supabaseAdmin
                                .from('profiles')
                                .select('organization_id')
                                .eq('user_id', user.id)
                                .maybeSingle()

                            if (profile?.organization_id) {
                                orgIdForLookup = profile.organization_id
                            }
                        }

                        if (orgIdForLookup) {
                            const org = await db.select({ tenantId: organizations.tenantId })
                                .from(organizations)
                                .where(eq(organizations.id, orgIdForLookup))
                                .limit(1)
                                .then(rows => rows[0])

                            tenantIdForQuery = org?.tenantId || undefined
                        }

                        if (!tenantIdForQuery) {
                            throw new Error('Associated organization does not have a tenant_id configured for Optiqoflow data access.')
                        }

                        const pgSql = translateIdentifiers(querySql)
                        return await executeOptiqoflowQuery(pgSql, sqlParams, tenantIdForQuery)
                    }

                    if (storageLocation === 'supabase_synced') {
                        // Check if connection uses synced internal storage
                        const storageInfo = await loadInternalStorageInfo(Number(connectionId))
                        if (storageInfo.useInternalStorage && storageInfo.schemaName) {
                            console.log(`[chart-data] Using synced storage for chart ${chartId}: ${storageInfo.schemaName}`)
                            return await executeInternalStorageQuery(storageInfo.schemaName, querySql, sqlParams)
                        }
                    }

                    // Default: external MySQL connection
                    console.log(`[chart-data] Using external MySQL for connection ${connectionId}`)
                    // Load connection config
                    let cfg: any
                    if (sameOrg || isRenderContext) {
                        // For same-org users OR trusted render context, load connection directly
                        if (isRenderContext) {
                            // In render context, load connection using service role
                            const { data, error } = await supabaseAdmin
                                .from('data_connections')
                                .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, organization_id')
                                .eq('id', Number(connectionId))
                                .single()

                            if (error || !data) {
                                console.error('[chart-data] Failed to load connection for render context:', error)
                                throw createError({ statusCode: 403, statusMessage: 'Connection not found' })
                            }

                            // Verify connection belongs to same org as dashboard
                            if (data.organization_id !== dashboard.organization_id) {
                                console.error('[chart-data] Render context: connection org mismatch', {
                                    connectionOrg: data.organization_id,
                                    dashboardOrg: dashboard.organization_id,
                                    connectionId: connectionId
                                })
                                throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
                            }

                            cfg = {
                                host: data.host,
                                port: Number(data.port),
                                user: data.username,
                                password: data.password,
                                database: data.database_name,
                                useSshTunneling: !!data.use_ssh_tunneling,
                                ssh: buildSshConfig(data)
                            }
                        } else {
                            cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))
                        }
                    } else {
                        // Public render path: verify the connection belongs to the dashboard org
                        const { data, error } = await supabaseAdmin
                            .from('data_connections')
                            .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, organization_id')
                            .eq('id', Number(connectionId))
                            .single()

                        if (error || !data || data.organization_id !== dashboard.organization_id) {
                            console.error('[chart-data] Access denied to connection', {
                                error,
                                connectionOrg: data?.organization_id,
                                dashboardOrg: dashboard.organization_id,
                                connectionId: connectionId
                            })
                            throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
                        }
                        cfg = {
                            host: data.host,
                            port: Number(data.port),
                            user: data.username,
                            password: data.password,
                            database: data.database_name,
                            useSshTunneling: !!data.use_ssh_tunneling,
                            ssh: buildSshConfig(data)
                        }
                    }

                    return await withMySqlConnectionConfig(cfg, async (conn) => {
                        const [res] = await conn.query(querySql, sqlParams)
                        return res as any[]
                    })
                }

                // Try filtered query first, fallback to original if it fails
                try {
                    rows = await executeQuery(safeSql)
                } catch (filterError: any) {
                    if (filterResult.appliedFilters > 0) {
                        // Filtered query failed, try original - log full details for debugging
                        console.warn('[chart-data] Filtered query failed for chart', chartId)
                        console.warn('[chart-data] Error:', filterError?.message)
                        console.warn('[chart-data] Filtered SQL:', safeSql)
                        console.warn('[chart-data] Applied filters:', JSON.stringify(filterOverrides, null, 2))
                        console.log('[chart-data] Falling back to unfiltered query')

                        try {
                            rows = await executeQuery(originalSql)
                            meta.filterWarning = 'Filter could not be applied to this chart'
                            meta.filterError = filterError?.message

                        } catch (originalError: any) {
                            // Both failed, throw the original error
                            throw originalError
                        }
                    } else {
                        // No filters were applied, just throw
                        throw filterError
                    }
                }

                columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []

                // Store in cache (async, non-blocking)
                const queryDurationMs = Date.now() - queryStartTime
                if (shouldUseCache) {
                    const sourceTables = extractTablesFromStateJson(sj)

                    event.waitUntil(
                        setCachedChartData(
                            supabaseAdmin,
                            chartId,
                            effectiveTenantId,
                            cacheKey,
                            rows,
                            storageLocation !== 'optiqoflow' ? ['_permanent'] : sourceTables,
                            queryDurationMs
                        ).catch(e => console.error('[chart-data] Cache storage error:', e))
                    )

                    meta.cached = false
                    meta.cacheHit = false
                    meta.dataSource = storageLocation
                    meta.permanent = storageLocation !== 'optiqoflow'
                }
            } else {
                // No connection ID - should not happen for saved charts
                meta.error = 'no_connection_id'
            }
        } else {
            meta.error = 'no_sql_available'
        }
    } catch (e: any) {
        console.error('[chart-data] Query error for chart', chartId, ':', e?.message || e)
        meta.error = e?.statusMessage || e?.message || 'query_failed'
    }


    return {
        columns,
        rows,
        meta: Object.keys(meta).length > 0 ? meta : undefined
    }
})
