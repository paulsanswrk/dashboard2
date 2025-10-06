import { defineEventHandler } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .select('id, internal_name, database_name, database_type, host, port')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})


