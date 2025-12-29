import {createError, defineEventHandler, readBody} from 'h3'
import {AuthHelper} from '../../utils/authHelper'
import {loadConnectionConfigFromSupabase} from '../../utils/connectionConfig'
import {withMySqlConnectionConfig} from '../../utils/mysqlClient'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const {connectionId, sql} = body

    if (!connectionId || !sql) {
        throw createError({statusCode: 400, message: 'connectionId and sql are required'})
    }

    // Validate SQL - only SELECT statements allowed
    const trimmedSql = sql.trim().toUpperCase()
    if (!trimmedSql.startsWith('SELECT')) {
        throw createError({statusCode: 400, message: 'Only SELECT statements are allowed for custom views'})
    }

    // Verify access to connection
    await AuthHelper.requireConnectionAccess(event, connectionId)

    // Load connection config
    const config = await loadConnectionConfigFromSupabase(event, connectionId)

    try {
        // Execute query with LIMIT to get preview data
        const result = await withMySqlConnectionConfig(config, async (conn) => {
            // Wrap the query to limit results
            const previewSql = `SELECT * FROM (${sql.trim().replace(/;+$/, '')}) AS preview_query LIMIT 10`
            const [rows, fields] = await conn.query(previewSql)
            return {rows, fields}
        })

        // Extract column names from the result
        const columns = (result.fields as any[])?.map((f: any) => f.name) || Object.keys((result.rows as any[])?.[0] || {})
        const data = result.rows as any[]

        return {
            columns,
            data,
            rowCount: data.length
        }
    } catch (err: any) {
        console.error('[Custom View Preview] Query error:', err.message)
        throw createError({
            statusCode: 400,
            message: `SQL Error: ${err.message}`
        })
    }
})
