import { defineEventHandler, readBody } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '../../../../../lib/db'
import { dashboardFilters, dashboards } from '../../../../../lib/db/schema'
import { eq, max } from 'drizzle-orm'
import { checkDashboardPermission, checkEditPermission } from '../../../../utils/permissions'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const dashboardId = event.context.params?.id as string
    if (!dashboardId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })
    }

    // Check if user has permission to access this dashboard
    const hasPermission = await checkDashboardPermission(dashboardId, user.id)
    if (!hasPermission) {
        throw createError({ statusCode: 403, statusMessage: 'Access denied to dashboard' })
    }

    // Check if user has edit permission
    const dashboard = await db
        .select({ creator: dashboards.creator })
        .from(dashboards)
        .where(eq(dashboards.id, dashboardId))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard) {
        throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
    }

    const hasEditPermission = dashboard.creator === user.id || await checkEditPermission(dashboardId, user.id)
    if (!hasEditPermission) {
        throw createError({ statusCode: 403, statusMessage: 'Edit access required' })
    }

    const body = await readBody(event)
    const {
        connectionId,
        fieldId,
        fieldTable,
        fieldType,
        filterName,
        isVisible = true,
        filterMode = 'values',
        config = {}
    } = body || {}

    if (!fieldId || !fieldTable || !fieldType || !filterName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    // Get next position
    const [maxPos] = await db
        .select({ maxPosition: max(dashboardFilters.position) })
        .from(dashboardFilters)
        .where(eq(dashboardFilters.dashboardId, dashboardId))

    const position = (maxPos?.maxPosition ?? -1) + 1

    // Create the filter
    const [newFilter] = await db
        .insert(dashboardFilters)
        .values({
            dashboardId,
            connectionId: connectionId || null,
            fieldId,
            fieldTable,
            fieldType,
            filterName,
            isVisible,
            position,
            filterMode,
            config
        })
        .returning()

    return { filter: newFilter }
})
