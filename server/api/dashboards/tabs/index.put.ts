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
    const {tabId, name, position} = body || {}

    if (!tabId) {
        throw createError({statusCode: 400, statusMessage: 'Missing tabId'})
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

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (position !== undefined) updates.position = position

    if (Object.keys(updates).length === 0) {
        throw createError({statusCode: 400, statusMessage: 'No valid updates provided'})
    }

    const {data: updatedTab, error} = await supabaseAdmin
        .from('dashboard_tab')
        .update(updates)
        .eq('id', tabId)
        .select()
        .single()

    if (error) throw createError({statusCode: 500, statusMessage: error.message})

    return {
        success: true,
        tab: updatedTab
    }
})
