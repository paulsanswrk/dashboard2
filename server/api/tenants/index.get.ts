// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { profiles } from '~/lib/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event)
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
        }

        // Get user profile to check role
        const userProfile = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, user.id))
            .limit(1)
            .then(rows => rows[0])

        if (!userProfile) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User profile not found'
            })
        }

        // Only SUPERADMIN can view tenants list
        if (userProfile.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Access denied. Only superadmins can view tenants.'
            })
        }

        // Fetch all tenants from optiqoflow.tenants
        const { pgClient } = await import('~/lib/db')

        const tenants = await pgClient.unsafe(
            'SELECT id, name, short_name FROM optiqoflow.tenants ORDER BY name'
        ) as Array<{
            id: string
            name: string
            short_name: string
        }>

        return {
            success: true,
            tenants: tenants.map(t => ({
                id: t.id,
                name: t.name,
                shortName: t.short_name
            }))
        }

    } catch (error: any) {
        console.error('Error fetching tenants:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to fetch tenants'
        })
    }
})
