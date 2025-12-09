import {defineEventHandler, getQuery, readBody} from 'h3'
import {supabaseAdmin} from '../supabase'
import {withMySqlConnectionConfig} from '../../utils/mysqlClient'
import {loadConnectionConfigFromSupabase} from '../../utils/connectionConfig'
import {buildExitPayloads, buildGraph, computePathsIndex} from '../../utils/schemaGraph'
import {AuthHelper} from '../../utils/authHelper'

// Update fields on an existing connection. Supports updating schema_json.
export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as any
  const body = await readBody<any>(event)
  const connectionId = Number(id || body?.id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
        requireWrite: true,
        columns: 'id, organization_id'
    })

  const update: any = {}
  console.log(`[AUTO_JOIN] PUT request for connection ${connectionId} with body keys:`, Object.keys(body || {}))

  if (body?.schema && typeof body.schema === 'object') {
    console.log(`[AUTO_JOIN] Schema update requested for connection ${connectionId}`)
    // Enrich provided schema with PK/FK info from the source DB
    const selected = body.schema || {}
    const tables = Array.isArray(selected.tables) ? selected.tables : []
    console.log(`[AUTO_JOIN] Processing ${tables.length} tables for schema enrichment`)

    if (tables.length) {
      const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
      const enrichedTables = await withMySqlConnectionConfig(cfg, async (conn) => {
        const result: any[] = []
        for (const t of tables) {
          const tableId = String(t.tableId)
          // Fetch primary key columns from constraints first
          const [pkConstraintRows] = await conn.query(
            `select kcu.column_name, kcu.ordinal_position
             from information_schema.table_constraints tc
             join information_schema.key_column_usage kcu
               on tc.constraint_name = kcu.constraint_name
              and tc.table_schema = kcu.table_schema
              and tc.table_name = kcu.table_name
            where tc.table_schema = database()
              and tc.table_name = ?
              and tc.constraint_type = 'PRIMARY KEY'
            order by kcu.ordinal_position`,
            [tableId]
          ) as any

          // If no PK constraint found, check for PRIMARY index (unique index named PRIMARY)
          let primaryKey: string[] = []
          if (pkConstraintRows.length > 0) {
            primaryKey = (pkConstraintRows as any[]).map(r => r.column_name)
          } else {
            const [primaryIndexRows] = await conn.query(
              `select column_name, seq_in_index
               from information_schema.statistics
               where table_schema = database()
                 and table_name = ?
                 and index_name = 'PRIMARY'
                 and non_unique = 0
               order by seq_in_index`,
              [tableId]
            ) as any
            primaryKey = (primaryIndexRows as any[]).map(r => r.column_name)
          }

          // Get all unique constraints for the table (including primary key)
          const [uniqueConstraintRows] = await conn.query(
            `select tc.constraint_name, kcu.column_name
             from information_schema.table_constraints tc
             join information_schema.key_column_usage kcu
               on tc.constraint_name = kcu.constraint_name
              and tc.table_schema = kcu.table_schema
              and tc.table_name = kcu.table_name
            where tc.table_schema = database()
              and tc.table_name = ?
              and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
            order by tc.constraint_name, kcu.ordinal_position`,
            [tableId]
          ) as any

          // Group unique constraints by name
          const uniqueConstraints: Record<string, string[]> = {}
          for (const row of uniqueConstraintRows) {
            if (!uniqueConstraints[row.constraint_name]) {
              uniqueConstraints[row.constraint_name] = []
            }
            uniqueConstraints[row.constraint_name].push(row.column_name)
          }

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

          // Get unique constraints for target tables
          const targetTables = [...new Set(fkRows.map((r: any) => r.target_table))]
          const targetUniqueConstraints: Record<string, Record<string, string[]>> = {}

          for (const targetTable of targetTables) {
            if (targetTable !== tableId) {
              const [targetUniqueRows] = await conn.query(
                `select tc.constraint_name, kcu.column_name
                 from information_schema.table_constraints tc
                 join information_schema.key_column_usage kcu
                   on tc.constraint_name = kcu.constraint_name
                  and tc.table_schema = kcu.table_schema
                  and tc.table_name = kcu.table_name
                where tc.table_schema = database()
                  and tc.table_name = ?
                  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
                order by tc.constraint_name, kcu.ordinal_position`,
                [targetTable]
              ) as any

              targetUniqueConstraints[targetTable] = {}
              for (const row of targetUniqueRows) {
                if (!targetUniqueConstraints[targetTable][row.constraint_name]) {
                  targetUniqueConstraints[targetTable][row.constraint_name] = []
                }
                targetUniqueConstraints[targetTable][row.constraint_name].push(row.column_name)
              }
            }
          }

          // Group foreign keys by constraint and determine direction
          const grouped: Record<string, any> = {}
          for (const r of fkRows as any[]) {
            const name = r.constraint_name
            if (!grouped[name]) {
              // If current table is the source, it's a foreign key (child -> parent)
              // If current table is the target, it's a reverse reference (parent <- child)
              const isForeignKey = r.source_table === tableId

              grouped[name] = {
                constraintName: r.constraint_name,
                sourceTable: r.source_table,
                targetTable: r.target_table,
                columnPairs: [],
                updateRule: r.update_rule,
                deleteRule: r.delete_rule,
                isDeferrable: false,
                initiallyDeferred: false,
                isForeignKey: isForeignKey
              }
            }
            grouped[name].columnPairs.push({ position: r.position, sourceColumn: r.source_column, targetColumn: r.target_column })
          }

          // Add cardinality determination for each foreign key
          for (const fk of Object.values(grouped)) {
            if (fk.isForeignKey) {
              // Check if source columns are unique (part of unique constraint)
              const sourceColumns = fk.columnPairs.map((cp: any) => cp.sourceColumn)
              const sourceIsUnique = sourceColumns.every(col =>
                Object.values(uniqueConstraints).some(constraintCols => constraintCols.includes(col))
              )

              // Check if target columns are unique (part of unique constraint)
              const targetColumns = fk.columnPairs.map((cp: any) => cp.targetColumn)
              const targetTableConstraints = targetUniqueConstraints[fk.targetTable] || {}
              const targetIsUnique = targetColumns.every(col =>
                Object.values(targetTableConstraints).some(constraintCols => constraintCols.includes(col))
              )

              // Determine cardinality
              if (sourceIsUnique && targetIsUnique) {
                fk.cardinality = '1:1'
              } else {
                fk.cardinality = '1:N'
              }
            }
          }

          // Only include actual foreign keys (where current table is the source)
          const foreignKeys = Object.values(grouped).filter((fk: any) => fk.isForeignKey)

          // Transform columns to match TableInfo interface if needed
          const transformedColumns = (t.columns || []).map((col: any) => ({
            fieldId: col.fieldId || col.name,
            name: col.name || col.fieldId,
            label: col.label || col.name || col.fieldId,
            type: col.type || 'unknown'
          }))

          result.push({
            tableId: String(t.tableId),
            tableName: String(t.tableName || t.tableId), // Use tableName if available, otherwise fallback to tableId
            columns: transformedColumns,
            primaryKey,
            foreignKeys: foreignKeys
          })
        }
        return result
      })

      update.schema_json = { tables: enrichedTables }

      // Compute and store auto-join information
      console.log(`[AUTO_JOIN] Starting auto-join computation for connection ${connectionId} with ${enrichedTables.length} tables`)
      console.log(`[AUTO_JOIN] Enriched tables structure:`, enrichedTables.map(t => ({
        tableId: t.tableId,
        tableName: t.tableName,
        columnCount: t.columns?.length || 0,
        columns: t.columns?.map((c: any) => ({ fieldId: c.fieldId, name: c.name, type: c.type })) || [],
        primaryKeyCount: t.primaryKey?.length || 0,
        foreignKeyCount: t.foreignKeys?.length || 0
      })))

      try {
        const schemaJson = { schema: { tables: enrichedTables } }
        console.log(`[AUTO_JOIN] Built schema JSON with tables:`, enrichedTables.map(t => t.tableName))

        const graph = buildGraph(schemaJson)
        console.log(`[AUTO_JOIN] Built graph with ${graph.nodes.size} nodes and ${graph.adj.size} edges`)

        const pathsIndex = computePathsIndex(graph)
        console.log(`[AUTO_JOIN] Computed paths index with ${Object.keys(pathsIndex).length} path entries`)

        const exitPayloads = buildExitPayloads(graph, pathsIndex)
        console.log(`[AUTO_JOIN] Built exit payloads with ${Object.keys(exitPayloads).length} exit entries`)

        update.auto_join_info = {
          pathsIndex,
          exitPayloads,
          graph: {
            nodes: Array.from(graph.nodes.entries()),
            adj: Array.from(graph.adj.entries())
          }
        }
        console.log(`[AUTO_JOIN] Successfully computed and saved auto_join_info for connection ${connectionId}`)
      } catch (error) {
        console.error(`[AUTO_JOIN] Failed to compute auto-join info for connection ${connectionId}:`, {
          error: error.message,
          stack: error.stack,
          tableCount: enrichedTables.length,
          tables: enrichedTables.map(t => t.tableName)
        })
        // Don't fail the update if auto-join computation fails
      }
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
    console.log(`[AUTO_JOIN] No updates needed for connection ${connectionId}`)
    return { success: true }
  }

  console.log(`[AUTO_JOIN] Updating connection ${connectionId} with fields:`, Object.keys(update))
  if (update.auto_join_info) {
    console.log(`[AUTO_JOIN] Including auto_join_info in update for connection ${connectionId}`)
  }
  if (update.schema_json) {
    console.log(`[AUTO_JOIN] Including schema_json in update for connection ${connectionId}`)
  }

    let updateQuery = supabaseAdmin
    .from('data_connections')
    .update(update)
    .eq('id', connectionId)

    if (connection.organization_id) {
        updateQuery = updateQuery.eq('organization_id', connection.organization_id)
    }

    const {error} = await updateQuery

  if (error) {
    console.error(`[AUTO_JOIN] Failed to update connection ${connectionId}:`, error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  console.log(`[AUTO_JOIN] Successfully updated connection ${connectionId}`)
  return { success: true }
})


