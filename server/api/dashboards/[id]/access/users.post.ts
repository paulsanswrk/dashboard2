import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {db} from '~/lib/db'
import {dashboards, profiles, dashboardAccess} from '~/lib/db/schema'
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

    // Get dashboard to check ownership
    const dashboard = await db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, dashboardId))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard) {
        throw createError({statusCode: 404, statusMessage: 'Dashboard not found'})
    }

    // Only dashboard creator or admins can modify sharing settings
    if (dashboard.creator !== user.id && profile.role !== 'ADMIN') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Insufficient permissions'
        })
    }

    // Parse request body
    const body = await readBody(event)
    const {userId: targetUserId, hasAccess, accessLevel = 'edit'} = body

    if (!targetUserId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Target user ID is required'
        })
    }

    // Verify target user exists and is in the same organization
    const targetProfile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, targetUserId))
        .limit(1)
        .then(rows => rows[0])

    if (!targetProfile) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Target user not found'
        })
    }

    // Can't modify access for super admins
    if (targetProfile.role === 'ADMIN') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Cannot modify access for administrators'
        })
    }

    if (targetProfile.organizationId !== dashboard.organizationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Target user is not in the same organization'
        })
    }

    if (hasAccess) {
        // Grant access - check if exists first, then insert or update
        const existingAccess = await db
            .select()
            .from(dashboardAccess)
            .where(and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, targetUserId)
            ))
            .limit(1)
            .then(rows => rows[0])

        if (existingAccess) {
            // Update existing access
            await db
                .update(dashboardAccess)
                .set({
                    accessLevel,
                    sharedBy: user.id
                })
                .where(and(
                    eq(dashboardAccess.dashboardId, dashboardId),
                    eq(dashboardAccess.targetType, 'user'),
                    eq(dashboardAccess.targetUserId, targetUserId)
                ))
        } else {
            // Insert new access
            await db
                .insert(dashboardAccess)
                .values({
                    dashboardId,
                    targetType: 'user',
                    targetUserId,
                    accessLevel,
                    sharedBy: user.id
                })
        }
    } else {
        // Revoke access
        await db
            .delete(dashboardAccess)
            .where(and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, targetUserId)
            ))
    }

    return {
        success: true,
        message: hasAccess ? 'Access granted' : 'Access revoked'
    }
})
