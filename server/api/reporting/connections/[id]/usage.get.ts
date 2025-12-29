import { defineEventHandler, getRouterParam } from 'h3'
import { db } from '~/lib/db'
import { charts, dashboardFilters, dashboardWidgets, dashboards, dataConnections } from '~/lib/db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { AuthHelper } from '~/server/utils/authHelper'

export interface ConnectionUsage {
    connectionId: number
    isUsed: boolean
    charts: {
        count: number
        items: Array<{ id: number; name: string }>
    }
    dashboards: {
        count: number
        items: Array<{ id: string; name: string }>
    }
    filters: {
        count: number
    }
}

export default defineEventHandler(async (event): Promise<ConnectionUsage> => {
    const idParam = getRouterParam(event, 'id')
    const connectionId = Number(idParam)

    if (!connectionId || isNaN(connectionId)) {
        throw createError({ statusCode: 400, statusMessage: 'Missing or invalid connection id' })
    }

    // Verify user has access to this connection
    await AuthHelper.requireConnectionAccess(event, connectionId, {
        requireWrite: false,
        columns: 'id, organization_id'
    })

    // Get all charts using this connection
    const chartsUsingConnection = await db
        .select({
            id: charts.id,
            name: charts.name
        })
        .from(charts)
        .where(eq(charts.dataConnectionId, connectionId))

    // Get dashboard filters using this connection
    const filtersUsingConnection = await db
        .select({
            id: dashboardFilters.id,
            dashboardId: dashboardFilters.dashboardId
        })
        .from(dashboardFilters)
        .where(eq(dashboardFilters.connectionId, connectionId))

    // Get unique dashboard IDs from filters
    const filterDashboardIds = [...new Set(filtersUsingConnection.map(f => f.dashboardId))]

    // Get dashboard IDs from widgets that reference charts using this connection
    let widgetDashboardIds: string[] = []
    if (chartsUsingConnection.length > 0) {
        const chartIds = chartsUsingConnection.map(c => c.id)
        const widgetsWithCharts = await db
            .select({
                dashboardId: dashboardWidgets.dashboardId
            })
            .from(dashboardWidgets)
            .where(inArray(dashboardWidgets.chartId, chartIds))

        widgetDashboardIds = [...new Set(widgetsWithCharts.map(w => w.dashboardId))]
    }

    // Combine all unique dashboard IDs
    const allDashboardIds = [...new Set([...filterDashboardIds, ...widgetDashboardIds])]

    // Get dashboard details
    let dashboardItems: Array<{ id: string; name: string }> = []
    if (allDashboardIds.length > 0) {
        dashboardItems = await db
            .select({
                id: dashboards.id,
                name: dashboards.name
            })
            .from(dashboards)
            .where(inArray(dashboards.id, allDashboardIds))
    }

    const isUsed = chartsUsingConnection.length > 0 || filtersUsingConnection.length > 0

    return {
        connectionId,
        isUsed,
        charts: {
            count: chartsUsingConnection.length,
            items: chartsUsingConnection.map(c => ({ id: c.id, name: c.name }))
        },
        dashboards: {
            count: dashboardItems.length,
            items: dashboardItems
        },
        filters: {
            count: filtersUsingConnection.length
        }
    }
})
