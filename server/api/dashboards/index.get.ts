import {defineEventHandler} from 'h3'
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

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

  const { data, error } = await supabaseAdmin
    .from('dashboards')
      .select('id, name, organization_id, creator, is_public, created_at')
      .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
      organization_id: d.organization_id,
      creator: d.creator,
    is_public: d.is_public,
    created_at: d.created_at
  }))
})


