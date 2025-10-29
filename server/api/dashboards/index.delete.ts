import { defineEventHandler, getQuery } from 'h3'
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
  const { id } = getQuery(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

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

  const { error } = await supabaseAdmin
    .from('dashboards')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})


