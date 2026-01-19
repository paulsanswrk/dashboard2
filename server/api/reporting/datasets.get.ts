import { defineEventHandler, getQuery } from 'h3'
import { supabaseAdmin } from '../supabase'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo } from '../../utils/internalStorageQuery'
import { pgClient } from '../../../lib/db'

export default defineEventHandler(async (event) => {
  const { connectionId } = getQuery(event) as any
  if (!connectionId) return []

  // Require org-aligned access to the data connection
  const connId = Number(connectionId)
  await AuthHelper.requireConnectionAccess(event, connId)
  // If saved schema exists, prefer it for dataset list
  try {
    const { data: schemaData } = await supabaseAdmin
      .from('data_connections')
      .select('schema_json')
      .eq('id', connId)
      .single()
    const tables = (schemaData?.schema_json?.tables || []) as Array<{ tableId: string; tableName?: string }>
    if (tables.length) {
      return tables.map(t => ({ id: t.tableId, name: t.tableId, label: t.tableId }))
    }
  } catch { }

  // Check if connection uses internal storage (PostgreSQL)
  try {
    const storageInfo = await loadInternalStorageInfo(connId)
    if (storageInfo.useInternalStorage) {
      // Query PostgreSQL information_schema for optiqoflow tables
      const schemaName = storageInfo.schemaName || 'optiqoflow'
      const rows = await pgClient`
        SELECT table_name as id, table_name as name, table_name as label
        FROM information_schema.tables
        WHERE table_schema = ${schemaName} AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
      console.log(`[datasets] Found ${rows.length} tables in internal schema ${schemaName}`)
      return rows
    }
  } catch (e: any) {
    console.error('[datasets] Internal storage query error:', e?.message)
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

