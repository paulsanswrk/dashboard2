import { defineEventHandler, getQuery } from 'h3'
import { supabaseAdmin } from '../supabase'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo } from '../../utils/internalStorageQuery'
import { pgClient, db } from '../../../lib/db'
import { organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { connectionId } = getQuery(event) as any
  if (!connectionId) return []

  // Require org-aligned access to the data connection
  const connId = Number(connectionId)
  const connection = await AuthHelper.requireConnectionAccess(event, connId, {
    columns: 'id, organization_id, database_type, schema_json, storage_location'
  })

  // If saved schema exists, prefer it for dataset list
  try {
    const schemaJson = (connection as any)?.schema_json
    const tables = (schemaJson?.tables || []) as Array<{ tableId: string; tableName?: string }>
    if (tables.length) {
      return tables.map(t => ({ id: t.tableId, name: t.tableId, label: t.tableId }))
    }
  } catch { }

  // Route based on storage_location
  const storageLocation = (connection as any)?.storage_location || 'external'

  if (storageLocation === 'optiqoflow') {
    // OptiqoFlow data source - return tables from optiqoflow schema
    // Tenant filtering is handled by the views themselves (via tenant role)
    try {
      const schemaName = 'optiqoflow'
      const rows = await pgClient`
        SELECT table_name as id, table_name as name, table_name as label
        FROM information_schema.tables
        WHERE table_schema = ${schemaName} AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
      console.log(`[datasets] Found ${rows.length} tables in optiqoflow schema`)
      return rows
    } catch (e: any) {
      console.error('[datasets] OptiqoFlow query error:', e?.message)
    }
  }

  if (storageLocation === 'supabase_synced') {
    // Synced MySQL data in PostgreSQL
    try {
      const storageInfo = await loadInternalStorageInfo(connId)
      if (storageInfo.useInternalStorage && storageInfo.schemaName) {
        const rows = await pgClient`
          SELECT table_name as id, table_name as name, table_name as label
          FROM information_schema.tables
          WHERE table_schema = ${storageInfo.schemaName} AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
        console.log(`[datasets] Found ${rows.length} tables in synced schema ${storageInfo.schemaName}`)
        return rows
      }
    } catch (e: any) {
      console.error('[datasets] Synced storage query error:', e?.message)
    }
  }

  // MySQL: list tables from information_schema for current database
  try {
    const rows = await (async () => {
      const cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))
      return await withMySqlConnectionConfig(cfg, async (conn) => {
        const [r] = await conn.query(
          `select table_name as id, table_name as name, table_name as label
           from information_schema.tables
           where table_schema = database() and table_type = 'BASE TABLE'
           order by table_name`
        )
        return r as any[]
      })
    })()
    return rows
  } catch (e) {
    return []
  }
})

