import { defineEventHandler } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '../../lib/db'
import { dashboards, dashboardTabs, profiles } from '../../lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { checkDashboardPermission } from '../utils/permissions'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

/**
 * GET /api/dashboard-tabs
 * Returns all dashboard tabs that the user has access to, with dashboard names
 */
export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get user profile
    const profile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0])

    if (!profile) {
        throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    // Get all dashboards in user's organization with their tabs
    const allDashboards = await db
        .select({
            id: dashboards.id,
            name: dashboards.name,
        })
        .from(dashboards)
        .where(eq(dashboards.organizationId, profile.organizationId))

    // Get all tabs with dashboard info
    const tabs: Array<{ id: string; name: string; dashboard_name: string; position: number }> = []

    for (const dashboard of allDashboards) {
        // Check permission for each dashboard
        const hasPermission = await checkDashboardPermission(dashboard.id, user.id)
        if (!hasPermission) continue

        // Get tabs for this dashboard
        const dashboardTabsList = await db
            .select({
                id: dashboardTabs.id,
                name: dashboardTabs.name,
                position: dashboardTabs.position,
            })
            .from(dashboardTabs)
            .where(eq(dashboardTabs.dashboardId, dashboard.id))
            .orderBy(asc(dashboardTabs.position))

        for (const tab of dashboardTabsList) {
            tabs.push({
                id: tab.id,
                name: tab.name,
                dashboard_name: dashboard.name,
                position: tab.position,
            })
        }
    }

    // Sort by dashboard name, then by position
    return tabs.sort((a, b) => {
        const dashCompare = a.dashboard_name.localeCompare(b.dashboard_name)
        if (dashCompare !== 0) return dashCompare
        return a.position - b.position
    })
})
