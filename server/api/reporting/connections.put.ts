import { defineEventHandler, getQuery, readBody } from 'h3'

import { supabaseAdmin } from '../supabase'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { buildGraph } from '../../utils/schemaGraph'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo } from '../../utils/internalStorageQuery'
import { getTableRelationships } from '../../utils/optiqoflowQuery'

// Update fields on an existing connection. Supports updating schema_json.
export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as any
  const body = await readBody<any>(event)
  const connectionId = Number(id || body?.id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
    requireWrite: true,
    columns: 'id, organization_id, database_type, is_immutable'
  })

  // Check if connection is immutable (auto-created tenant connections)
  const isImmutable = (connection as any)?.is_immutable === true
  if (isImmutable) {
    throw createError({ statusCode: 403, statusMessage: 'This connection is immutable and cannot be modified' })
  }

  // Only SUPERADMIN can edit internal data sources
  const isInternalDataSource = (connection as any)?.database_type === 'internal'
  if (isInternalDataSource) {
    const ctx = await AuthHelper.requireAuthContext(event)
    if (ctx.role !== 'SUPERADMIN') {
      throw createError({ statusCode: 403, statusMessage: 'Only Superadmin can edit internal data sources' })
    }
  }

  const update: any = {}
  console.log(`[AUTO_JOIN] PUT request for connection ${connectionId} with body keys: `, Object.keys(body || {}))

  if (body?.schema && typeof body.schema === 'object') {
    console.log(`[AUTO_JOIN] Schema update requested for connection ${connectionId}`)
    // Enrich provided schema with PK/FK info from the source DB
    const selected = body.schema || {}
    const tables = Array.isArray(selected.tables) ? selected.tables : []
    console.log(`[AUTO_JOIN] Processing ${tables.length} tables for schema enrichment`)

    if (tables.length) {
      // Check if this is an internal connection (PostgreSQL) - skip MySQL enrichment
      // Two cases: internal data source (database_type='internal') OR internal storage (storage_location='internal')
      const isInternalDataSource = (connection as any)?.database_type === 'internal'
      const storageInfo = await loadInternalStorageInfo(connectionId)
      const useInternalPath = isInternalDataSource || storageInfo.useInternalStorage

      if (useInternalPath) {
        // For internal connections, skip MySQL-specific enrichment
        console.log(`[AUTO_JOIN] Internal connection detected (dataSource=${isInternalDataSource}, storage=${storageInfo.useInternalStorage}), skipping MySQL enrichment for connection ${connectionId}`)

        // For internal data sources, fetch FKs from table_relationships and merge
        let fksByTable: Record<string, any[]> = {}
        if (isInternalDataSource) {
          try {
            const tableRelationships = await getTableRelationships()
            console.log(`[AUTO_JOIN] Fetched ${tableRelationships.length} FK relationships from table_relationships`)

            for (const rel of tableRelationships) {
              if (!fksByTable[rel.sourceTable]) {
                fksByTable[rel.sourceTable] = []
              }
              fksByTable[rel.sourceTable].push({
                constraintName: `tr_${rel.sourceTable}_${rel.sourceColumn}`,
                sourceTable: rel.sourceTable,
                targetTable: rel.targetTable,
                columnPairs: [{
                  position: 1,
                  sourceColumn: rel.sourceColumn,
                  targetColumn: rel.targetColumn
                }]
              })
            }
          } catch (fkError: any) {
            console.error(`[AUTO_JOIN] Failed to fetch FKs from table_relationships: ${fkError?.message}`)
          }
        }

        const basicTables = tables.map((t: any) => {
          const tableId = String(t.tableId)
          // Merge FKs from table_relationships for internal data sources
          const tableFks = isInternalDataSource ? (fksByTable[tableId] || []) : (t.foreignKeys || [])

          return {
            tableId,
            tableName: String(t.tableName || tableId),
            columns: (t.columns || []).map((col: any) => ({
              fieldId: col.fieldId || col.name,
              name: col.name || col.fieldId,
              label: col.label || col.name || col.fieldId,
              type: col.type || 'unknown'
            })),
            primaryKey: t.primaryKey || [],
            foreignKeys: tableFks
          }
        })

        // Count FKs for logging
        const totalFks = basicTables.reduce((sum, t) => sum + t.foreignKeys.length, 0)
        console.log(`[AUTO_JOIN] Saving schema with ${basicTables.length} tables and ${totalFks} FKs`)

        update.schema_json = { tables: basicTables }

        // Build graph for internal storage too
        try {
          const schemaJson = { schema: { tables: basicTables } }
          const graph = buildGraph(schemaJson)
          console.log(`[AUTO_JOIN] Built graph with ${graph.nodes.size} nodes for internal connection`)

          update.auto_join_info = {
            graph: {
              nodes: Array.from(graph.nodes.entries()),
              adj: Array.from(graph.adj.entries())
            }
          }
        } catch (error: any) {
          console.error(`[AUTO_JOIN] Failed to build graph for internal connection ${connectionId}: `, error?.message)
        }
      } else {
        // MySQL enrichment logic (existing code)
        const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
        // Get DBMS version first
        const dbmsVersion = await withMySqlConnectionConfig(cfg, async (conn) => {
          const [[versionRow]] = await conn.query('SELECT VERSION() as version') as any
          return versionRow?.version || null
        })
        if (dbmsVersion) {
          update.dbms_version = dbmsVersion
          console.log(`[AUTO_JOIN] Retrieved DBMS version: ${dbmsVersion}`)
        }

        const enrichedTables = await withMySqlConnectionConfig(cfg, async (conn) => {
          const result: any[] = []

          // 1. Collect all table IDs (used to filter FKs to external tables)
          const tableIds = tables.map((t: any) => String(t.tableId))
          const tableIdSet = new Set(tableIds)
          if (tableIds.length === 0) return []

          // 2. Fetch ALL Primary Keys in one go
          console.log(`[AUTO_JOIN] Fetching PKs for ${tableIds.length} tables`)
          const [allPkConstraintRows] = await conn.query(
            `select tc.table_name, kcu.column_name, kcu.ordinal_position
               from information_schema.table_constraints tc
                        join information_schema.key_column_usage kcu
                             on tc.constraint_name = kcu.constraint_name
                                 and tc.table_schema = kcu.table_schema
                                 and tc.table_name = kcu.table_name
               where tc.table_schema = database()
                 and tc.table_name in (?)
                 and tc.constraint_type = 'PRIMARY KEY'
               order by tc.table_name, kcu.ordinal_position`,
            [tableIds]
          ) as any

          // Fallback: Fetch ALL Primary Indices in one go
          // (Only needed for tables that didn't have a PK in the previous query, but fetching all is simpler/safer)
          const [allPrimaryIndexRows] = await conn.query(
            `select table_name, column_name, seq_in_index
           from information_schema.statistics
           where table_schema = database()
             and table_name in (?)
             and index_name = 'PRIMARY'
             and non_unique = 0
           order by table_name, seq_in_index`,
            [tableIds]
          ) as any

          // 3. Fetch ALL Unique Constraints in one go
          console.log(`[AUTO_JOIN] Fetching Unique Constraints for ${tableIds.length} tables`)
          const [allUniqueConstraintRows] = await conn.query(
            `select tc.table_name, tc.constraint_name, kcu.column_name
           from information_schema.table_constraints tc
           join information_schema.key_column_usage kcu
             on tc.constraint_name = kcu.constraint_name
            and tc.table_schema = kcu.table_schema
            and tc.table_name = kcu.table_name
           where tc.table_schema = database()
             and tc.table_name in (?)
             and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
           order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
            [tableIds]
          ) as any

          // 4. Fetch ALL Foreign Keys involving these tables (as source OR target)
          // Note: For large schemas, 'kcu.referenced_table_name in (?)' might be slow if index is missing,
          // but typically information_schema is optimized enough or small enough.
          console.log(`[AUTO_JOIN] Fetching Foreign Keys for ${tableIds.length} tables`)
          const [allFkRows] = await conn.query(
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
             and (kcu.table_name in (?) or kcu.referenced_table_name in (?))
           order by rc.constraint_name, kcu.ordinal_position`,
            [tableIds, tableIds]
          ) as any


          // --- Processing Results In-Memory ---

          // Map: TableName -> PK Columns
          const pkMap: Record<string, string[]> = {}

          // Process constraint-based PKs
          for (const row of allPkConstraintRows as any[]) {
            // MySQL table names are case-sensitive on Linux but not Windows.
            // Information schema usually preserves case.
            // We assume tableIds match the DB case as they came from schema listing.
            if (!pkMap[row.table_name]) pkMap[row.table_name] = []
            pkMap[row.table_name].push(row.column_name)
          }

          // Process index-based PKs (fallback if no constraint PK)
          for (const row of allPrimaryIndexRows as any[]) {
            if (!pkMap[row.table_name] || pkMap[row.table_name].length === 0) {
              if (!pkMap[row.table_name]) pkMap[row.table_name] = []
              pkMap[row.table_name].push(row.column_name)
            }
          }

          // Map: TableName -> ConstraintName -> Columns
          const uniqueConstraintsMap: Record<string, Record<string, string[]>> = {}
          for (const row of allUniqueConstraintRows as any[]) {
            if (!uniqueConstraintsMap[row.table_name]) uniqueConstraintsMap[row.table_name] = {}
            if (!uniqueConstraintsMap[row.table_name][row.constraint_name]) uniqueConstraintsMap[row.table_name][row.constraint_name] = []
            uniqueConstraintsMap[row.table_name][row.constraint_name].push(row.column_name)
          }

          // Map: ConstraintName -> FK Definition
          // We need to process all FK rows to build the full FK objects
          const fkDefinitions: Record<string, any> = {}

          for (const r of allFkRows as any[]) {
            const name = r.constraint_name
            if (!fkDefinitions[name]) {
              fkDefinitions[name] = {
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
            fkDefinitions[name].columnPairs.push({
              position: r.position,
              sourceColumn: r.source_column,
              targetColumn: r.target_column
            })
          }

          // Now assign FKs to their source tables
          // Map: TableName -> List of FKs (where table is source)
          const tableFkMap: Record<string, any[]> = {}

          // Pre-calculate target tables we might need to fetch unique constraints for if they weren't in our initial set
          const allTargetTables = new Set<string>()
          for (const fk of Object.values(fkDefinitions)) {
            allTargetTables.add(fk.targetTable)
          }
          // Identify missing targets
          const missingTargets = Array.from(allTargetTables).filter(t => !uniqueConstraintsMap[t])

          if (missingTargets.length > 0) {
            console.log(`[AUTO_JOIN] Fetching Unique Constraints for ${missingTargets.length} external target tables`)
            const [extraUniqueConstraintRows] = await conn.query(
              `select tc.table_name, tc.constraint_name, kcu.column_name
               from information_schema.table_constraints tc
               join information_schema.key_column_usage kcu
                 on tc.constraint_name = kcu.constraint_name
                and tc.table_schema = kcu.table_schema
                and tc.table_name = kcu.table_name
               where tc.table_schema = database()
                 and tc.table_name in (?)
                 and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
               order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
              [missingTargets]
            ) as any

            for (const row of extraUniqueConstraintRows as any[]) {
              if (!uniqueConstraintsMap[row.table_name]) uniqueConstraintsMap[row.table_name] = {}
              if (!uniqueConstraintsMap[row.table_name][row.constraint_name]) uniqueConstraintsMap[row.table_name][row.constraint_name] = []
              uniqueConstraintsMap[row.table_name][row.constraint_name].push(row.column_name)
            }
          }


          // Distribute FKs to their source tables and Calculate Cardinality
          // Filter out FKs where both source AND target are in selected tables
          for (const fk of Object.values(fkDefinitions)) {
            // We only care about this FK for the result if BOTH tables are in our selected schema
            // FKs to external tables (not selected or invisible due to permissions) are filtered out
            // Note: FK definitions use camelCase (sourceTable, targetTable)
            if (!tableIdSet.has(fk.sourceTable) || !tableIdSet.has(fk.targetTable)) {
              continue;
            }

            if (!tableFkMap[fk.sourceTable]) tableFkMap[fk.sourceTable] = []

            // Calculate Cardinality
            // Source Unique?
            const sourceColumns = fk.columnPairs.map((cp: any) => cp.sourceColumn)
            const sourceConstraints = uniqueConstraintsMap[fk.sourceTable] || {}
            const sourceIsUnique = sourceColumns.every((col: string) =>
              Object.values(sourceConstraints).some(constraintCols => constraintCols.includes(col))
            )

            // Target Unique?
            const targetColumns = fk.columnPairs.map((cp: any) => cp.targetColumn)
            const targetConstraints = uniqueConstraintsMap[fk.targetTable] || {}
            const targetIsUnique = targetColumns.every((col: string) =>
              Object.values(targetConstraints).some(constraintCols => constraintCols.includes(col))
            )

            if (sourceIsUnique && targetIsUnique) {
              fk.cardinality = '1:1'
            } else {
              fk.cardinality = '1:N'
            }

            // Mark as isForeignKey = true for the output format
            fk.isForeignKey = true

            tableFkMap[fk.sourceTable].push(fk)
          }


          // 5. Construct Final Result
          for (const t of tables) {
            const tableId = String(t.tableId)
            // Table name fallback - use tableId as it's the actual table name from the database
            const tableName = String(t.tableName || tableId)

            // Transform columns
            const transformedColumns = (t.columns || []).map((col: any) => ({
              fieldId: col.fieldId || col.name,
              name: col.name || col.fieldId,
              label: col.label || col.name || col.fieldId,
              type: col.type || 'unknown'
            }))

            // Note: FKs are stored using fk.source_table (the database table name) as key
            // Both tableId and tableName should be the database table name, but check both
            const fksForTable = tableFkMap[tableId] || tableFkMap[tableName] || []

            result.push({
              tableId: tableId,
              tableName: tableName,
              columns: transformedColumns,
              primaryKey: pkMap[tableId] || pkMap[tableName] || [],
              foreignKeys: fksForTable
            })
          }

          return result
        })

        update.schema_json = { tables: enrichedTables }

        // Compute and store auto-join graph (paths computed on-demand at query time)
        console.log(`[AUTO_JOIN] Building graph for connection ${connectionId} with ${enrichedTables.length} tables`)

        try {
          const schemaJson = { schema: { tables: enrichedTables } }
          const graph = buildGraph(schemaJson)
          console.log(`[AUTO_JOIN] Built graph with ${graph.nodes.size} nodes and ${graph.adj.size} adjacency entries`)

          // Only store the graph - pathsIndex and exitPayloads are computed on-demand
          // This makes schema save O(E) instead of O(N²) where N = table count
          update.auto_join_info = {
            graph: {
              nodes: Array.from(graph.nodes.entries()),
              adj: Array.from(graph.adj.entries())
            }
          }
          console.log(`[AUTO_JOIN] Successfully saved graph for connection ${connectionId}`)
        } catch (error: any) {
          console.error(`[AUTO_JOIN] Failed to build graph for connection ${connectionId}: `, {
            error: error.message,
            stack: error.stack,
            tableCount: enrichedTables.length,
            tables: enrichedTables.map((t: any) => t.tableName)
          })
          // Don't fail the update if graph building fails
        }
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
  // Skip masked credential values to avoid overwriting real passwords with the mask
  const MASKED_VALUE = '********'
  const mapString = (v: any) => (typeof v === 'string' ? v : (v != null ? String(v) : undefined))
  const mapCredential = (v: any) => {
    const mapped = mapString(v)
    // Skip if the value is the masked placeholder - don't overwrite real credentials
    return mapped === MASKED_VALUE ? undefined : mapped
  }
  const mapNumber = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : undefined)
  const mapBool = (v: any) => (typeof v === 'boolean' ? v : (v != null ? !!v : undefined))

  const fieldMap: Record<string, any> = {
    internal_name: mapString(body?.internal_name),
    database_name: mapString(body?.database_name),
    database_type: mapString(body?.database_type),
    host: mapString(body?.host),
    username: mapString(body?.username),
    password: mapCredential(body?.password),
    port: mapNumber(body?.port),
    jdbc_params: mapString(body?.jdbc_params),
    server_time: mapString(body?.server_time),
    use_ssh_tunneling: mapBool(body?.use_ssh_tunneling),
    ssh_auth_method: mapString(body?.ssh_auth_method),
    ssh_port: mapNumber(body?.ssh_port),
    ssh_user: mapString(body?.ssh_user),
    ssh_host: mapString(body?.ssh_host),
    ssh_password: mapCredential(body?.ssh_password),
    ssh_private_key: mapCredential(body?.ssh_private_key),
    storage_location: mapString(body?.storage_location)
  }
  for (const [k, v] of Object.entries(fieldMap)) {
    if (v !== undefined) update[k] = v
  }


  if (Object.keys(update).length === 0) {
    console.log(`[AUTO_JOIN] No updates needed for connection ${connectionId}`)
    return { success: true }
  }

  console.log(`[AUTO_JOIN] Updating connection ${connectionId} with fields: `, Object.keys(update))
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

  const { error } = await updateQuery

  if (error) {
    console.error(`[AUTO_JOIN] Failed to update connection ${connectionId}: `, error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  console.log(`[AUTO_JOIN] Successfully updated connection ${connectionId} `)
  return { success: true }
})
