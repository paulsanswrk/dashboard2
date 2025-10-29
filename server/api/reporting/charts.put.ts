import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const ownerEmail = user.email || 'unknown'
  const body = await readBody(event)
  const { id, name, description, state } = body || {}
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const updates: any = { updated_at: new Date().toISOString() }
  if (name != null) updates.name = name
  if (description != null) updates.description = description
  if (state != null) updates.state_json = state
  const { error } = await supabaseAdmin
    .from('charts')
    .update(updates)
    .eq('id', id)
    .eq('owner_email', ownerEmail)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
