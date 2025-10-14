import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id } = getQuery(event) as any
  const connectionId = Number(id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const { error } = await supabaseAdmin
    .from('data_connections')
    .delete()
    .eq('id', connectionId)
    .eq('owner_id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})


