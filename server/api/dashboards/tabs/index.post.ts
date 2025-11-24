import {defineEventHandler, readBody} from 'h3'
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

    const body = await readBody(event)
    const {dashboardId, name} = body || {}

    if (!dashboardId || !name?.trim()) {
        throw createError({statusCode: 400, statusMessage: 'Missing dashboardId or name'})
    }

    // Verify the user owns the dashboard
    const {data: dashboard, error: dashboardError} = await supabaseAdmin
        .from('dashboards')
        .select('id')
        .eq('id', dashboardId)
        .eq('owner_id', user.id)
        .single()

    if (dashboardError || !dashboard) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard not found or access denied'})
    }

    // Get the next position for the new tab
    const {data: existingTabs, error: tabsError} = await supabaseAdmin
        .from('dashboard_tab')
        .select('position')
        .eq('dashboard_id', dashboardId)
        .order('position', {ascending: false})
        .limit(1)

    if (tabsError) {
        throw createError({statusCode: 500, statusMessage: tabsError.message})
    }

    const nextPosition = existingTabs?.[0]?.position ? existingTabs[0].position + 1 : 0

    const {data: newTab, error} = await supabaseAdmin
        .from('dashboard_tab')
        .insert({
            dashboard_id: dashboardId,
            name: name.trim(),
            position: nextPosition
        })
        .select()
        .single()

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {
        success: true,
        tab: newTab
    }
})
