import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../utils/internalStorageQuery'
import { executeOptiqoflowQuery } from '../../utils/optiqoflowQuery'
import { db } from '../../../lib/db'
import { organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

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
        const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
            columns: 'id, organization_id, database_type, storage_location'
        })

        // Derive tenantId from authenticated user's organization (required for Optiqoflow)
        let tenantId: string | undefined
        const user = await serverSupabaseUser(event)
        if (user) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('organization_id')
                .eq('user_id', user.id)
                .single()

            if (profile?.organization_id) {
                const org = await db.select({ tenantId: organizations.tenantId })
                    .from(organizations)
                    .where(eq(organizations.id, profile.organization_id))
                    .limit(1)
                    .then(rows => rows[0])

                tenantId = org?.tenantId || undefined
            }
        }

        const limit = Math.min(Math.max(Number(body.limit || 100), 1), 1000)

        const storageLocation = (connection as any)?.storage_location || 'external'
        console.log(`[table-preview] Connection ${connectionId}, storage_location=${storageLocation}, database_type=${(connection as any)?.database_type}`)

        // Route based on storage_location
        if (isInternalStorage(storageLocation)) {
            let sql: string
            let rows: any[]

            if (storageLocation === 'optiqoflow') {
                // OptiqoFlow data with tenant isolation
                if (!tenantId) {
                    return {
                        columns: [],
                        rows: [],
                        meta: {
                            executionMs: Date.now() - start,
                            error: 'User must be associated with an organization that has a tenant_id configured for Optiqoflow data access.'
                        }
                    }
                }
                // Don't specify schema - tenant role's search_path handles it
                sql = `SELECT * FROM "${tableName}" LIMIT ${limit}`
                rows = await executeOptiqoflowQuery(sql, [], tenantId)

            } else if (storageLocation === 'supabase_synced') {
                // Synced MySQL data
                const storageInfo = await loadInternalStorageInfo(connectionId)
                if (!storageInfo.schemaName) {
                    return {
                        columns: [],
                        rows: [],
                        meta: {
                            executionMs: Date.now() - start,
                            error: 'Synced storage not configured'
                        }
                    }
                }
                sql = `SELECT * FROM "${storageInfo.schemaName}"."${tableName}" LIMIT ${limit}`
                rows = await executeInternalStorageQuery(storageInfo.schemaName, sql)
            } else {
                // Should not reach here
                throw new Error(`Unexpected storage_location: ${storageLocation}`)
            }

            console.log(`[table-preview] Query executed on ${storageLocation}`)

            const executionMs = Date.now() - start
            const columns = rows.length > 0
                ? Object.keys(rows[0]).map(k => ({ key: k, label: k }))
                : []

            return {
                columns,
                rows,
                meta: { executionMs, sql, rowCount: rows.length }
            }
        }

        // Fall back to MySQL query
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
