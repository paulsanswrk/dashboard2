import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const ownerEmail = user.email || 'unknown'
  const { id } = getQuery(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const { error } = await supabaseAdmin
    .from('charts')
    .delete()
    .eq('id', id)
    .eq('owner_email', ownerEmail)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
