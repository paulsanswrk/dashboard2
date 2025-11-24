import {defineEventHandler, getQuery} from 'h3'
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

    const query = getQuery(event)
    const tabId = query.id as string

    if (!tabId) {
        throw createError({statusCode: 400, statusMessage: 'Missing tab ID'})
    }

    // Verify the user owns the tab (through dashboard ownership)
    const {data: tab, error: tabError} = await supabaseAdmin
        .from('dashboard_tab')
        .select(`
      id,
      dashboard_id,
      dashboards!inner(owner_id)
    `)
        .eq('id', tabId)
        .single()

    if (tabError || !tab) {
        throw createError({statusCode: 403, statusMessage: 'Tab not found or access denied'})
    }

    if (tab.dashboards.owner_id !== user.id) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard access denied'})
    }

    // Check if this is the last tab in the dashboard
    const {data: otherTabs, error: countError} = await supabaseAdmin
        .from('dashboard_tab')
        .select('id')
        .eq('dashboard_id', tab.dashboard_id)
        .neq('id', tabId)

    if (countError) {
        throw createError({statusCode: 500, statusMessage: countError.message})
    }

    if (!otherTabs || otherTabs.length === 0) {
        throw createError({statusCode: 400, statusMessage: 'Cannot delete the last tab in a dashboard'})
    }

    // Delete the tab (cascade will handle dashboard_charts)
    const {error} = await supabaseAdmin
        .from('dashboard_tab')
        .delete()
        .eq('id', tabId)

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {success: true}
})
