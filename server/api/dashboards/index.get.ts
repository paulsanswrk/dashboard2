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

  const { data, error } = await supabaseAdmin
    .from('dashboards')
    .select('id, name, owner_id, is_public, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    owner_id: d.owner_id,
    is_public: d.is_public,
    created_at: d.created_at
  }))
})


