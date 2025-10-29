import { defineEventHandler } from 'h3'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = event.context.params?.id as string
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

  // Verify ownership and get dashboard
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id, name, owner_id, is_public, created_at')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (dashError || !dashboard) {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }

  // Get chart links first (no embedding to avoid ambiguous relationships)
  const { data: links, error: linksError } = await supabaseAdmin
    .from('dashboard_charts')
    .select('chart_id, position, created_at')
    .eq('dashboard_id', dashboard.id)
    .order('created_at', { ascending: true })

  if (linksError) throw createError({ statusCode: 500, statusMessage: linksError.message })

  const chartIds: number[] = (links || []).map((l: any) => l.chart_id)

  let chartsById: Record<number, any> = {}
  if (chartIds.length > 0) {
    const { data: charts, error: chartsError } = await supabaseAdmin
      .from('charts')
      .select('id, name, description, state_json')
      .in('id', chartIds)
      .eq('owner_id', user.id)

    if (chartsError) throw createError({ statusCode: 500, statusMessage: chartsError.message })
    chartsById = Object.fromEntries((charts || []).map((c: any) => [c.id, c]))
  }

  return {
    id: dashboard.id,
    name: dashboard.name,
    created_at: dashboard.created_at,
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


