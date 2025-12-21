import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {db} from '~/lib/db'
import {dashboards, profiles, dashboardAccess} from '~/lib/db/schema'
import {eq, and, or} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Get dashboard info
    const dashboard = await db
        .select({
            id: dashboards.id,
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

    // Check if user is authenticated
    const user = await serverSupabaseUser(event).catch(() => null)
    if (!user) {
        return {
            success: true,
            data: {hasPermission: false}
        }
    }

    // Get user profile
    const userProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0])

    if (!userProfile) {
        return {
            success: true,
            data: {hasPermission: false}
        }
    }

    // Check permissions:
    // 1. Dashboard creator
    // 2. Organization admin
    // 3. Explicit access via dashboard_access table
    let hasPermission = false

    if (dashboard.creator === user.id) {
        hasPermission = true
    } else if (userProfile.role === 'SUPERADMIN' || (userProfile.role === 'ADMIN' && userProfile.organizationId === dashboard.organizationId)) {
        hasPermission = true
    } else {
        // Check explicit access
        const accessRecord = await db
            .select()
            .from(dashboardAccess)
            .where(and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, user.id)
            ))
            .limit(1)
            .then(rows => rows[0])

        if (accessRecord) {
            hasPermission = true
        }
    }

    return {
        success: true,
        data: {hasPermission}
    }
})
