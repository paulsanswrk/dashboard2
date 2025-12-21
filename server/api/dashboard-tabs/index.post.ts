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
    const {tabId, chartId, position, configOverride} = body || {}

    if (!tabId || !chartId || !position) {
        throw createError({statusCode: 400, statusMessage: 'Missing tabId, chartId, or position'})
    }

    // Get dashboard ID from tab
    const {data: tab, error: tabError} = await supabaseAdmin
        .from('dashboard_tab')
        .select('dashboard_id')
        .eq('id', tabId)
        .single()

    if (tabError || !tab) {
        throw createError({statusCode: 404, statusMessage: 'Tab not found'})
    }

    // Check if user has edit permission for the dashboard
    const hasEditPermission = await checkEditPermission(tab.dashboard_id, user.id)
    if (!hasEditPermission) {
        throw createError({statusCode: 403, statusMessage: 'Edit permission required for dashboard'})
    }

    // Verify the chart exists (dashboard-level permissions handle visibility)
    const {data: chart, error: chartError} = await supabaseAdmin
        .from('charts')
        .select('id')
        .eq('id', chartId)
        .single()

    if (chartError || !chart) {
        throw createError({statusCode: 403, statusMessage: 'Chart not found or access denied'})
    }

    const {error} = await supabaseAdmin
        .from('dashboard_widgets')
        .insert({
            dashboard_id: tab.dashboard_id,
            tab_id: tabId,
            type: 'chart',
            chart_id: chartId,
            position: position,
            config_override: configOverride ?? {}
        })

    if (error) throw createError({statusCode: 500, statusMessage: error.message})
    return {success: true}
})
