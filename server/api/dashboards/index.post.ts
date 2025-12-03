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

  const body = await readBody(event)
  const { name, isPublic = false, password } = body || {}

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Missing dashboard name' })
  }

  const payload: any = {
    name,
    owner_id: user.id,
    is_public: isPublic
  }

  if (isPublic && password) {
    payload.password = password
  }

  const { data, error } = await supabaseAdmin
    .from('dashboards')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    // Auto-create a "Main" tab for the new dashboard
    const {error: tabError} = await supabaseAdmin
        .from('dashboard_tab')
        .insert({
            dashboard_id: data.id,
            name: 'Main',
            position: 0
        })

    if (tabError) {
        // If tab creation fails, we should clean up the dashboard
        await supabaseAdmin
            .from('dashboards')
            .delete()
            .eq('id', data.id)
            .eq('owner_id', user.id)

        throw createError({statusCode: 500, statusMessage: 'Failed to create default tab for dashboard'})
    }

  return { success: true, dashboardId: data.id }
})
