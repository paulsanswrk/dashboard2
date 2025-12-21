import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {db} from '../../../lib/db'
import {dashboards, dashboardAccess, profiles} from '../../../lib/db/schema'
import {eq, and, or, inArray} from 'drizzle-orm'
import {checkDashboardPermission} from '../../utils/permissions'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

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
        throw createError({statusCode: 403, statusMessage: 'User profile not found'})
    }

    // Get all dashboards in user's organization first
    const orgDashboards = await db
        .select({
            id: dashboards.id,
            name: dashboards.name,
            organizationId: dashboards.organizationId,
            creator: dashboards.creator,
            isPublic: dashboards.isPublic,
            createdAt: dashboards.createdAt,
            width: dashboards.width,
            height: dashboards.height,
            thumbnailUrl: dashboards.thumbnailUrl
        })
        .from(dashboards)
        .where(eq(dashboards.organizationId, profile.organizationId))

    // Filter dashboards based on permissions
    const accessibleDashboards = []
    for (const dashboard of orgDashboards) {
        const hasPermission = await checkDashboardPermission(dashboard.id, user.id)
        if (hasPermission) {
            accessibleDashboards.push({
                id: dashboard.id,
                name: dashboard.name,
                organization_id: dashboard.organizationId,
                creator: dashboard.creator,
                is_public: dashboard.isPublic,
                created_at: dashboard.createdAt,
                width: dashboard.width,
                height: dashboard.height,
                thumbnail_url: dashboard.thumbnailUrl
            })
        }
    }

    return accessibleDashboards.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
})


