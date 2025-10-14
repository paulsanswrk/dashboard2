import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { connectionId } = getQuery(event) as any
  if (!connectionId) return []

  // Verify user owns the data connection
  const connId = Number(connectionId)
  const { data: connectionData, error: connError } = await supabaseAdmin
    .from('data_connections')
    .select('owner_id')
    .eq('id', connId)
    .single()

  if (connError || !connectionData || connectionData.owner_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied to connection' })
  }
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
  } catch {}
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


