import { defineEventHandler } from 'h3'
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

    // List files in the organization's folder
    const { data: files, error: listError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .list(profile.organizationId, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        })

    if (listError) {
        console.error('List error:', listError)
        throw createError({ statusCode: 500, statusMessage: listError.message })
    }

    // Build response with public URLs
    const images = (files || [])
        .filter(f => f.name && !f.name.startsWith('.'))
        .map(f => {
            const path = `${profile.organizationId}/${f.name}`
            const { data: urlData } = supabaseAdmin.storage
                .from(BUCKET_NAME)
                .getPublicUrl(path)

            return {
                id: f.id,
                path,
                filename: f.name,
                url: urlData?.publicUrl || null,
                size: f.metadata?.size || 0,
                type: f.metadata?.mimetype || 'image/png',
                uploadedAt: f.created_at
            }
        })

    return { success: true, images }
})
