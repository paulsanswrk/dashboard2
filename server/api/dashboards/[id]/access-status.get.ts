import {defineEventHandler} from 'h3'
import {db} from '~/lib/db'
import {dashboards} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Get dashboard access status without returning sensitive data
    const dashboard = await db
        .select({
            id: dashboards.id,
            isPublic: dashboards.isPublic,
            password: dashboards.password
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

    return {
        success: true,
        data: {
            isPublic: dashboard.isPublic,
            requiresPassword: !!dashboard.password
        }
    }
})
