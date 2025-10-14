import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { datasetId, connectionId } = getQuery(event) as any
  if (!datasetId || typeof datasetId !== 'string') return []
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
  // Prefer saved schema if present
  try {
    const { data: schemaData } = await supabaseAdmin
      .from('data_connections')
      .select('schema_json')
      .eq('id', connId)
      .single()
    const tables = (schemaData?.schema_json?.tables || []) as Array<any>
    const entry = tables.find(t => String(t.tableId) === datasetId)
    if (entry && Array.isArray(entry.columns)) {
      const pkCols: string[] = Array.isArray(entry.primaryKey) ? entry.primaryKey.map((x: any) => String(x)) : []
      const fkRefs: Record<string, Array<{ targetTable: string; targetColumn: string; constraintName?: string }>> = {}
      if (Array.isArray(entry.foreignKeys)) {
        for (const fk of entry.foreignKeys) {
          for (const p of fk.columnPairs || []) {
            const src = String(p.sourceColumn)
            if (!fkRefs[src]) fkRefs[src] = []
            fkRefs[src].push({ targetTable: fk.targetTable, targetColumn: p.targetColumn, constraintName: fk.constraintName })
          }
        }
      }
      return entry.columns.map((c: any) => {
        const fieldId = c.fieldId || c.name
        const name = c.name || c.fieldId
        const refs = fkRefs[name] || fkRefs[fieldId] || []
        return {
          fieldId,
          name,
          label: c.label || name,
          type: c.type,
          isNumeric: !!c.isNumeric,
          isDate: !!c.isDate,
          isString: !!c.isString,
          isBoolean: !!c.isBoolean,
          isPrimaryKey: pkCols.includes(name) || pkCols.includes(fieldId),
          foreignKeyRefs: refs
        }
      })
    }
  } catch {}
  const cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))

  const rows = await withMySqlConnectionConfig(cfg, async (conn) => {
    const [r] = await conn.query(
      `select column_name as field_id,
              column_name as name,
              column_name as label,
              data_type
       from information_schema.columns
       where table_schema = database() and table_name = ?
       order by ordinal_position`,
      [datasetId]
    )
    return r as any[]
  })
  return rows.map((c: any) => ({
    fieldId: c.field_id,
    name: c.name,
    label: c.label,
    type: c.data_type,
    isNumeric: ['int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'double', 'float'].some(t => c.data_type.includes(t)),
    isDate: ['date', 'datetime', 'timestamp'].some(t => c.data_type.includes(t)),
    isString: ['char', 'text', 'varchar'].some(t => c.data_type.includes(t)),
    isBoolean: ['tinyint(1)', 'boolean', 'bool'].some(t => c.data_type.includes(t))
  }))
})


