import {defineEventHandler, getRouterParam} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({statusCode: 400, statusMessage: 'Dashboard ID is required'})
    }

    const {data: profile, error: profileError} = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (profileError || !profile?.organization_id) {
        throw createError({statusCode: 403, statusMessage: 'Organization not found for user'})
    }

    // Verify dashboard belongs to user's organization
    const {data: dashboard, error: dashboardError} = await supabaseAdmin
        .from('dashboards')
        .select('id')
        .eq('id', dashboardId)
        .eq('organization_id', profile.organization_id)
        .single()

    if (dashboardError || !dashboard) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard not found or access denied'})
    }

    // Fetch tabs for the dashboard
    const {data: tabs, error: tabsError} = await supabaseAdmin
        .from('dashboard_tab')
        .select('id, name, position, style, options')
        .eq('dashboard_id', dashboardId)
        .order('position', {ascending: true})

    if (tabsError) {
        throw createError({statusCode: 500, statusMessage: tabsError.message})
    }

    return {tabs: tabs || []}
})
