import { pgClient } from '../../../lib/db'

export default defineEventHandler(async (event) => {
    // Basic auth check - ensure user is authenticated (expand as needed for role checks)
    // const user = await serverSupabaseUser(event)
    // if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 50
    const offset = (page - 1) * limit
    const tenantId = query.tenant_id as string
    const status = query.status as string

    try {
        let sql = `
            SELECT 
                l.*,
                t.short_name as tenant_name
            FROM tenants.webhook_logs l
            LEFT JOIN tenants.tenant_short_names t ON l.tenant_id = t.tenant_id
            WHERE 1=1
        `
        const params: any[] = []
        let paramIndex = 1

        if (tenantId) {
            sql += ` AND l.tenant_id = $${paramIndex++}`
            params.push(tenantId)
        }

        if (status) {
            if (status === 'success') {
                sql += ` AND l.success = true`
            } else if (status === 'error') {
                sql += ` AND l.success = false`
            }
        }

        // Add sorting
        sql += ` ORDER BY l.created_at DESC`

        // Add pagination
        sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
        params.push(limit, offset)

        const result = await pgClient.unsafe(sql, params)

        // Get total count (simplified, ideally separate query or window function)
        // For performance on large logs, maybe estimate or limit count window.
        // Let's do a separate count query for now.
        let countSql = `SELECT count(*) as total FROM tenants.webhook_logs l WHERE 1=1`
        const countParams: any[] = []
        let countParamIndex = 1

        if (tenantId) {
            countSql += ` AND l.tenant_id = $${countParamIndex++}`
            countParams.push(tenantId)
        }
        if (status) {
            if (status === 'success') countSql += ` AND l.success = true`
            else if (status === 'error') countSql += ` AND l.success = false`
        }

        const countResult = await pgClient.unsafe(countSql, countParams)
        const total = Number(countResult[0]?.total || 0)

        return {
            data: result,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }

    } catch (error: any) {
        console.error('Failed to fetch logs:', error)
        throw createError({
            statusCode: 500,
            message: 'Failed to fetch logs'
        })
    }
})
