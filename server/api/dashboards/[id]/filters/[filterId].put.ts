import { defineEventHandler, readBody } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '../../../../../lib/db'
import { dashboardFilters, dashboards } from '../../../../../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkDashboardPermission, checkEditPermission } from '../../../../utils/permissions'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const dashboardId = event.context.params?.id as string
    const filterId = event.context.params?.filterId as string
    if (!dashboardId || !filterId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing dashboard or filter id' })
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
    const updateData: Record<string, any> = {}

    // Only include fields that are provided
    if (body.filterName !== undefined) updateData.filterName = body.filterName
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible
    if (body.filterMode !== undefined) updateData.filterMode = body.filterMode
    if (body.config !== undefined) updateData.config = body.config
    if (body.currentValue !== undefined) updateData.currentValue = body.currentValue
    if (body.position !== undefined) updateData.position = body.position

    if (Object.keys(updateData).length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
    }

    updateData.updatedAt = new Date()

    // Update the filter
    const [updatedFilter] = await db
        .update(dashboardFilters)
        .set(updateData)
        .where(and(
            eq(dashboardFilters.id, filterId),
            eq(dashboardFilters.dashboardId, dashboardId)
        ))
        .returning()

    if (!updatedFilter) {
        throw createError({ statusCode: 404, statusMessage: 'Filter not found' })
    }

    return { filter: updatedFilter }
})
