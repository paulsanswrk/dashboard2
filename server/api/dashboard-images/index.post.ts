import { defineEventHandler, readMultipartFormData } from 'h3'
import { randomUUID } from 'crypto'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { db } from '~/lib/db'
import { profiles } from '~/lib/db/schema'
import { eq } from 'drizzle-orm'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

const BUCKET_NAME = 'dashboard-images'

// Allowed image MIME types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
    }

    const file = formData.find(f => f.name === 'file')
    if (!file || !file.data || !file.type) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid file' })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw createError({ statusCode: 400, statusMessage: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` })
    }

    if (file.data.length > MAX_FILE_SIZE) {
        throw createError({ statusCode: 400, statusMessage: 'File too large (max 10MB)' })
    }

    // Generate unique path: org_id/timestamp-uuid.extension
    const ext = file.type.split('/').pop()?.replace('+xml', '') || 'png'
    const filename = file.filename || `image.${ext}`
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `${profile.organizationId}/${Date.now()}-${randomUUID()}-${safeName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(path, file.data, {
            contentType: file.type,
            upsert: false
        })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        throw createError({ statusCode: 500, statusMessage: uploadError.message })
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)

    return {
        success: true,
        image: {
            path,
            filename: safeName,
            url: publicUrlData?.publicUrl || null,
            size: file.data.length,
            type: file.type,
            uploadedAt: new Date().toISOString()
        }
    }
})
