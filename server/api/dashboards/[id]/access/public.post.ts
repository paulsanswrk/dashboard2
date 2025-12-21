import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {db} from '~/lib/db'
import {dashboards, profiles} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'
import {hashPassword} from '~/server/utils/password'

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

    // Only dashboard creator or admins can modify public access
    if (dashboard.creator !== user.id && profile.role !== 'ADMIN') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Insufficient permissions'
        })
    }

    // Parse request body
    const body = await readBody(event)
    const {isPublic, password} = body

    // Update dashboard public access
    const updateData: any = {
        isPublic,
    }

    if (isPublic && password) {
        updateData.password = await hashPassword(password)
    } else if (!isPublic) {
        updateData.password = null
    }

    await db
        .update(dashboards)
        .set(updateData)
        .where(eq(dashboards.id, dashboardId))

    const config = useRuntimeConfig()

    return {
        success: true,
        message: isPublic ? 'Dashboard is now public' : 'Dashboard is now private',
        publicUrl: isPublic ? `${config.public.siteUrl}/dashboards/preview/${dashboardId}` : null
    }
})
