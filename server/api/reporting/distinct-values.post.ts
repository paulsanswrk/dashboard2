import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo, getDistinctValuesInternal } from '../../utils/internalStorageQuery'

type DistinctValuesRequest = {
    connectionId: number
    tableName: string
    columnName: string
    limit?: number
}

function isSafeIdentifier(name: string | undefined): name is string {
    return !!name && /^[a-zA-Z0-9_]+$/.test(name)
}

function wrapId(id: string) {
    return `\`${id}\``
}

export default defineEventHandler(async (event) => {
    const body = await readBody<DistinctValuesRequest>(event)

    try {
        const { connectionId, tableName, columnName, limit = 200 } = body

        if (!connectionId) {
            return { success: false, error: 'missing_connection_id', values: [] }
        }

        if (!isSafeIdentifier(tableName) || !isSafeIdentifier(columnName)) {
            return { success: false, error: 'invalid_identifiers', values: [] }
        }

        // Verify access to this connection
        await AuthHelper.requireConnectionAccess(event, connectionId, {
            columns: 'id, organization_id'
        })

        const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000)

        // Check if connection uses internal storage
        const storageInfo = await loadInternalStorageInfo(connectionId)

        if (storageInfo.useInternalStorage && storageInfo.schemaName) {
            console.log(`[distinct-values] Using internal storage: ${storageInfo.schemaName}`)
            const values = await getDistinctValuesInternal(
                storageInfo.schemaName,
                tableName,
                columnName,
                safeLimit
            )
            return {
                success: true,
                values,
                total: values.length
            }
        }

        // Fall back to MySQL query
        const sql = `
            SELECT DISTINCT ${wrapId(columnName)} AS value
            FROM ${wrapId(tableName)}
            WHERE ${wrapId(columnName)} IS NOT NULL
            ORDER BY ${wrapId(columnName)}
                LIMIT ?
        `

        const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
        const rows = await withMySqlConnectionConfig(cfg, async (conn) => {
            const [res] = await conn.query(sql, [safeLimit])
            return res as { value: unknown }[]
        })

        // Convert to string array
        const values = rows.map(r => String(r.value))

        return {
            success: true,
            values,
            total: values.length
        }
    } catch (e: any) {
        console.error('[distinct-values] Error:', e?.message)
        return { success: false, error: e?.message || 'query_failed', values: [] }
    }
})
