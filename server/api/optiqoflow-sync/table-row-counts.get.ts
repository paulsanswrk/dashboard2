import { createClient } from '@supabase/supabase-js'
import { db } from '../../../lib/db'
import { sql } from 'drizzle-orm'

/**
 * GET /api/optiqoflow-sync/table-row-counts
 * Returns the row count for each table in the optiqoflow schema.
 * Only accessible by SUPERADMIN.
 */
export default defineEventHandler(async (event) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Missing Supabase configuration'
            })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Auth check
        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Authorization header required'
            })
        }

        const token = authorization.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            })
        }

        // Check if user is SUPERADMIN
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (profileError || profileData.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only superadmins can access this resource'
            })
        }

        // Get estimated row counts from pg_stat_user_tables
        const result = await db.execute(sql`
            SELECT 
                relname as table_name,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = 'optiqoflow'
            ORDER BY relname
        `)

        // Transform into a simple { tableName: count } map
        const counts: Record<string, number> = {}
        for (const row of result as any[]) {
            counts[row.table_name] = Number(row.row_count)
        }

        return { success: true, counts }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to fetch table row counts'
        })
    }
})
