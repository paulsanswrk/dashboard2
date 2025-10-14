import { defineEventHandler, readBody, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

// Update fields on an existing connection. Supports updating schema_json.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id } = getQuery(event) as any
  const body = await readBody<any>(event)
  const connectionId = Number(id || body?.id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const update: any = {}
  if (body?.schema && typeof body.schema === 'object') {
    // Enrich provided schema with PK/FK info from the source DB
    const selected = body.schema || {}
    const tables = Array.isArray(selected.tables) ? selected.tables : []
    if (tables.length) {
      const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
      const enrichedTables = await withMySqlConnectionConfig(cfg, async (conn) => {
        const result: any[] = []
        for (const t of tables) {
          const tableId = String(t.tableId)
          // Fetch primary key columns in ordinal order
          const [pkRows] = await conn.query(
            `select kcu.column_name, kcu.ordinal_position
             from information_schema.table_constraints tc
             join information_schema.key_column_usage kcu
               on tc.constraint_name = kcu.constraint_name
              and tc.table_schema = kcu.table_schema
            where tc.table_schema = database()
              and tc.table_name = ?
              and tc.constraint_type = 'PRIMARY KEY'
            order by kcu.ordinal_position`,
            [tableId]
          ) as any
          const primaryKey = (pkRows as any[]).map(r => r.column_name)

          // Fetch foreign key relationships for this table (both directions)
          const [fkRows] = await conn.query(
            `select rc.constraint_name,
                    kcu.table_name as source_table,
                    kcu.referenced_table_name as target_table,
                    kcu.ordinal_position as position,
                    kcu.column_name as source_column,
                    kcu.referenced_column_name as target_column,
                    rc.update_rule,
                    rc.delete_rule
             from information_schema.referential_constraints rc
             join information_schema.key_column_usage kcu
               on rc.constraint_name = kcu.constraint_name
              and rc.constraint_schema = kcu.constraint_schema
            where kcu.table_schema = database()
              and (kcu.table_name = ? or kcu.referenced_table_name = ?)
            order by rc.constraint_name, kcu.ordinal_position`,
            [tableId, tableId]
          ) as any
          // Group by constraint
          const grouped: Record<string, any> = {}
          for (const r of fkRows as any[]) {
            const name = r.constraint_name
            if (!grouped[name]) {
              grouped[name] = {
                constraintName: r.constraint_name,
                sourceTable: r.source_table,
                targetTable: r.target_table,
                columnPairs: [],
                updateRule: r.update_rule,
                deleteRule: r.delete_rule,
                isDeferrable: false,
                initiallyDeferred: false
              }
            }
            grouped[name].columnPairs.push({ position: r.position, sourceColumn: r.source_column, targetColumn: r.target_column })
          }

          result.push({
            ...t,
            primaryKey,
            foreignKeys: Object.values(grouped)
          })
        }
        return result
      })

      update.schema_json = { tables: enrichedTables }
    } else {
      update.schema_json = selected
    }
  }

  // Allow renaming via simpler key too
  if (body?.internal_name && typeof body.internal_name === 'string') {
    update.internal_name = body.internal_name
  }

  // Optional: update other connection fields if provided (edit flow)
  const mapString = (v: any) => (typeof v === 'string' ? v : (v != null ? String(v) : undefined))
  const mapNumber = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : undefined)
  const mapBool = (v: any) => (typeof v === 'boolean' ? v : (v != null ? !!v : undefined))

  const fieldMap: Record<string, any> = {
    internal_name: mapString(body?.internal_name),
    database_name: mapString(body?.database_name),
    database_type: mapString(body?.database_type),
    host: mapString(body?.host),
    username: mapString(body?.username),
    password: mapString(body?.password),
    port: mapNumber(body?.port),
    jdbc_params: mapString(body?.jdbc_params),
    server_time: mapString(body?.server_time),
    use_ssh_tunneling: mapBool(body?.use_ssh_tunneling),
    ssh_auth_method: mapString(body?.ssh_auth_method),
    ssh_port: mapNumber(body?.ssh_port),
    ssh_user: mapString(body?.ssh_user),
    ssh_host: mapString(body?.ssh_host),
    ssh_password: mapString(body?.ssh_password),
    ssh_private_key: mapString(body?.ssh_private_key),
    storage_location: mapString(body?.storage_location)
  }
  for (const [k, v] of Object.entries(fieldMap)) {
    if (v !== undefined) update[k] = v
  }

  if (Object.keys(update).length === 0) {
    return { success: true }
  }

  const { error } = await supabaseAdmin
    .from('data_connections')
    .update(update)
    .eq('id', connectionId)
    .eq('owner_id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})


