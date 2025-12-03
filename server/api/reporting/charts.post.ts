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
  const ownerEmail = user.email || 'unknown'
  const body = await readBody(event)
  const { name, description, state } = body || {}
  if (!name || !state) {
    throw createError({ statusCode: 400, statusMessage: 'Missing name or state' })
  }
  const ownerId = undefined // optional; set below if we have a user
  function toStoredState(input: any) {
    if (!input || typeof input !== 'object') return input
    const publicKeys = new Set(['appearance', 'chartType'])
    const publicPart: any = {}
    const internalPart: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (publicKeys.has(k)) publicPart[k] = v
      else internalPart[k] = v
    }
    return { ...publicPart, internal: internalPart }
  }

  const payload: any = {
    name,
    description: description || '',
    owner_email: ownerEmail,
    state_json: toStoredState(state)
  }

    // Extract data_connection_id from state and store in dedicated column
    if (state.dataConnectionId != null) {
        payload.data_connection_id = state.dataConnectionId
    }

  // Set owner_id from session when available
  if (user?.id) payload.owner_id = user.id

  const { data, error } = await supabaseAdmin
    .from('charts')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, chartId: data.id }
})
