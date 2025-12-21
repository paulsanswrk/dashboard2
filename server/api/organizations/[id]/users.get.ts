import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
import {db} from '~/lib/db'
import {profiles, dashboardAccess, viewers} from '~/lib/db/schema'
import {eq, and, sql} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const organizationId = getRouterParam(event, 'id')
    if (!organizationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Organization ID is required'
        })
    }

    // Get user profile to check permissions
    const userProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0])

    if (!userProfile) {
        throw createError({statusCode: 404, statusMessage: 'User profile not found'})
    }

    // Check if user can access this organization
    if (userProfile.role !== 'SUPERADMIN' && userProfile.organizationId !== organizationId) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Access denied to this organization'
        })
    }

    const dashboardId = getQuery(event).dashboardId as string
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Get organization users with their dashboard access status in a single query
    const usersWithAccess = await db
        .select({
            userId: profiles.userId,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            role: profiles.role,
            email: sql<string>`${profiles.firstName} || '.' || ${profiles.lastName} || '@example.com'`, // Fallback email for now
            hasAccess: sql<boolean>`CASE WHEN ${dashboardAccess.id} IS NOT NULL THEN true ELSE ${profiles.role} = 'ADMIN' END`,
            accessLevel: sql<string>`COALESCE(${dashboardAccess.accessLevel}, 'read')`,
            sharedBy: dashboardAccess.sharedBy,
            createdAt: profiles.createdAt
        })
        .from(profiles)
        .leftJoin(
            dashboardAccess,
            and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, profiles.userId)
            )
        )
        .where(eq(profiles.organizationId, organizationId))
        .orderBy(profiles.createdAt)

    // Get real emails from Supabase Auth
    const userIds = usersWithAccess.map(user => user.userId)
    const userEmails: Record<string, string> = {}

    if (userIds.length > 0) {
        try {
            const {data: users, error} = await supabaseAdmin.auth.admin.listUsers()

            if (!error && users) {
                users.users.forEach(user => {
                    if (userIds.includes(user.id)) {
                        userEmails[user.id] = user.email || user.id
                    }
                })
            }
        } catch (error) {
            console.warn('Failed to fetch real user emails, using fallbacks:', error)
        }
    }

    // Update users with real emails
    const usersWithRealEmails = usersWithAccess.map(user => ({
        ...user,
        email: userEmails[user.userId] || user.email // Use real email if available, fallback otherwise
    }))

    // Get organization viewers (for completeness, though not used in current UI)
    const orgViewersRaw = await db
        .select({
            userId: viewers.userId,
            firstName: viewers.firstName,
            lastName: viewers.lastName,
            viewerType: viewers.viewerType,
            groupName: viewers.groupName,
            email: sql<string>`${viewers.firstName} || '.' || ${viewers.lastName} || '@example.com'`, // Fallback email
            createdAt: viewers.createdAt
        })
        .from(viewers)
        .where(eq(viewers.organizationId, organizationId))
        .orderBy(viewers.createdAt)

    // Update viewers with real emails
    const orgViewers = orgViewersRaw.map(viewer => ({
        ...viewer,
        email: userEmails[viewer.userId] || viewer.email // Use real email if available, fallback otherwise
    }))

    return {
        success: true,
        users: usersWithRealEmails,
        viewers: orgViewers
    }
})
