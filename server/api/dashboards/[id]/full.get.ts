import { defineEventHandler, getQuery } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import { validateRenderContext } from '../../../utils/renderContext'
import { sanitizeChartState } from '../../../utils/sanitizeChartState'
import { getCachedChartData, generateCacheKey } from '../../../utils/chart-cache'
import { db } from '../../../../lib/db'
import { organizations } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

/**
 * GET /api/dashboards/:id/full
 * 
 * Returns dashboard metadata, tabs, and widget configurations.
 * Does NOT fetch chart data - charts should fetch their own data using
 * /api/dashboards/:id/charts/:chartId/data for progressive loading.
 */
export default defineEventHandler(async (event) => {
    try {
        const id = event.context.params?.id as string
        if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

        // Check for render context token and password
        const query = getQuery(event)
        const contextToken = query.context as string | undefined
        const providedPassword = query.password as string | undefined
        const isRenderContext = contextToken ? validateRenderContext(contextToken) : false

        // Load dashboard first
        let dashboard: any
        try {
            const { data, error: dashError } = await supabaseAdmin
                .from('dashboards')
                .select('id, name, organization_id, creator, is_public, password, created_at, width, height, thumbnail_url')
                .eq('id', id)
                .single()

            if (dashError || !data) {
                throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
            }
            dashboard = data
            console.log('Dashboard loaded:', { id: dashboard.id, isPublic: dashboard.is_public, hasPassword: !!dashboard.password })
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Failed to load dashboard' })
        }

        // Access control: if not public, require org membership OR valid render context
        let user: any = null
        let userOrg: string | null = null
        let sameOrg = false
        let isOwner = false
        try {
            if (!dashboard.is_public && !isRenderContext) {
                user = await serverSupabaseUser(event)
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
                userOrg = profile.organization_id
                sameOrg = userOrg === dashboard.organization_id

                // Strict Access Control
                const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(profile.role)
                const isCreator = dashboard.creator === user.id

                if (isAdmin || isCreator) {
                    if (!sameOrg && !isAdmin) { // Admins might access cross-org? Assumed bounded by org for now.
                        // Actually, if sameOrg is required for admins/creators logic:
                        if (!sameOrg) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
                    }
                    isOwner = true
                } else {
                    // Check explicit access for Editors/Viewers
                    if (!sameOrg) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

                    const { data: accessRules } = await supabaseAdmin
                        .from('dashboard_access')
                        .select('access_level')
                        .eq('dashboard_id', dashboard.id)
                        .or(`target_user_id.eq.${user.id},target_org_id.eq.${userOrg}`)

                    if (!accessRules || accessRules.length === 0) {
                        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
                    }

                    // Determine if has edit access
                    const hasEdit = accessRules.some((rule: any) => rule.access_level === 'edit')
                    isOwner = hasEdit
                }
            } else {
                // For public dashboards, capture org context if user is present
                user = await serverSupabaseUser(event).catch(() => null as any)
                if (user) {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('organization_id')
                        .eq('user_id', user.id)
                        .maybeSingle()
                    userOrg = profile?.organization_id ?? null
                    sameOrg = !!userOrg && userOrg === dashboard.organization_id
                    isOwner = sameOrg
                }
            }
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error in access control:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Access control error' })
        }

        // Load tabs
        let tabs: any[] = []
        try {
            const { data: tabsData, error: tabsError } = await supabaseAdmin
                .from('dashboard_tab')
                .select('id, name, position, style, options')
                .eq('dashboard_id', dashboard.id)
                .order('position', { ascending: true })

            if (tabsError) {
                throw createError({ statusCode: 500, statusMessage: tabsError.message })
            }
            tabs = tabsData || []
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard tabs:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Failed to load dashboard tabs' })
        }

        // Load widgets for all tabs
        let widgets: any[] = []
        try {
            if (tabs.length > 0) {
                const tabIds = tabs.map((t: any) => t.id)
                const { data: widgetsData, error: widgetsError } = await supabaseAdmin
                    .from('dashboard_widgets')
                    .select('id, tab_id, dashboard_id, type, chart_id, position, style, config_override, created_at')
                    .eq('dashboard_id', dashboard.id)
                    .in('tab_id', tabIds)
                    .order('created_at', { ascending: true })

                if (widgetsError) {
                    throw createError({ statusCode: 500, statusMessage: widgetsError.message })
                }
                widgets = widgetsData || []
            }
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard widgets:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Failed to load dashboard widgets' })
        }

        // Load charts (metadata only - no data fetching)
        const chartIds: number[] = (widgets || [])
            .filter((w: any) => w.type === 'chart' && w.chart_id != null)
            .map((l: any) => l.chart_id)
        const chartsById: Record<number, any> = {}
        try {
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
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading charts:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Failed to load charts' })
        }

        // Group widgets by tab
        const widgetsByTab: Record<string, any[]> = {}
        for (const widget of widgets || []) {
            if (!widgetsByTab[widget.tab_id]) {
                widgetsByTab[widget.tab_id] = []
            }
            widgetsByTab[widget.tab_id].push(widget)
        }

        // Resolve tenant ID for cache lookups (using dashboard's organization)
        let effectiveTenantId: string = 'default'
        try {
            if (dashboard.organization_id) {
                const orgRecord = await db.select({ tenantId: organizations.tenantId })
                    .from(organizations)
                    .where(eq(organizations.id, dashboard.organization_id))
                    .limit(1)
                    .then(rows => rows[0])
                effectiveTenantId = orgRecord?.tenantId || 'default'
            }
        } catch (e) {
            console.warn('[full.get.ts] Could not resolve tenant ID for cache lookup')
        }

        // Parallel cache lookup for all charts
        const cacheByChartId: Record<number, { cached: boolean; columns?: any[]; rows?: any[] }> = {}
        if (chartIds.length > 0 && effectiveTenantId !== 'default') {
            try {
                const cachePromises = chartIds.map(async (chartId) => {
                    const chart = chartsById[chartId]
                    if (!chart) return { chartId, cached: false }

                    const sj = chart.state_json || {}
                    const internal = sj.internal || {}
                    const sql = internal.actualExecutedSql || internal.sqlText || sj.actualExecutedSql || sj.sqlText
                    const connectionId = internal.dataConnectionId || sj.dataConnectionId

                    // Only check cache for charts with SQL and connection
                    if (!sql || !connectionId) return { chartId, cached: false }

                    // Generate cache key (without filters - base query only)
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
                console.warn('[full.get.ts] Cache lookup failed, proceeding without cached data:', e)
            }
        }

        // Build tab results with widgets (no data fetching for charts)
        const tabResults = tabs.map((tab: any) => {
            const tabWidgets = widgetsByTab[tab.id] || []

            // Process chart widgets - sanitized metadata with optional cached data
            const chartResults = tabWidgets
                .filter((w: any) => w.type === 'chart')
                .map((lnk: any) => {
                    const chart = chartsById[lnk.chart_id]
                    if (!chart) {
                        console.warn('[full.get.ts] Chart not found:', lnk.chart_id)
                    }

                    // Sanitize state - removes raw SQL and other sensitive fields
                    const responseState = sanitizeChartState(chart?.state_json)

                    // Check for cached data
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
                        // Progressive loading fields
                        dataStatus: hasCachedData ? 'cached' : 'pending',
                        preloadedColumns: hasCachedData ? cacheEntry.columns : undefined,
                        preloadedRows: hasCachedData ? cacheEntry.rows : undefined
                    }
                })

            // Process text widgets
            const textResults = tabWidgets
                .filter((w: any) => w.type === 'text')
                .map((w: any) => ({
                    id: w.chart_id || null,
                    widgetId: w.id,
                    type: 'text' as const,
                    position: w.position,
                    style: w.style || {},
                    configOverride: w.config_override || {}
                }))

            // Process image widgets
            const imageResults = tabWidgets
                .filter((w: any) => w.type === 'image')
                .map((w: any) => ({
                    id: w.chart_id || null,
                    widgetId: w.id,
                    type: 'image' as const,
                    position: w.position,
                    style: w.style || {},
                    configOverride: w.config_override || {}
                }))

            // Process icon widgets
            const iconResults = tabWidgets
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
                id: tab.id,
                name: tab.name,
                position: tab.position,
                style: tab.style ?? {},
                options: tab.options ?? {},
                widgets: [
                    ...chartResults,
                    ...textResults,
                    ...imageResults,
                    ...iconResults
                ]
            }
        })

        return {
            id: dashboard.id,
            name: dashboard.name,
            isPublic: dashboard.is_public,
            password: !!dashboard.password, // Return boolean indicating if password is set
            createdAt: dashboard.created_at,
            width: dashboard.width,
            height: dashboard.height,
            thumbnailUrl: dashboard.thumbnail_url,
            tabs: tabResults
        }
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[full.get.ts] Unexpected error:', e?.message || e)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
