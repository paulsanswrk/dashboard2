import { defineEventHandler, readBody } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { db } from '~/lib/db'
import { profiles } from '~/lib/db/schema'
import { eq } from 'drizzle-orm'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

const BUCKET_NAME = 'dashboard-images'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get user's organization
    const [profile] = await db.select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)

    if (!profile?.organizationId) {
        throw createError({ statusCode: 403, statusMessage: 'User has no organization' })
    }

    const body = await readBody(event)
    const { paths } = body || {}

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'Missing or invalid paths array' })
    }

    // Validate all paths belong to user's organization
    const orgPrefix = `${profile.organizationId}/`
    for (const path of paths) {
        if (!path.startsWith(orgPrefix)) {
            throw createError({ statusCode: 403, statusMessage: 'Access denied to one or more files' })
        }
    }

    // Delete all files
    const { error: deleteError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove(paths)

    if (deleteError) {
        console.error('Delete error:', deleteError)
        throw createError({ statusCode: 500, statusMessage: deleteError.message })
    }

    return { success: true, deleted: paths.length }
})
