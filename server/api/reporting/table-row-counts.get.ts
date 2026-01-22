import { defineEventHandler, getQuery } from 'h3'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo } from '../../utils/internalStorageQuery'
import { pgClient } from '../../../lib/db'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

/**
 * Get row counts for all tables in a connection.
 * Used by the schema editor to filter out empty tables.
 */
export default defineEventHandler(async (event) => {
    const { connectionId } = getQuery(event) as any
    if (!connectionId) {
        return {}
    }

    const connId = Number(connectionId)

    const connection = await AuthHelper.requireConnectionAccess(event, connId, {
        columns: 'id, organization_id, database_type, storage_location'
    })

    const isInternalDataSource = (connection as any)?.database_type === 'internal'
    const storageInfo = await loadInternalStorageInfo(connId)

    // Handle internal data source (optiqoflow schema)
    if (isInternalDataSource) {
        try {
            const rows = await pgClient.unsafe(`
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name,
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM optiqoflow.%I', table_name), false, true, '') as xml_count
          FROM information_schema.tables
          WHERE table_schema = 'optiqoflow'
            AND table_type = 'BASE TABLE'
        ) t
      `) as Array<{ table_name: string; row_count: number }>

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] Internal source: ${Object.keys(counts).length} tables counted`)
            return counts
        } catch (error: any) {
            console.error('[table-row-counts] Error fetching internal row counts:', error?.message)
            return {}
        }
    }

    // Handle internal storage (synced MySQL data in PostgreSQL)
    if (storageInfo.useInternalStorage && storageInfo.schemaName) {
        try {
            const schemaName = storageInfo.schemaName
            const rows = await pgClient.unsafe(`
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name,
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', $1, table_name), false, true, '') as xml_count
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
        ) t
      `, [schemaName]) as Array<{ table_name: string; row_count: number }>

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] Internal storage (${schemaName}): ${Object.keys(counts).length} tables counted`)
            return counts
        } catch (error: any) {
            console.error('[table-row-counts] Error fetching internal storage row counts:', error?.message)
            return {}
        }
    }

    // Handle external MySQL connection
    try {
        const cfg = await loadConnectionConfigFromSupabase(event, connId)

        return await withMySqlConnectionConfig(cfg, async (conn) => {
            const [rows] = await conn.query(`
        SELECT 
          table_name,
          table_rows as row_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
      `) as any

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] MySQL: ${Object.keys(counts).length} tables counted`)
            return counts
        })
    } catch (error: any) {
        console.error('[table-row-counts] Error fetching MySQL row counts:', error?.message)
        return {}
    }
})
