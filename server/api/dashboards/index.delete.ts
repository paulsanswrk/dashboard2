import {defineEventHandler, getQuery} from 'h3'
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
  const { id } = getQuery(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    // Verify org ownership
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id')
    .eq('id', id)
      .eq('organization_id', profile.organization_id)
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


