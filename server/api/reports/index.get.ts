import {defineEventHandler} from 'h3'
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

    const {data, error} = await supabaseAdmin
        .from('reports')
        .select('id, report_title, created_at, status, interval, next_run_at')
        .eq('user_id', user.id)
        .order('created_at', {ascending: false})

    if (error) {
        throw createError({statusCode: 500, statusMessage: error.message})
    }

    return (data || []).map((report: any) => ({
        id: report.id,
        name: report.report_title,
        createdAt: report.created_at,
        status: report.status,
        interval: report.interval,
        nextRunAt: report.next_run_at
    }))
})
