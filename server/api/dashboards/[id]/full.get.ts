import {defineEventHandler, getQuery} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
import {withMySqlConnection, withMySqlConnectionConfig} from '../../../utils/mysqlClient'
import {loadConnectionConfigFromSupabase} from '../../../utils/connectionConfig'
import {validateRenderContext} from '../../../utils/renderContext'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    try {
        const id = event.context.params?.id as string
        if (!id) throw createError({statusCode: 400, statusMessage: 'Missing dashboard id'})

        // Check for render context token
        const query = getQuery(event)
        const contextToken = query.context as string | undefined
        const isRenderContext = contextToken ? validateRenderContext(contextToken) : false

        // Load dashboard first
        let dashboard: any
        try {
            const {data, error: dashError} = await supabaseAdmin
                .from('dashboards')
                .select('id, name, organization_id, creator, is_public, created_at')
                .eq('id', id)
                .single()

            if (dashError || !data) {
                throw createError({statusCode: 404, statusMessage: 'Dashboard not found'})
            }
            dashboard = data
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard:', e?.message || e)
            throw createError({statusCode: 500, statusMessage: 'Failed to load dashboard'})
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
                    throw createError({statusCode: 403, statusMessage: 'Forbidden'})
                }
                const {data: profile, error: profileError} = await supabaseAdmin
                    .from('profiles')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .single()
                if (profileError || !profile?.organization_id) {
                    throw createError({statusCode: 403, statusMessage: 'Forbidden'})
                }
                userOrg = profile.organization_id
                sameOrg = userOrg === dashboard.organization_id
                isOwner = sameOrg // org-scoped ownership; org members can edit
                if (!sameOrg) {
                    throw createError({statusCode: 403, statusMessage: 'Forbidden'})
                }
            } else {
                // For public dashboards, capture org context if user is present
                user = await serverSupabaseUser(event).catch(() => null as any)
                if (user) {
                    const {data: profile} = await supabaseAdmin
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
            throw createError({statusCode: 500, statusMessage: 'Access control error'})
        }

        // Load tabs
        let tabs: any[] = []
        try {
            const {data: tabsData, error: tabsError} = await supabaseAdmin
                .from('dashboard_tab')
                .select('id, name, position')
                .eq('dashboard_id', dashboard.id)
                .order('position', {ascending: true})

            if (tabsError) {
                throw createError({statusCode: 500, statusMessage: tabsError.message})
            }
            tabs = tabsData || []
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard tabs:', e?.message || e)
            throw createError({statusCode: 500, statusMessage: 'Failed to load dashboard tabs'})
        }

        // Load chart links for all tabs
        let links: any[] = []
        try {
            if (tabs.length > 0) {
                const tabIds = tabs.map((t: any) => t.id)
                const {data: linksData, error: linksError} = await supabaseAdmin
                    .from('dashboard_charts')
                    .select('tab_id, chart_id, position, created_at')
                    .in('tab_id', tabIds)
                    .order('created_at', {ascending: true})

                if (linksError) {
                    throw createError({statusCode: 500, statusMessage: linksError.message})
                }
                links = linksData || []
            }
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading dashboard charts:', e?.message || e)
            throw createError({statusCode: 500, statusMessage: 'Failed to load dashboard charts'})
        }

        // Load charts
        const chartIds: number[] = (links || []).map((l: any) => l.chart_id)
        const chartsById: Record<number, any> = {}
        try {
            if (chartIds.length) {
                const {data: charts, error: chartsError} = await supabaseAdmin
                    .from('charts')
                    .select('id, name, description, state_json')
                    .in('id', chartIds)

                if (chartsError) {
                    throw createError({statusCode: 500, statusMessage: chartsError.message})
                }
                for (const c of charts || []) chartsById[c.id] = c
            }
        } catch (e: any) {
            if (e.statusCode) throw e
            console.error('[full.get.ts] Error loading charts:', e?.message || e)
            throw createError({statusCode: 500, statusMessage: 'Failed to load charts'})
        }

        async function loadConnectionConfigForOwner(connectionId: number) {
            try {
                // If same org as dashboard, reuse helper (enforces ownership/org on that helper)
                if (sameOrg) {
                    return await loadConnectionConfigFromSupabase(event, Number(connectionId))
                }
                // Public render path: verify the connection belongs to the dashboard org, then build cfg
                const {data, error} = await supabaseAdmin
                    .from('data_connections')
                    .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, organization_id')
                    .eq('id', Number(connectionId))
                    .single()

                if (error || !data || data.organization_id !== dashboard.organization_id) {
                    throw createError({statusCode: 403, statusMessage: 'Access to connection denied'})
                }
                return {
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
            } catch (e: any) {
                if (e.statusCode) throw e
                console.error('[full.get.ts] Error in loadConnectionConfigForOwner:', e?.message || e)
                throw createError({statusCode: 500, statusMessage: 'Failed to load connection config'})
            }
        }

        // Group links by tab
        const linksByTab: Record<string, any[]> = {}
        for (const link of links || []) {
            if (!linksByTab[link.tab_id]) {
                linksByTab[link.tab_id] = []
            }
            linksByTab[link.tab_id].push(link)
        }

        // Fetch external data for all charts in parallel (uses internal info server-side)
        const tabTasks = tabs.map(async (tab: any) => {
            const tabLinks = linksByTab[tab.id] || []
            const chartTasks = tabLinks.map(async (lnk: any) => {
            try {
                const chart = chartsById[lnk.chart_id]
                if (!chart) {
                    console.warn('[full.get.ts] Chart not found:', lnk.chart_id)
                }
                const sj = (chart?.state_json || {}) as any
                const internal = sj.internal || {}
                const effective = {...sj, ...internal}
                delete (effective as any).internal

                // Prepare data using internal info
                let columns: any[] = []
                let rows: any[] = []
                const meta: Record<string, any> = {}

                try {
                    const sql = internal.actualExecutedSql || internal.sqlText || ''
                    const connectionId = internal.dataConnectionId ?? null

                    if (sql) {
                        let safeSql = sql.trim()
                        if (!/\blimit\b/i.test(safeSql)) safeSql = `${safeSql} LIMIT 500`

                        if (connectionId) {
                            try {
                                const cfg = await loadConnectionConfigForOwner(Number(connectionId))
                                const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
                                    const [res] = await conn.query({sql: safeSql, timeout: 10000} as any)
                                    return res as any[]
                                })
                                rows = resRows
                            } catch (e: any) {
                                console.error('[full.get.ts] Query error (chart', lnk.chart_id, '):', e?.message || e)
                                throw e
                            }
                        } else {
                            try {
                                const resRows = await withMySqlConnection(async (conn) => {
                                    const [res] = await conn.query({sql: safeSql, timeout: 10000} as any)
                                    return res as any[]
                                })
                                rows = resRows
                            } catch (e: any) {
                                console.error('[full.get.ts] Query error (chart', lnk.chart_id, '):', e?.message || e)
                                throw e
                            }
                        }
                        columns = rows.length ? Object.keys(rows[0]).map((k) => ({key: k, label: k})) : []
                    } else {
                        // No SQL available, try to fetch data using dataset preview logic
                        try {
                            const datasetId = internal.selectedDatasetId
                            if (datasetId) {
                                // For server-side rendering, we need to simulate the dataset preview
                                // For now, we'll leave this empty and let client-side handle it
                                // TODO: Implement server-side dataset preview
                                meta.error = 'client_side_fetch_required'
                            } else {
                                meta.error = 'no_dataset_or_sql'
                            }
                        } catch (e: any) {
                            meta.error = e?.statusMessage || e?.message || 'dataset_preview_failed'
                        }
                    }
                } catch (e: any) {
                    meta.error = e?.statusMessage || e?.message || 'query_failed'
                }

                // Build state for response: owner gets flattened full state; public gets only public subset
                const responseState = isOwner ? effective : sj // sj contains only public keys + internal hidden

                // Sanitize meta for public: do not include SQL
                if (!isOwner) delete (meta as any).sql

                return {
                    id: lnk.chart_id,
                    name: chart?.name || '',
                    position: lnk.position,
                    state: responseState,
                    data: {columns, rows, meta}
                }
            } catch (e: any) {
                console.error('[full.get.ts] Fatal error processing chart', lnk.chart_id, ':', e?.message || e)
                // Return error state instead of throwing to prevent Promise.all from failing
                return {
                    id: lnk.chart_id,
                    name: chartsById[lnk.chart_id]?.name || '',
                    position: lnk.position,
                    state: {},
                    data: {columns: [], rows: [], meta: {error: e?.statusMessage || e?.message || 'chart_processing_failed'}}
                }
            }
            })

            const chartResults = await Promise.all(chartTasks)

            return {
                id: tab.id,
                name: tab.name,
                position: tab.position,
                charts: chartResults
            }
        })

        let tabResults: any[]
        try {
            tabResults = await Promise.all(tabTasks)
        } catch (e: any) {
            console.error('[full.get.ts] Error in Promise.all:', e?.message || e)
            throw createError({statusCode: 500, statusMessage: 'Failed to process tabs'})
        }

        return {
            id: dashboard.id,
            name: dashboard.name,
            isPublic: dashboard.is_public,
            createdAt: dashboard.created_at,
            tabs: tabResults
        }
    } catch (e: any) {
        if (e.statusCode) throw e
        console.error('[full.get.ts] Unexpected error:', e?.message || e)
        throw createError({statusCode: 500, statusMessage: 'Internal server error'})
  }
})


