import {defineEventHandler, getQuery} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const query = getQuery(event)
    const widgetId = query.id as string

    if (!widgetId) {
        throw createError({statusCode: 400, statusMessage: 'Missing widget ID'})
    }

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    const {data: widget, error: widgetError} = await supabaseAdmin
        .from('dashboard_widgets')
        .select(`
          id,
          dashboards!inner(organization_id)
        `)
        .eq('id', widgetId)
        .single()

    if (widgetError || !widget) {
        throw createError({statusCode: 404, statusMessage: 'Widget not found'})
    }

    if (widget.dashboards.organization_id !== profile.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard access denied'})
    }

    const {error} = await supabaseAdmin
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId)

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {success: true}
})

