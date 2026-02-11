import { defineEventHandler } from 'h3'
import { supabaseAdmin } from '../../../../supabase'
import { sanitizeChartState } from '../../../../../utils/sanitizeChartState'
import { getCachedChartData, generateCacheKey } from '../../../../../utils/chart-cache'
import { db } from '../../../../../../lib/db'
import { organizations } from '../../../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuthHelper } from '~/server/utils/authHelper'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

/**
 * GET /api/dashboards/:id/tabs/:tabId/widgets
 *
 * Returns widgets for a specific tab, including chart metadata and cached data.
 * Used for lazy-loading tab content when the user switches tabs.
 */
export default defineEventHandler(async (event) => {
    try {
        const dashboardId = event.context.params?.id as string
        const tabId = event.context.params?.tabId as string
        if (!dashboardId) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })
        if (!tabId) throw createError({ statusCode: 400, statusMessage: 'Missing tab id' })

        // Access control - reuses the same auth helper as other dashboard endpoints
        const ctx = await AuthHelper.requireAuthContext(event)

        // Verify dashboard belongs to user's organization
        const { data: dashboard, error: dashboardError } = await supabaseAdmin
            .from('dashboards')
            .select('id, organization_id')
            .eq('id', dashboardId)
            .single()

        if (dashboardError || !dashboard) {
            throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
        }

        if (dashboard.organization_id !== ctx.organizationId) {
            throw createError({ statusCode: 403, statusMessage: 'Access denied' })
        }

        // Load widgets for this specific tab
        const { data: widgetsData, error: widgetsError } = await supabaseAdmin
            .from('dashboard_widgets')
            .select('id, tab_id, dashboard_id, type, chart_id, position, style, config_override, created_at')
            .eq('dashboard_id', dashboardId)
            .eq('tab_id', tabId)
            .order('created_at', { ascending: true })

        if (widgetsError) {
            throw createError({ statusCode: 500, statusMessage: widgetsError.message })
        }
        const widgets = widgetsData || []

        // Load chart metadata
        const chartIds: number[] = widgets
            .filter((w: any) => w.type === 'chart' && w.chart_id != null)
            .map((w: any) => w.chart_id)
        const chartsById: Record<number, any> = {}

        if (chartIds.length) {
            const { data: charts, error: chartsError } = await supabaseAdmin
                .from('charts')
                .select('id, name, description, state_json')
                .in('id', chartIds)

            if (chartsError) {
                throw createError({ statusCode: 500, statusMessage: chartsError.message })
            }
            for (const c of charts || []) chartsById[c.id] = c
        }

        // Resolve tenant ID for cache lookups
        const NIL_UUID = '00000000-0000-0000-0000-000000000000'
        let effectiveTenantId: string = NIL_UUID
        try {
            if (dashboard.organization_id) {
                const orgRecord = await db.select({ tenantId: organizations.tenantId })
                    .from(organizations)
                    .where(eq(organizations.id, dashboard.organization_id))
                    .limit(1)
                    .then(rows => rows[0])
                effectiveTenantId = orgRecord?.tenantId || NIL_UUID
            }
        } catch (e) {
            console.warn('[tab-widgets] Could not resolve tenant ID for cache lookup')
        }

        // Parallel cache lookup for tab charts
        const cacheByChartId: Record<number, { cached: boolean; columns?: any[]; rows?: any[] }> = {}
        if (chartIds.length > 0) {
            try {
                const cachePromises = chartIds.map(async (chartId) => {
                    const chart = chartsById[chartId]
                    if (!chart) return { chartId, cached: false }

                    const sj = chart.state_json || {}
                    const internal = sj.internal || {}
                    const sql = internal.actualExecutedSql || internal.sqlText || sj.actualExecutedSql || sj.sqlText
                    const connectionId = internal.dataConnectionId || sj.dataConnectionId

                    if (!sql || !connectionId) return { chartId, cached: false }

                    const cacheKey = generateCacheKey(chartId, { sql, dataSource: 'query', filters: [] })
                    const cachedResult = await getCachedChartData(supabaseAdmin, chartId, effectiveTenantId, cacheKey)

                    if (cachedResult && cachedResult.hit) {
                        const cachedRows = cachedResult.data as any[]
                        const columns = cachedRows.length > 0
                            ? Object.keys(cachedRows[0]).map(k => ({ key: k, label: k }))
                            : []
                        return { chartId, cached: true, columns, rows: cachedRows }
                    }
                    return { chartId, cached: false }
                })

                const cacheResults = await Promise.all(cachePromises)
                for (const result of cacheResults) {
                    cacheByChartId[result.chartId] = result
                }
            } catch (e) {
                console.warn('[tab-widgets] Cache lookup failed, proceeding without cached data:', e)
            }
        }

        // Build widget results
        const chartResults = widgets
            .filter((w: any) => w.type === 'chart')
            .map((lnk: any) => {
                const chart = chartsById[lnk.chart_id]
                const responseState = sanitizeChartState(chart?.state_json)
                const cacheEntry = cacheByChartId[lnk.chart_id]
                const hasCachedData = cacheEntry?.cached === true

                return {
                    id: lnk.chart_id,
                    widgetId: lnk.id,
                    type: 'chart' as const,
                    name: chart?.name || '',
                    position: lnk.position,
                    configOverride: lnk.config_override || {},
                    state: responseState,
                    style: lnk.style || {},
                    dataStatus: hasCachedData ? 'cached' : 'pending',
                    preloadedColumns: hasCachedData ? cacheEntry.columns : undefined,
                    preloadedRows: hasCachedData ? cacheEntry.rows : undefined
                }
            })

        const textResults = widgets
            .filter((w: any) => w.type === 'text')
            .map((w: any) => ({
                id: w.chart_id || null,
                widgetId: w.id,
                type: 'text' as const,
                position: w.position,
                style: w.style || {},
                configOverride: w.config_override || {}
            }))

        const imageResults = widgets
            .filter((w: any) => w.type === 'image')
            .map((w: any) => ({
                id: w.chart_id || null,
                widgetId: w.id,
                type: 'image' as const,
                position: w.position,
                style: w.style || {},
                configOverride: w.config_override || {}
            }))

        const iconResults = widgets
            .filter((w: any) => w.type === 'icon')
            .map((w: any) => ({
                id: w.chart_id || null,
                widgetId: w.id,
                type: 'icon' as const,
                position: w.position,
                style: w.style || {},
                configOverride: w.config_override || {}
            }))

        return {
            tabId,
            widgets: [
                ...chartResults,
                ...textResults,
                ...imageResults,
                ...iconResults
            ]
        }
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[tab-widgets] Unexpected error:', e?.message || e)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
