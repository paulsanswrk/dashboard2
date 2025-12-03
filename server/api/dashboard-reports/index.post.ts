import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
    const {dashboardId, chartId, position, tabId} = body || {}

  if (!dashboardId || !chartId || !position) {
    throw createError({ statusCode: 400, statusMessage: 'Missing dashboardId, chartId, or position' })
  }

  // Verify the user owns the dashboard
  const { data: dashboard, error: dashboardError } = await supabaseAdmin
    .from('dashboards')
    .select('id')
    .eq('id', dashboardId)
    .eq('owner_id', user.id)
    .single()

  if (dashboardError || !dashboard) {
    throw createError({ statusCode: 403, statusMessage: 'Dashboard not found or access denied' })
  }

  // Verify the user owns the chart
  const { data: chart, error: chartError } = await supabaseAdmin
    .from('charts')
    .select('id')
    .eq('id', chartId)
    .eq('owner_id', user.id)
    .single()

  if (chartError || !chart) {
    throw createError({ statusCode: 403, statusMessage: 'Chart not found or access denied' })
  }

    let targetTabId: string

    if (tabId) {
        // Verify the provided tab belongs to the dashboard and user owns it
        const {data: tab, error: tabError} = await supabaseAdmin
            .from('dashboard_tab')
            .select('id')
            .eq('id', tabId)
            .eq('dashboard_id', dashboardId)
            .single()

        if (tabError || !tab) {
            throw createError({statusCode: 400, statusMessage: 'Invalid tab for this dashboard'})
        }

        targetTabId = tabId
    } else {
        // Get the first tab of the dashboard (dashboards must have at least one tab)
        const {data: firstTab, error: tabError} = await supabaseAdmin
            .from('dashboard_tab')
            .select('id')
            .eq('dashboard_id', dashboardId)
            .order('position', {ascending: true})
            .limit(1)
            .single()

        if (tabError || !firstTab) {
            throw createError({statusCode: 400, statusMessage: 'Dashboard has no tabs or tab access failed'})
        }

        targetTabId = firstTab.id
    }

  const { error } = await supabaseAdmin
    .from('dashboard_charts')
    .insert({
        tab_id: targetTabId,
      chart_id: chartId,
      position: position
    })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
