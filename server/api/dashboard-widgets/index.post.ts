import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

const SUPPORTED_TYPES = ['chart', 'text', 'image', 'icon']

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const body = await readBody(event)
    const {tabId, type, position, chartId, style, configOverride} = body || {}

    if (!tabId || !type || !position) {
        throw createError({statusCode: 400, statusMessage: 'Missing tabId, type, or position'})
    }

    if (!SUPPORTED_TYPES.includes(type)) {
        throw createError({statusCode: 400, statusMessage: 'Unsupported widget type'})
    }

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    const {data: tab, error: tabError} = await supabaseAdmin
        .from('dashboard_tab')
        .select(`
          id,
          dashboard_id,
          dashboards!inner(organization_id)
        `)
        .eq('id', tabId)
        .single()

    if (tabError || !tab) {
        throw createError({statusCode: 403, statusMessage: 'Tab not found or access denied'})
    }

    if (tab.dashboards.organization_id !== profile.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard access denied'})
    }

    if (type === 'chart') {
        const {data: chart, error: chartError} = await supabaseAdmin
            .from('charts')
            .select('id')
            .eq('id', chartId)
            .single()
        if (chartError || !chart) {
            throw createError({statusCode: 403, statusMessage: 'Chart not found or access denied'})
        }
    }

    const insertPayload: any = {
        dashboard_id: tab.dashboard_id,
        tab_id: tabId,
        type,
        position,
        style: style ?? {},
        config_override: configOverride ?? {}
    }

    if (type === 'chart') {
        insertPayload.chart_id = chartId
    }

    const {data: inserted, error} = await supabaseAdmin
        .from('dashboard_widgets')
        .insert(insertPayload)
        .select('id')
        .single()

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {success: true, widgetId: inserted?.id}
})

