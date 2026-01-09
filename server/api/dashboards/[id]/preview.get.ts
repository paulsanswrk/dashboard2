// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { charts, dashboardAccess, dashboards, dashboardTabs, dashboardWidgets, profiles } from '~/lib/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { createHash } from 'crypto'
import { withMySqlConnection } from '../../../utils/mysqlClient.dev'
import { withMySqlConnectionConfig } from '../../../utils/mysqlClient'
import { supabaseAdmin } from '../../supabase'

export default defineEventHandler(async (event) => {
    async function loadConnectionConfigForDashboard(connectionId: number, dashboardOrgId: string) {
        try {
            // Verify the connection belongs to the dashboard org
            const { data, error } = await supabaseAdmin
                .from('data_connections')
                .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, organization_id')
                .eq('id', Number(connectionId))
                .single()

            if (error || !data || data.organization_id !== dashboardOrgId) {
                console.error('[preview.get.ts] Connection access denied:', { error: error?.message, hasData: !!data, orgMatch: data?.organization_id === dashboardOrgId })
                throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
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
            console.error('[preview.get.ts] Error loading connection config:', e?.message || e)
            throw createError({ statusCode: 500, statusMessage: 'Failed to load connection config' })
        }
    }

    try {
        const dashboardId = getRouterParam(event, 'id')
        if (!dashboardId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Dashboard ID is required'
            })
        }

        // Get dashboard basic info
        const dashboard = await db
            .select({
                id: dashboards.id,
                name: dashboards.name,
                isPublic: dashboards.isPublic,
                password: dashboards.password,
                creator: dashboards.creator,
                organizationId: dashboards.organizationId
            })
            .from(dashboards)
            .where(eq(dashboards.id, dashboardId))
            .limit(1)
            .then(rows => rows[0])

        if (!dashboard) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Dashboard not found'
            })
        }


        // Check if dashboard is public
        if (!dashboard.isPublic) {
            // Check if user is authenticated and has permission
            const user = await serverSupabaseUser(event).catch(() => null)

            if (!user) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Dashboard is private'
                })
            }

            // Get user profile
            const userProfile = await db
                .select()
                .from(profiles)
                .where(eq(profiles.userId, user.id))
                .limit(1)
                .then(rows => rows[0])

            if (!userProfile) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'User profile not found'
                })
            }

            // Check permissions
            let hasPermission = false
            if (dashboard.creator === user.id) {
                hasPermission = true
            } else if (userProfile.role === 'SUPERADMIN' || (userProfile.role === 'ADMIN' && userProfile.organizationId === dashboard.organizationId)) {
                hasPermission = true
            } else {
                const accessRecord = await db
                    .select()
                    .from(dashboardAccess)
                    .where(and(
                        eq(dashboardAccess.dashboardId, dashboardId),
                        or(
                            and(eq(dashboardAccess.targetType, 'user'), eq(dashboardAccess.targetUserId, user.id)),
                            and(eq(dashboardAccess.targetType, 'org'), eq(dashboardAccess.targetOrgId, userProfile.organizationId))
                        )
                    ))
                    .limit(1)
                    .then(rows => rows[0])

                if (accessRecord) {
                    hasPermission = true
                }
            }

            if (!hasPermission) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Access denied'
                })
            }
        }

        // Dashboard is public, check authentication requirements
        if (dashboard.password) {
            // Check if authenticated user has permission to bypass password
            const user = await serverSupabaseUser(event).catch(() => null)
            let hasPermission = false

            if (user) {
                const userProfile = await db
                    .select()
                    .from(profiles)
                    .where(eq(profiles.userId, user.id))
                    .limit(1)
                    .then(rows => rows[0])

                if (userProfile) {
                    if (dashboard.creator === user.id) {
                        hasPermission = true
                    } else if (userProfile.role === 'SUPERADMIN' || (userProfile.role === 'ADMIN' && userProfile.organizationId === dashboard.organizationId)) {
                        hasPermission = true
                    } else {
                        const accessRecord = await db
                            .select()
                            .from(dashboardAccess)
                            .where(and(
                                eq(dashboardAccess.dashboardId, dashboardId),
                                or(
                                    and(eq(dashboardAccess.targetType, 'user'), eq(dashboardAccess.targetUserId, user.id)),
                                    and(eq(dashboardAccess.targetType, 'org'), eq(dashboardAccess.targetOrgId, userProfile.organizationId))
                                )
                            ))
                            .limit(1)
                            .then(rows => rows[0])

                        if (accessRecord) {
                            hasPermission = true
                        }
                    }
                }
            }

            // If no permission, check cookie authentication
            if (!hasPermission) {
                const query = getQuery(event)
                const authToken = query.authToken as string

                if (authToken) {
                    // Verify cookie token
                    const expectedToken = createHash('sha256').update(dashboard.password).digest('hex')
                    if (authToken === expectedToken) {
                        hasPermission = true
                    }
                }
            }

            // If still no permission, password is required
            if (!hasPermission) {
                return {
                    success: true,
                    requiresPassword: true,
                    isPublic: true
                }
            }
        }

        // User is authorized, load full dashboard data with executed queries
        // Single query to get all tabs, widgets, and chart data
        const allData = await db
            .select({
                tabId: dashboardTabs.id,
                tabName: dashboardTabs.name,
                tabPosition: dashboardTabs.position,
                tabStyle: dashboardTabs.style,
                tabOptions: dashboardTabs.options,
                widgetId: dashboardWidgets.id,
                widgetType: dashboardWidgets.type,
                chartId: dashboardWidgets.chartId,
                position: dashboardWidgets.position,
                configOverride: dashboardWidgets.configOverride,
                chartName: charts.name,
                chartState: charts.stateJson
            })
            .from(dashboardTabs)
            .leftJoin(dashboardWidgets, eq(dashboardTabs.id, dashboardWidgets.tabId))
            .leftJoin(charts, eq(dashboardWidgets.chartId, charts.id))
            .where(eq(dashboardTabs.dashboardId, dashboard.id))
            .orderBy(dashboardTabs.position, dashboardWidgets.createdAt)

        // Group by tabs and execute chart queries
        const tabMap = new Map()
        for (const row of allData) {
            if (!tabMap.has(row.tabId)) {
                tabMap.set(row.tabId, {
                    id: row.tabId,
                    name: row.tabName,
                    position: row.tabPosition,
                    style: row.tabStyle ?? {},
                    options: row.tabOptions ?? {},
                    widgets: []
                })
            }

            const tab = tabMap.get(row.tabId)

            // Process widget if it exists
            if (row.widgetId) {
                if (row.widgetType === 'chart' && row.chartState) {
                    try {
                        const sj = row.chartState as any
                        const internal = sj.internal || {}
                        const publicState = { ...sj }
                        delete (publicState as any).internal

                        // Execute chart query server-side
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


                                if (connectionId) {
                                    try {
                                        const cfg = await loadConnectionConfigForDashboard(Number(connectionId), dashboard?.organizationId || '')
                                        const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
                                            const [res] = await conn.query(safeSql, sqlParams)
                                            return res as any[]
                                        })
                                        rows = resRows
                                    } catch (e: any) {
                                        console.error('[preview.get.ts] Query error (chart', row.chartId, '):', e?.message || e)
                                        meta.error = e?.message || 'query_failed'
                                    }
                                } else {
                                    try {
                                        const resRows = await withMySqlConnection(async (conn) => {
                                            const [res] = await conn.query(safeSql, sqlParams)
                                            return res as any[]
                                        })
                                        rows = resRows
                                    } catch (e: any) {
                                        console.error('[preview.get.ts] Query error (chart', row.chartId, '):', e?.message || e)
                                        meta.error = e?.message || 'query_failed'
                                    }
                                }
                                columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
                            } else {
                                meta.error = 'no_sql_available'
                            }
                        } catch (e: any) {
                            meta.error = e?.message || 'data_loading_failed'
                        }

                        tab.widgets.push({
                            widgetId: row.widgetId,
                            type: row.widgetType,
                            chartId: row.chartId,
                            name: row.chartName || '',
                            position: row.position,
                            configOverride: row.configOverride || {},
                            state: publicState,
                            data: { columns, rows, meta }
                        })
                    } catch (e: any) {
                        console.error('[preview.get.ts] Error processing chart', row.chartId, ':', e?.message || e)
                        tab.widgets.push({
                            widgetId: row.widgetId,
                            type: row.widgetType,
                            chartId: row.chartId,
                            name: row.chartName || '',
                            position: row.position,
                            configOverride: row.configOverride || {},
                            state: {},
                            data: { columns: [], rows: [], meta: { error: e?.message || 'chart_processing_failed' } }
                        })
                    }
                } else {
                    // Non-chart widget
                    tab.widgets.push({
                        widgetId: row.widgetId,
                        type: row.widgetType,
                        chartId: row.chartId,
                        name: row.chartName || '',
                        position: row.position,
                        configOverride: row.configOverride || {},
                        state: row.chartState || {}
                    })
                }
            }
        }

        const tabResults = Array.from(tabMap.values())

        return {
            id: dashboard.id,
            name: dashboard.name,
            isPublic: dashboard.isPublic,
            createdAt: dashboard.created_at,
            width: dashboard.width,
            height: dashboard.height,
            thumbnailUrl: dashboard.thumbnail_url,
            tabs: tabResults
        }

    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[preview.get.ts] Unexpected error:', error?.message || error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        })
    }
})
