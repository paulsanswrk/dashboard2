import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
import {uploadDashboardThumbnail} from '../../utils/chartThumbnails'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
    const {name, isPublic = false, password, width, height, thumbnailBase64} = body || {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Missing dashboard name' })
  }

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

  const payload: any = {
    name,
      organization_id: profile.organization_id,
      creator: user.id,
    is_public: isPublic
  }

    const normalizedWidth = Number.isFinite(Number(width)) ? Math.round(Number(width)) : null
    const normalizedHeight = Number.isFinite(Number(height)) ? Math.round(Number(height)) : null
    if (normalizedWidth !== null) payload.width = normalizedWidth
    if (normalizedHeight !== null) payload.height = normalizedHeight

  if (isPublic && password) {
    payload.password = password
  }

    let organizationName: string | null = null
    const {data: org, error: orgError} = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single()
    if (!orgError && org?.name) {
        organizationName = org.name as string
    }

    if (thumbnailBase64) {
        try {
            const thumbnailUrl = await uploadDashboardThumbnail(thumbnailBase64, organizationName, name)
            if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl
        } catch (error: any) {
            throw createError({statusCode: 500, statusMessage: error?.message || 'Thumbnail upload failed'})
        }
    }

  const { data, error } = await supabaseAdmin
    .from('dashboards')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    // Auto-create a "Main" tab for the new dashboard
    const {error: tabError} = await supabaseAdmin
        .from('dashboard_tab')
        .insert({
            dashboard_id: data.id,
            name: 'Main',
            position: 0
        })

    if (tabError) {
        // If tab creation fails, we should clean up the dashboard
        await supabaseAdmin
            .from('dashboards')
            .delete()
            .eq('id', data.id)
            .eq('organization_id', profile.organization_id)

        throw createError({statusCode: 500, statusMessage: 'Failed to create default tab for dashboard'})
    }

  return { success: true, dashboardId: data.id }
})
