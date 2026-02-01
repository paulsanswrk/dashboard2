// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { charts, dashboardAccess, dashboards, dashboardTabs, dashboardWidgets, profiles } from '~/lib/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { createHash } from 'crypto'
import { sanitizeChartState } from '../../../utils/sanitizeChartState'

export default defineEventHandler(async (event) => {
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
                organizationId: dashboards.organizationId,
                width: dashboards.width,
                height: dashboards.height,
                thumbnailUrl: dashboards.thumbnailUrl,
                createdAt: dashboards.createdAt
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

        // Access control: if not public, check permissions
        if (!dashboard.isPublic) {
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

        // Check password protection
        if (dashboard.password) {
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

            if (!hasPermission) {
                const query = getQuery(event)
                const authToken = query.authToken as string

                if (authToken) {
                    const expectedToken = createHash('sha256').update(dashboard.password).digest('hex')
                    if (authToken === expectedToken) {
                        hasPermission = true
                    }
                }
            }

            if (!hasPermission) {
                return {
                    success: true,
                    requiresPassword: true,
                    isPublic: true
                }
            }
        }

        // Load tabs and widgets
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
                style: dashboardWidgets.style,
                configOverride: dashboardWidgets.configOverride,
                chartName: charts.name,
                chartState: charts.stateJson
            })
            .from(dashboardTabs)
            .leftJoin(dashboardWidgets, eq(dashboardTabs.id, dashboardWidgets.tabId))
            .leftJoin(charts, eq(dashboardWidgets.chartId, charts.id))
            .where(eq(dashboardTabs.dashboardId, dashboard.id))
            .orderBy(dashboardTabs.position, dashboardWidgets.createdAt)

        // Group by tabs
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

            if (row.widgetId) {
                if (row.widgetType === 'chart') {
                    // Sanitize chart state (remove SQL etc.)
                    const sanitizedState = sanitizeChartState(row.chartState as any)

                    tab.widgets.push({
                        widgetId: row.widgetId,
                        type: 'chart',
                        chartId: row.chartId,
                        name: row.chartName || '',
                        position: row.position,
                        style: row.style || {},
                        configOverride: row.configOverride || {},
                        state: sanitizedState,
                        dataStatus: 'pending' // Indicate progressive loading is needed
                    })
                } else {
                    tab.widgets.push({
                        widgetId: row.widgetId,
                        type: row.widgetType,
                        position: row.position,
                        style: row.style || {},
                        configOverride: row.configOverride || {},
                        state: row.chartState || {}
                    })
                }
            }
        }

        return {
            id: dashboard.id,
            name: dashboard.name,
            isPublic: dashboard.isPublic,
            createdAt: dashboard.createdAt,
            width: dashboard.width,
            height: dashboard.height,
            thumbnailUrl: dashboard.thumbnailUrl,
            tabs: Array.from(tabMap.values())
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
