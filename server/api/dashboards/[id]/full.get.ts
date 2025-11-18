import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
import {withMySqlConnection, withMySqlConnectionConfig} from '../../../utils/mysqlClient'
import {loadConnectionConfigFromSupabase} from '../../../utils/connectionConfig'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    try {
        console.log('[full.get.ts] Handler started')
        const id = event.context.params?.id as string
        console.log('[full.get.ts] Dashboard ID:', id)
        if (!id) throw createError({statusCode: 400, statusMessage: 'Missing dashboard id'})

        // Load dashboard first
        let dashboard: any
        try {
            console.log('[full.get.ts] Loading dashboard from Supabase...')
            const {data, error: dashError} = await supabaseAdmin
                .from('dashboards')
                .select('id, name, owner_id, is_public, created_at')
                .eq('id', id)
                .single()

            console.log('[full.get.ts] Dashboard query result:', {hasData: !!data, error: dashError?.message})

            if (dashError || !data) {
                console.error('[full.get.ts] Dashboard not found:', {error: dashError, id})
                throw createError({statusCode: 404, statusMessage: 'Dashboard not found'})
            }
            dashboard = data
            console.log('[full.get.ts] Dashboard loaded:', {id: dashboard.id, name: dashboard.name, isPublic: dashboard.is_public})
        } catch (e: any) {
            console.error('[full.get.ts] Error loading dashboard:', {
                error: e,
                message: e?.message,
                statusCode: e?.statusCode,
                statusMessage: e?.statusMessage,
                stack: e?.stack
            })
            throw e
        }

        // Access control: if not public, require owner
        try {
            if (!dashboard.is_public) {
                console.log('[full.get.ts] Dashboard is private, checking user access...')
                const user = await serverSupabaseUser(event)
                console.log('[full.get.ts] User check result:', {hasUser: !!user, userId: user?.id, ownerId: dashboard.owner_id})
                if (!user || user.id !== dashboard.owner_id) {
                    console.error('[full.get.ts] Access denied:', {userId: user?.id, ownerId: dashboard.owner_id})
                    throw createError({statusCode: 403, statusMessage: 'Forbidden'})
                }
            } else {
                console.log('[full.get.ts] Dashboard is public, skipping access check')
            }
        } catch (e: any) {
            console.error('[full.get.ts] Error in access control:', {
                error: e,
                message: e?.message,
                statusCode: e?.statusCode,
                statusMessage: e?.statusMessage,
                stack: e?.stack
            })
            throw e
        }

        // Load positions
        let links: any[] = []
        try {
            console.log('[full.get.ts] Loading dashboard_charts links...')
            const {data: linksData, error: linksError} = await supabaseAdmin
                .from('dashboard_charts')
                .select('chart_id, position, created_at')
                .eq('dashboard_id', dashboard.id)
                .order('created_at', {ascending: true})

            console.log('[full.get.ts] Links query result:', {count: linksData?.length || 0, error: linksError?.message})

            if (linksError) {
                console.error('[full.get.ts] Error loading links:', {error: linksError, dashboardId: dashboard.id})
                throw createError({statusCode: 500, statusMessage: linksError.message})
            }
            links = linksData || []
            console.log('[full.get.ts] Links loaded:', links.length)
        } catch (e: any) {
            console.error('[full.get.ts] Error loading dashboard_charts:', {
                error: e,
                message: e?.message,
                statusCode: e?.statusCode,
                statusMessage: e?.statusMessage,
                stack: e?.stack
            })
            throw e
        }

        // Load charts
        const chartIds: number[] = (links || []).map((l: any) => l.chart_id)
        const chartsById: Record<number, any> = {}
        try {
            if (chartIds.length) {
                console.log('[full.get.ts] Loading charts:', {chartIds})
                const {data: charts, error: chartsError} = await supabaseAdmin
                    .from('charts')
                    .select('id, name, description, state_json')
                    .in('id', chartIds)

                console.log('[full.get.ts] Charts query result:', {count: charts?.length || 0, error: chartsError?.message})

                if (chartsError) {
                    console.error('[full.get.ts] Error loading charts:', {error: chartsError, chartIds})
                    throw createError({statusCode: 500, statusMessage: chartsError.message})
                }
                for (const c of charts || []) chartsById[c.id] = c
                console.log('[full.get.ts] Charts loaded:', Object.keys(chartsById).length)
            } else {
                console.log('[full.get.ts] No charts to load')
            }
        } catch (e: any) {
            console.error('[full.get.ts] Error loading charts:', {
                error: e,
                message: e?.message,
                statusCode: e?.statusCode,
                statusMessage: e?.statusMessage,
                stack: e?.stack,
                chartIds
            })
            throw e
        }

        // Get user and determine ownership
        let user: any = null
        let isOwner = false
        try {
            console.log('[full.get.ts] Checking user authentication...')
            user = await serverSupabaseUser(event).catch(() => null as any)
            isOwner = !!user && user.id === dashboard.owner_id
            console.log('[full.get.ts] User check:', {hasUser: !!user, userId: user?.id, isOwner})
        } catch (e: any) {
            console.error('[full.get.ts] Error checking user:', {
                error: e,
                message: e?.message,
                stack: e?.stack
            })
            // Non-fatal, continue with user = null
        }

        async function loadConnectionConfigForOwner(connectionId: number) {
            try {
                console.log('[full.get.ts] loadConnectionConfigForOwner called:', {connectionId, isOwner})
                // If owner is the requester, reuse existing helper (enforces ownership)
                if (isOwner) {
                    console.log('[full.get.ts] Loading connection config as owner...')
                    const config = await loadConnectionConfigFromSupabase(event, Number(connectionId))
                    console.log('[full.get.ts] Connection config loaded (owner path):', {connectionId, hasConfig: !!config})
                    return config
                }
                // Public access path: verify the connection belongs to the dashboard owner, then build cfg
                console.log('[full.get.ts] Loading connection config for public access...')
                const {data, error} = await supabaseAdmin
                    .from('data_connections')
                    .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, owner_id')
                    .eq('id', Number(connectionId))
                    .single()

                console.log('[full.get.ts] Connection query result:', {hasData: !!data, error: error?.message, ownerId: data?.owner_id, dashboardOwnerId: dashboard.owner_id})

                if (error || !data || data.owner_id !== dashboard.owner_id) {
                    console.error('[full.get.ts] Access to connection denied:', {error, connectionId, dataOwnerId: data?.owner_id, dashboardOwnerId: dashboard.owner_id})
                    throw createError({statusCode: 403, statusMessage: 'Access to connection denied'})
                }
                const config = {
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
                console.log('[full.get.ts] Connection config built (public path):', {connectionId, hasSsh: !!config.useSshTunneling})
                return config
            } catch (e: any) {
                console.error('[full.get.ts] Error in loadConnectionConfigForOwner:', {
                    error: e,
                    message: e?.message,
                    statusCode: e?.statusCode,
                    statusMessage: e?.statusMessage,
                    stack: e?.stack,
                    connectionId
                })
                throw e
            }
        }

        // Fetch external data for all charts in parallel (uses internal info server-side)
        console.log('[full.get.ts] Starting chart data fetching tasks:', {chartCount: links.length})
        const tasks = (links || []).map(async (lnk: any) => {
            try {
                console.log('[full.get.ts] Processing chart:', {chartId: lnk.chart_id, position: lnk.position})
                const chart = chartsById[lnk.chart_id]
                if (!chart) {
                    console.warn('[full.get.ts] Chart not found in chartsById:', {chartId: lnk.chart_id, availableIds: Object.keys(chartsById)})
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
                    console.log('[full.get.ts] Chart data fetch:', {chartId: lnk.chart_id, hasSql: !!sql, connectionId})

                    if (sql) {
                        let safeSql = sql.trim()
                        if (!/\blimit\b/i.test(safeSql)) safeSql = `${safeSql} LIMIT 500`
                        console.log('[full.get.ts] Executing SQL:', {chartId: lnk.chart_id, sqlLength: safeSql.length, hasConnectionId: !!connectionId})

                        if (connectionId) {
                            try {
                                const cfg = await loadConnectionConfigForOwner(Number(connectionId))
                                console.log('[full.get.ts] Connection config loaded, executing query:', {chartId: lnk.chart_id, connectionId})
                                const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
                                    console.log('[full.get.ts] Running query with connection config:', {chartId: lnk.chart_id})
                                    const [res] = await conn.query({sql: safeSql, timeout: 10000} as any)
                                    return res as any[]
                                })
                                rows = resRows
                                console.log('[full.get.ts] Query executed successfully:', {chartId: lnk.chart_id, rowCount: rows.length})
                            } catch (e: any) {
                                console.error('[full.get.ts] Error executing query with connection config:', {
                                    chartId: lnk.chart_id,
                                    connectionId,
                                    error: e,
                                    message: e?.message,
                                    stack: e?.stack
                                })
                                throw e
                            }
                        } else {
                            try {
                                console.log('[full.get.ts] Executing query with default connection:', {chartId: lnk.chart_id})
                                const resRows = await withMySqlConnection(async (conn) => {
                                    console.log('[full.get.ts] Running query with default connection:', {chartId: lnk.chart_id})
                                    const [res] = await conn.query({sql: safeSql, timeout: 10000} as any)
                                    return res as any[]
                                })
                                rows = resRows
                                console.log('[full.get.ts] Query executed successfully (default):', {chartId: lnk.chart_id, rowCount: rows.length})
                            } catch (e: any) {
                                console.error('[full.get.ts] Error executing query with default connection:', {
                                    chartId: lnk.chart_id,
                                    error: e,
                                    message: e?.message,
                                    stack: e?.stack
                                })
                                throw e
                            }
                        }
                        columns = rows.length ? Object.keys(rows[0]).map((k) => ({key: k, label: k})) : []
                        console.log('[full.get.ts] Columns extracted:', {chartId: lnk.chart_id, columnCount: columns.length})
                    } else {
                        // No SQL available, try to fetch data using dataset preview logic
                        try {
                            const datasetId = internal.selectedDatasetId
                            const connectionId = internal.dataConnectionId ?? null
                            console.log('[full.get.ts] No SQL, checking dataset:', {chartId: lnk.chart_id, datasetId, connectionId})
                            if (datasetId) {
                                // For server-side rendering, we need to simulate the dataset preview
                                // For now, we'll leave this empty and let client-side handle it
                                // TODO: Implement server-side dataset preview
                                meta.error = 'client_side_fetch_required'
                                console.log('[full.get.ts] Dataset preview requires client-side fetch:', {chartId: lnk.chart_id})
                            } else {
                                meta.error = 'no_dataset_or_sql'
                                console.log('[full.get.ts] No dataset or SQL available:', {chartId: lnk.chart_id})
                            }
                        } catch (e: any) {
                            console.error('[full.get.ts] Error in dataset preview logic:', {
                                chartId: lnk.chart_id,
                                error: e,
                                message: e?.message,
                                stack: e?.stack
                            })
                            meta.error = e?.statusMessage || e?.message || 'dataset_preview_failed'
                        }
                    }
                } catch (e: any) {
                    console.error('[full.get.ts] Error in chart data preparation:', {
                        chartId: lnk.chart_id,
                        error: e,
                        message: e?.message,
                        statusCode: e?.statusCode,
                        statusMessage: e?.statusMessage,
                        stack: e?.stack
                    })
                    meta.error = e?.statusMessage || e?.message || 'query_failed'
                }

                // Build state for response: owner gets flattened full state; public gets only public subset
                const responseState = isOwner ? effective : sj // sj contains only public keys + internal hidden

                // Sanitize meta for public: do not include SQL
                if (!isOwner) delete (meta as any).sql

                console.log('[full.get.ts] Chart processing complete:', {chartId: lnk.chart_id, rowCount: rows.length, hasError: !!meta.error})
                return {
                    id: lnk.chart_id,
                    name: chart?.name || '',
                    position: lnk.position,
                    state: responseState,
                    data: {columns, rows, meta}
                }
            } catch (e: any) {
                console.error('[full.get.ts] Fatal error processing chart:', {
                    chartId: lnk.chart_id,
                    error: e,
                    message: e?.message,
                    statusCode: e?.statusCode,
                    statusMessage: e?.statusMessage,
                    stack: e?.stack
                })
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

        let results: any[]
        try {
            console.log('[full.get.ts] Waiting for all chart tasks to complete...')
            results = await Promise.all(tasks)
            console.log('[full.get.ts] All chart tasks completed:', {resultCount: results.length})
        } catch (e: any) {
            console.error('[full.get.ts] Error in Promise.all for chart tasks:', {
                error: e,
                message: e?.message,
                statusCode: e?.statusCode,
                statusMessage: e?.statusMessage,
                stack: e?.stack
            })
            throw e
        }

        try {
            console.log('[full.get.ts] Building final response...')
            const response = {
                id: dashboard.id,
                name: dashboard.name,
                isPublic: dashboard.is_public,
                createdAt: dashboard.created_at,
                charts: results
            }
            console.log('[full.get.ts] Handler completed successfully:', {dashboardId: response.id, chartCount: response.charts.length})
            return response
        } catch (e: any) {
            console.error('[full.get.ts] Error building response:', {
                error: e,
                message: e?.message,
                stack: e?.stack
            })
            throw e
        }
    } catch (e: any) {
        console.error('[full.get.ts] TOP LEVEL ERROR:', {
            error: e,
            message: e?.message,
            statusCode: e?.statusCode,
            statusMessage: e?.statusMessage,
            stack: e?.stack,
            name: e?.name,
            cause: e?.cause
        })
        // Re-throw to let h3 handle it
        throw e
  }
})


