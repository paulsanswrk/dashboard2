import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
import {checkEditPermission} from '../../utils/permissions'
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

    // Get widget and dashboard info
    const {data: widget, error: widgetError} = await supabaseAdmin
        .from('dashboard_widgets')
        .select('id, dashboard_id')
        .eq('id', widgetId)
        .single()

    if (widgetError || !widget) {
        throw createError({statusCode: 404, statusMessage: 'Widget not found'})
    }

    // Check if user has edit permission for the dashboard
    const hasEditPermission = await checkEditPermission(widget.dashboard_id, user.id)
    if (!hasEditPermission) {
        throw createError({statusCode: 403, statusMessage: 'Edit permission required for dashboard'})
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

