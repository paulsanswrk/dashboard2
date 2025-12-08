import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

type LayoutItem = { chartId: number; position: any }

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { id, name, layout } = body || {}
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

  if (name != null) {
    const { error } = await supabaseAdmin
      .from('dashboards')
      .update({ name })
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

          // Update positions for each item - need to find which tab each chart belongs to
          const updates = (layout as LayoutItem[]).map(async (li) => {
              // Find which tab this chart belongs to
              const {data: chartLink, error: linkError} = await supabaseAdmin
                  .from('dashboard_charts')
                  .select('tab_id')
                  .eq('chart_id', li.chartId)
                  .in('tab_id', tabIds)
                  .single()

              if (linkError || !chartLink) {
                  console.warn(`Chart ${li.chartId} not found in dashboard ${id}, skipping position update`)
                  return null
              }

              return supabaseAdmin
                  .from('dashboard_charts')
                  .update({position: li.position})
                  .eq('tab_id', chartLink.tab_id)
                  .eq('chart_id', li.chartId)
          })

          const results = await Promise.all(updates)
          const err = results.find(r => r && (r as any).error)
          if (err && (err as any).error) throw createError({statusCode: 500, statusMessage: (err as any).error.message})
      }
  }

  return { success: true }
})


