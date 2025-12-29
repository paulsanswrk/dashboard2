import { defineEventHandler } from 'h3'
import { db } from '~/lib/db'
import { dataConnections, charts, dashboardFilters, dashboardWidgets } from '~/lib/db/schema'
import { eq, sql, and, inArray } from 'drizzle-orm'
import { AuthHelper } from '~/server/utils/authHelper'

export interface ConnectionWithUsage {
    id: number
    internal_name: string
    database_name: string
    database_type: string
    host: string
    port: number
    organization_id: string
    chartsCount: number
    dashboardsCount: number
    filtersCount: number
}

export default defineEventHandler(async (event): Promise<ConnectionWithUsage[]> => {
    const ctx = await AuthHelper.requireAuthContext(event)

    // Build where clause based on role
    const whereClause = ctx.role === 'SUPERADMIN'
        ? undefined
        : eq(dataConnections.organizationId, ctx.organizationId!)

    // Get all connections for the user
    const connections = await db
        .select({
            id: dataConnections.id,
            internal_name: dataConnections.internalName,
            database_name: dataConnections.databaseName,
            database_type: dataConnections.databaseType,
            host: dataConnections.host,
            port: dataConnections.port,
            organization_id: dataConnections.organizationId,
        })
        .from(dataConnections)
        .where(whereClause)
        .orderBy(sql`${dataConnections.updatedAt} DESC`)

    if (connections.length === 0) {
        return []
    }

    const connectionIds = connections.map(c => c.id)

    // Get chart counts per connection in single query
    const chartCounts = await db
        .select({
            connectionId: charts.dataConnectionId,
            count: sql<number>`count(*)::int`.as('count')
        })
        .from(charts)
        .where(inArray(charts.dataConnectionId, connectionIds))
        .groupBy(charts.dataConnectionId)

    // Get unique dashboard IDs per connection (from chart widgets)
    const chartIds = await db
        .select({
            id: charts.id,
            connectionId: charts.dataConnectionId
        })
        .from(charts)
        .where(inArray(charts.dataConnectionId, connectionIds))

    let widgetDashboardsByConnection = new Map<number, Set<string>>()

    if (chartIds.length > 0) {
        const widgetData = await db
            .select({
                chartId: dashboardWidgets.chartId,
                dashboardId: dashboardWidgets.dashboardId
            })
            .from(dashboardWidgets)
            .where(inArray(dashboardWidgets.chartId, chartIds.map(c => c.id)))

        // Map chart IDs back to connection IDs
        const chartToConnection = new Map(chartIds.map(c => [c.id, c.connectionId]))

        for (const widget of widgetData) {
            if (widget.chartId) {
                const connId = chartToConnection.get(widget.chartId)
                if (connId) {
                    if (!widgetDashboardsByConnection.has(connId)) {
                        widgetDashboardsByConnection.set(connId, new Set())
                    }
                    widgetDashboardsByConnection.get(connId)!.add(widget.dashboardId)
                }
            }
        }
    }

    // Get unique dashboard IDs per connection (from filters)
    const filterData = await db
        .select({
            connectionId: dashboardFilters.connectionId,
            dashboardId: dashboardFilters.dashboardId
        })
        .from(dashboardFilters)
        .where(inArray(dashboardFilters.connectionId, connectionIds))

    const filterDashboardsByConnection = new Map<number, Set<string>>()
    for (const filter of filterData) {
        if (filter.connectionId) {
            if (!filterDashboardsByConnection.has(filter.connectionId)) {
                filterDashboardsByConnection.set(filter.connectionId, new Set())
            }
            filterDashboardsByConnection.get(filter.connectionId)!.add(filter.dashboardId)
        }
    }

    // Build chart count map
    const chartCountMap = new Map(chartCounts.map(c => [c.connectionId, c.count]))

    // Build filter count map
    const filterCountMap = new Map<number, number>()
    for (const filter of filterData) {
        if (filter.connectionId) {
            filterCountMap.set(filter.connectionId, (filterCountMap.get(filter.connectionId) || 0) + 1)
        }
    }

    // Combine results
    return connections.map(conn => {
        const widgetDashboards = widgetDashboardsByConnection.get(conn.id) || new Set()
        const filterDashboards = filterDashboardsByConnection.get(conn.id) || new Set()
        const allDashboards = new Set([...widgetDashboards, ...filterDashboards])

        return {
            id: conn.id,
            internal_name: conn.internal_name,
            database_name: conn.database_name,
            database_type: conn.database_type,
            host: conn.host,
            port: conn.port,
            organization_id: conn.organization_id,
            chartsCount: chartCountMap.get(conn.id) || 0,
            dashboardsCount: allDashboards.size,
            filtersCount: filterCountMap.get(conn.id) || 0
        }
    })
})
