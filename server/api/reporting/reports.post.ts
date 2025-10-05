import { defineEventHandler, readBody } from 'h3'
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
  const ownerEmail = user.email || 'unknown'
  const body = await readBody(event)
  const { name, description, state } = body || {}
  if (!name || !state) {
    throw createError({ statusCode: 400, statusMessage: 'Missing name or state' })
  }
  const ownerId = undefined // optional; set below if we have a user
  const payload: any = {
    name,
    description: description || '',
    owner_email: ownerEmail,
    state_json: state
  }
  // Set owner_id from session when available
  if (user?.id) payload.owner_id = user.id

  const { data, error } = await supabaseAdmin
    .from('reporting_reports')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, reportId: data.id }
})


