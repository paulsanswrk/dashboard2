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

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('charts')
      .select('id, name, description, owner_email, state_json, created_at, updated_at, owner_id')
      .eq('id', id)
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    if (!data) return null
    // Basic owner check: email match or owner_id empty in debug
    if (data.owner_email !== ownerEmail) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerEmail: data.owner_email,
      state: data.state_json,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  const { data, error } = await supabaseAdmin
    .from('charts')
    .select('id, name, description, owner_email, created_at, updated_at')
    .eq('owner_email', ownerEmail)
    .order('updated_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    ownerEmail: r.owner_email,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }))
})
