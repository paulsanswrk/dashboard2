import { defineEventHandler, getQuery } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../../../supabase'
import { withMySqlConnectionConfig } from '../../../../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../../../../utils/connectionConfig'
import { validateRenderContext } from '../../../../../utils/renderContext'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../../../../utils/internalStorageQuery'
import { injectFiltersIntoSql, type FilterOverride } from '../../../../../utils/filterInjection'
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
            .select('id, name, organization_id, creator, is_public')
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
            .select('id, name, state_json')
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
                // Check if connection uses internal storage
                const storageInfo = await loadInternalStorageInfo(Number(connectionId))

                // Helper function to execute query with fallback
                async function executeQuery(querySql: string): Promise<any[]> {
                    if (storageInfo.useInternalStorage && storageInfo.schemaName) {
                        console.log(`[chart-data] Using internal storage for chart ${chartId}: ${storageInfo.schemaName}`)
                        return await executeInternalStorageQuery(storageInfo.schemaName, querySql, sqlParams)
                    } else {
                        // Load connection config
                        let cfg: any
                        if (sameOrg) {
                            cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))
                        } else {
                            // Public render path: verify the connection belongs to the dashboard org
                            const { data, error } = await supabaseAdmin
                                .from('data_connections')
                                .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, organization_id')
                                .eq('id', Number(connectionId))
                                .single()

                            if (error || !data || data.organization_id !== dashboard.organization_id) {
                                throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
                            }
                            cfg = {
                                host: data.host,
                                port: Number(data.port),
                                user: data.username,
                                password: data.password,
                                database: data.database_name,
                                useSshTunneling: !!data.use_ssh_tunneling,
                                ssh: data.use_ssh_tunneling ? {
                                    host: data.ssh_host,
                                    port: Number(data.ssh_port),
                                    user: data.ssh_user,
                                    password: data.ssh_password || undefined,
                                    privateKey: data.ssh_private_key || undefined
                                } : undefined
                            }
                        }

                        return await withMySqlConnectionConfig(cfg, async (conn) => {
                            const [res] = await conn.query(querySql, sqlParams)
                            return res as any[]
                        })
                    }
                }

                // Try filtered query first, fallback to original if it fails
                try {
                    rows = await executeQuery(safeSql)
                } catch (filterError: any) {
                    if (filterResult.appliedFilters > 0) {
                        // Filtered query failed, try original
                        console.warn('[chart-data] Filtered query failed for chart', chartId, ':', filterError?.message)
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
