import { defineEventHandler } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '../../../../../lib/db'
import { dashboardFilters } from '../../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkDashboardPermission } from '../../../../utils/permissions'
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

    // Fetch all filters for this dashboard
    const filters = await db
        .select()
        .from(dashboardFilters)
        .where(eq(dashboardFilters.dashboardId, dashboardId))
        .orderBy(dashboardFilters.position)

    return { filters }
})
