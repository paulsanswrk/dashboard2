import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
import {db} from '~/lib/db'
import {dashboards, profiles, dashboardAccess, viewers} from '~/lib/db/schema'
import {eq, and} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Get user profile to check permissions
    const profile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0])

    if (!profile) {
        throw createError({statusCode: 404, statusMessage: 'User profile not found'})
    }

    // Get dashboard to check ownership and get public settings
    const dashboard = await db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, dashboardId))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard) {
        throw createError({statusCode: 404, statusMessage: 'Dashboard not found'})
    }

    // Only dashboard creator or admins can view sharing settings
    if (dashboard.creator !== user.id && profile.role !== 'ADMIN') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Insufficient permissions'
        })
    }

    // Get current access settings
    const userAccessData = await db
        .select({
            id: dashboardAccess.id,
            targetUserId: dashboardAccess.targetUserId,
            accessLevel: dashboardAccess.accessLevel,
            sharedBy: dashboardAccess.sharedBy,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            role: profiles.role
        })
        .from(dashboardAccess)
        .leftJoin(profiles, eq(dashboardAccess.targetUserId, profiles.userId))
        .where(and(
            eq(dashboardAccess.dashboardId, dashboardId),
            eq(dashboardAccess.targetType, 'user')
        ))

    // Get viewers with access from the organization
    const organizationViewers = await db
        .select({
            userId: viewers.userId,
            firstName: viewers.firstName,
            lastName: viewers.lastName,
            viewerType: viewers.viewerType,
            groupName: viewers.groupName
        })
        .from(viewers)
        .where(eq(viewers.organizationId, dashboard.organizationId))

    // Get user emails from Supabase Auth
    const userIds = [
        ...userAccessData.map(access => access.targetUserId),
        ...organizationViewers.map(viewer => viewer.userId)
    ]
    const userEmails: Record<string, string> = {}

    if (userIds.length > 0) {
        try {
            const {data: users} = await supabaseAdmin.auth.admin.listUsers()
            users.users.forEach(user => {
                if (userIds.includes(user.id)) {
                    userEmails[user.id] = user.email || user.id
                }
            })
        } catch (error) {
            console.warn('Failed to fetch user emails:', error)
        }
    }

    // Filter viewers that have dashboard access
    const userIdsWithAccess = new Set(userAccessData.map(access => access.targetUserId))
    const viewerAccessFormatted = organizationViewers
        .filter(viewer => userIdsWithAccess.has(viewer.userId))
        .map(viewer => ({
            id: viewer.userId,
            name: `${viewer.firstName || ''} ${viewer.lastName || ''}`.trim(),
            email: userEmails[viewer.userId] || viewer.userId,
            type: viewer.viewerType,
            group: viewer.groupName
        }))

    const config = useRuntimeConfig()

    return {
        success: true,
        data: {
            isPublic: dashboard.isPublic,
            password: !!dashboard.password, // Return boolean indicating if password is set
            publicUrl: dashboard.isPublic ? `${config.public.siteUrl}/dashboards/preview/${dashboardId}` : null,
            userAccess: userAccessData.map(access => ({
                id: access.id,
                user_id: access.targetUserId,
                name: `${access.firstName || ''} ${access.lastName || ''}`.trim(),
                email: userEmails[access.targetUserId] || access.targetUserId,
                access_level: access.accessLevel,
                shared_by: access.sharedBy
            })),
            viewerAccess: viewerAccessFormatted
        }
    }
})
