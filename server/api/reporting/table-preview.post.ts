import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { AuthHelper } from '../../utils/authHelper'

type TablePreviewRequest = {
    connectionId: number
    tableName: string
    limit?: number
}

function isSafeIdentifier(name: string | undefined): name is string {
    return !!name && /^[a-zA-Z0-9_]+$/.test(name)
}

function wrapId(id: string) {
    return `\`${id}\``
}

export default defineEventHandler(async (event) => {
    const body = await readBody<TablePreviewRequest>(event)
    const start = Date.now()

    try {
        const connectionId = body?.connectionId ? Number(body.connectionId) : null
        const tableName = body?.tableName

        if (!connectionId) {
            return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'missing_connection' } }
        }

        if (!tableName || !isSafeIdentifier(tableName)) {
            return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'invalid_table_name' } }
        }

        // Verify user has access to this connection
        await AuthHelper.requireConnectionAccess(event, connectionId, {
            columns: 'id, organization_id'
        })

        const limit = Math.min(Math.max(Number(body.limit || 100), 1), 1000)
        const sql = `SELECT * FROM ${wrapId(tableName)} LIMIT ${limit}`

        const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
        const result = await withMySqlConnectionConfig(cfg, async (conn) => {
            const [rows, fields] = await conn.query(sql)
            return { rows: rows as any[], fields: fields as any[] }
        })

        // Extract column information from fields
        const columns = result.fields?.map((f: any) => ({
            key: f.name,
            label: f.name,
            type: f.type
        })) || []

        const executionMs = Date.now() - start
        return {
            columns,
            rows: result.rows,
            meta: { executionMs, sql, rowCount: result.rows.length }
        }
    } catch (e: any) {
        const executionMs = Date.now() - start
        return { columns: [], rows: [], meta: { executionMs, error: e?.message || 'query_failed' } }
    }
})
