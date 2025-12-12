import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
import {uploadDashboardThumbnail} from '../../utils/chartThumbnails'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

type LayoutItem = { chartId: number; position: any }

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
    const {id, name, layout, width, height, thumbnailBase64} = body || {}
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    // Verify org ownership
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id')
    .eq('id', id)
      .eq('organization_id', profile.organization_id)
    .single()

  if (dashError || !dashboard) {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }

    if (name != null || width != null || height != null || thumbnailBase64) {
    const { error } = await supabaseAdmin
      .from('dashboards')
        .update({
            ...(name != null ? {name} : {}),
            ...(Number.isFinite(Number(width)) ? {width: Math.round(Number(width))} : {}),
            ...(Number.isFinite(Number(height)) ? {height: Math.round(Number(height))} : {})
        })
      .eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (Array.isArray(layout)) {
      // Get all tabs for this dashboard first
      const {data: tabs, error: tabsError} = await supabaseAdmin
          .from('dashboard_tab')
          .select('id')
          .eq('dashboard_id', id)

      if (tabsError) throw createError({statusCode: 500, statusMessage: tabsError.message})

      if (tabs && tabs.length > 0) {
          const tabIds = tabs.map((tab: any) => tab.id)
          const {data: widgetLookup, error: lookupError} = await supabaseAdmin
              .from('dashboard_widgets')
              .select('id, tab_id, chart_id, type')
              .eq('dashboard_id', id)
              .in('tab_id', tabIds)

          if (lookupError) throw createError({statusCode: 500, statusMessage: lookupError.message})

          const updates = (layout as LayoutItem[]).map(async (li) => {
              if ((li as any).widgetId) {
                  return supabaseAdmin
                      .from('dashboard_widgets')
                      .update({position: li.position})
                      .eq('id', (li as any).widgetId)
                      .eq('dashboard_id', id)
              }

              if (li.chartId != null) {
                  const widget = (widgetLookup || []).find((w: any) => w.type === 'chart' && Number(w.chart_id) === Number(li.chartId))
                  if (!widget) {
                      console.warn(`Chart ${li.chartId} not found in dashboard ${id}, skipping position update`)
                      return null
                  }
                  return supabaseAdmin
                      .from('dashboard_widgets')
                      .update({position: li.position})
                      .eq('id', widget.id)
              }
              return null
          })

          const results = await Promise.all(updates)
          const err = results.find(r => r && (r as any).error)
          if (err && (err as any).error) throw createError({statusCode: 500, statusMessage: (err as any).error.message})
      }
  }

    if (thumbnailBase64) {
        let organizationName: string | null = null
        const {data: org, error: orgError} = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .single()
        if (!orgError && org?.name) {
            organizationName = org.name as string
        }

        try {
            const thumbnailUrl = await uploadDashboardThumbnail(thumbnailBase64, organizationName, name || 'dashboard')
            const {error: thumbErr} = await supabaseAdmin
                .from('dashboards')
                .update({thumbnail_url: thumbnailUrl})
                .eq('id', id)
            if (thumbErr) throw thumbErr
        } catch (error: any) {
            throw createError({statusCode: 500, statusMessage: error?.message || 'Thumbnail upload failed'})
        }
    }

  return { success: true }
})


