import { defineEventHandler, readBody } from 'h3'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

type LayoutItem = { chartId: number; position: any }

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { id, name, layout } = body || {}
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

  // Verify ownership
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
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
    // Update positions for each item
    const updates = (layout as LayoutItem[]).map((li) =>
      supabaseAdmin
        .from('dashboard_charts')
        .update({ position: li.position })
        .eq('dashboard_id', id)
        .eq('chart_id', li.chartId)
    )
    const results = await Promise.all(updates)
    const err = results.find(r => (r as any).error)
    if (err && (err as any).error) throw createError({ statusCode: 500, statusMessage: (err as any).error.message })
  }

  return { success: true }
})


