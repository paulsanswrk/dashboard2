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
    const {tabId, chartId, position} = body || {}

    if (!tabId || !chartId || !position) {
        throw createError({statusCode: 400, statusMessage: 'Missing tabId, chartId, or position'})
    }

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    // Verify the tab belongs to a dashboard in the user's organization
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

    // Check dashboard org access
    if (tab.dashboards.organization_id !== profile.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard access denied'})
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
        .from('dashboard_charts')
        .insert({
            tab_id: tabId,
            chart_id: chartId,
            position: position
        })

    if (error) throw createError({statusCode: 500, statusMessage: error.message})
    return {success: true}
})
