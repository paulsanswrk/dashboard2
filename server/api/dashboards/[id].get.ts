import {defineEventHandler} from 'h3'
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

  const id = event.context.params?.id as string
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    // Verify org access and get dashboard
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
      .select('id, name, organization_id, creator, is_public, created_at, width, height, thumbnail_url')
    .eq('id', id)
      .eq('organization_id', profile.organization_id)
    .single()

  if (dashError || !dashboard) {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }

    // Get all tabs for this dashboard first
    const {data: tabs, error: tabsError} = await supabaseAdmin
        .from('dashboard_tab')
        .select('id')
        .eq('dashboard_id', dashboard.id)

    if (tabsError) throw createError({statusCode: 500, statusMessage: tabsError.message})

    let links: any[] = []
    if (tabs && tabs.length > 0) {
        // Get chart links for all tabs (no embedding to avoid ambiguous relationships)
        const tabIds = tabs.map((tab: any) => tab.id)
        const {data: linksData, error: linksError} = await supabaseAdmin
            .from('dashboard_charts')
            .select('chart_id, position, created_at')
            .in('tab_id', tabIds)
            .order('created_at', {ascending: true})

        if (linksError) throw createError({statusCode: 500, statusMessage: linksError.message})
        links = linksData || []
    }

  const chartIds: number[] = (links || []).map((l: any) => l.chart_id)

  let chartsById: Record<number, any> = {}
  if (chartIds.length > 0) {
    const { data: charts, error: chartsError } = await supabaseAdmin
      .from('charts')
      .select('id, name, description, state_json')
      .in('id', chartIds)

    if (chartsError) throw createError({ statusCode: 500, statusMessage: chartsError.message })
    chartsById = Object.fromEntries((charts || []).map((c: any) => [c.id, c]))
  }

  return {
    id: dashboard.id,
    name: dashboard.name,
    created_at: dashboard.created_at,
      width: dashboard.width,
      height: dashboard.height,
      thumbnail_url: dashboard.thumbnail_url,
    charts: (links || []).map((it: any) => {
      const c = chartsById[it.chart_id]
      return {
        chartId: it.chart_id,
        name: c?.name ?? '',
        position: it.position,
        state: c?.state_json ?? null
      }
    })
  }
})


