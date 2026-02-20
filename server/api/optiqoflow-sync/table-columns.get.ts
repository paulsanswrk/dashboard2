import { createClient } from '@supabase/supabase-js'
import { db } from '../../../lib/db'
import { sql } from 'drizzle-orm'

/**
 * GET /api/optiqoflow-sync/table-columns
 * Returns column metadata for all tables in the optiqoflow schema.
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

        const result = await db.execute(sql`
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'optiqoflow'
            ORDER BY table_name, ordinal_position
        `)

        // Group by table name
        const columns: Record<string, { name: string; type: string; nullable: boolean }[]> = {}
        for (const row of result as any[]) {
            if (!columns[row.table_name]) {
                columns[row.table_name] = []
            }
            columns[row.table_name].push({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES'
            })
        }

        return { success: true, columns }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to fetch table columns'
        })
    }
})
