import {defineEventHandler, readBody} from 'h3'
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

    const body = await readBody(event)
    const {widgetId, position, style, configOverride} = body || {}

    if (!widgetId) {
        throw createError({statusCode: 400, statusMessage: 'Missing widgetId'})
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
          dashboard_id,
          tab_id,
          type,
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

    const updatePayload: any = {}
    if (position) updatePayload.position = position
    if (style != null) updatePayload.style = style
    if (configOverride != null) updatePayload.config_override = configOverride

    if (Object.keys(updatePayload).length === 0) {
        return {success: true}
    }

    const {error} = await supabaseAdmin
        .from('dashboard_widgets')
        .update(updatePayload)
        .eq('id', widgetId)

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {success: true}
})

