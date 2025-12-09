import {defineEventHandler, readBody} from 'h3'
import {loadConnectionConfigFromSupabase} from '../../utils/connectionConfig'
import {findJoinPaths} from '../../utils/autoJoinAlgorithm'
import {AuthHelper} from '../../utils/authHelper'

export default defineEventHandler(async (event) => {
  const { connectionId, tableNames } = await readBody(event) as {
    connectionId: number
    tableNames: string[]
  }

  console.log(`[AUTO_JOIN_API] Auto-join request for connection ${connectionId} with tables:`, tableNames)

  if (!connectionId || !Array.isArray(tableNames) || tableNames.length === 0) {
    console.error(`[AUTO_JOIN_API] Invalid request - missing connectionId or tableNames:`, { connectionId, tableNames })
    throw createError({ statusCode: 400, statusMessage: 'Invalid request: connectionId and tableNames are required' })
  }

    // Require org-aligned access to the data connection
    await AuthHelper.requireConnectionAccess(event, connectionId)

  const cfg = await loadConnectionConfigFromSupabase(event, connectionId)

  // Get the schema for join analysis
  const schemaResult = await getSchemaForJoinAnalysis(cfg, tableNames)

  if (!schemaResult.tables.length) {
    throw createError({ statusCode: 404, statusMessage: 'No schema information found for the specified tables' })
  }

  // Find join paths using our algorithm
  console.log(`[AUTO_JOIN_API] Running auto-join algorithm with ${schemaResult.tables.length} available tables`)
  const joinResult = findJoinPaths(schemaResult.tables, tableNames)

  console.log(`[AUTO_JOIN_API] Auto-join result for connection ${connectionId}:`, {
    status: joinResult.status,
    message: joinResult.message,
    joinGraphLength: joinResult.joinGraph.length,
    sqlLength: joinResult.sql.length,
    hasDetails: !!joinResult.details
  })

  if (joinResult.status === 'disconnected') {
    console.error(`[AUTO_JOIN_API] Auto-join failed - tables are disconnected:`, joinResult.message)
  } else if (joinResult.status === 'ok') {
    console.log(`[AUTO_JOIN_API] Auto-join successful - generated SQL:`, joinResult.sql)
  }

  return {
    status: joinResult.status,
    joinGraph: joinResult.joinGraph,
    sql: joinResult.sql,
    message: joinResult.message,
    details: joinResult.details
  }
})

async function getSchemaForJoinAnalysis(cfg: any, tableNames: string[]) {
  console.log(`[AUTO_JOIN_API] Loading schema for join analysis with tables:`, tableNames)

  // We'll need to import the withMySqlConnectionConfig function
  const { withMySqlConnectionConfig } = await import('../../utils/mysqlClient')

  return await withMySqlConnectionConfig(cfg, async (conn) => {
    // Get tables and their relationships
    const tableNamesList = tableNames.map(name => `'${name}'`).join(',')

    console.log(`[AUTO_JOIN_API] Querying database for tables: ${tableNamesList}`)

    // Get all tables that might be involved in joins
    const [tablesResult] = await conn.query(`
      SELECT DISTINCT table_name as id, table_name as name, table_name as label
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
        AND table_name IN (${tableNamesList})
      ORDER BY table_name
    `)

    const tables = tablesResult as Array<{ id: string; name: string; label: string }>

    console.log(`[AUTO_JOIN_API] Found ${tables.length} tables in database:`, tables.map(t => t.name))

    if (!tables.length) {
      console.error(`[AUTO_JOIN_API] No tables found in database for: ${tableNamesList}`)
      return { tables: [], relationships: [] }
    }

    // Get all columns for relevant tables
    const [columnsResult] = await conn.query(`
      SELECT
        table_name as table_id,
        column_name as field_id,
        column_name as name,
        column_name as label,
        data_type as type
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name IN (${tableNamesList})
      ORDER BY table_name, ordinal_position
    `)

    // Group columns by table
    const columnsByTable: Record<string, any[]> = {}
    for (const col of columnsResult as any[]) {
      if (!columnsByTable[col.table_id]) {
        columnsByTable[col.table_id] = []
      }
      columnsByTable[col.table_id].push({
        fieldId: col.field_id,
        name: col.name,
        label: col.label,
        type: col.type
      })
    }

    // Get primary keys
    const [pkResult] = await conn.query(`
      SELECT
        kcu.table_name,
        GROUP_CONCAT(kcu.column_name ORDER BY kcu.ordinal_position) as primary_key_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
       AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = DATABASE()
        AND tc.table_name IN (${tableNamesList})
        AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY kcu.table_name
    `)

    const primaryKeys: Record<string, string[]> = {}
    for (const pk of pkResult as any[]) {
      primaryKeys[pk.table_name] = pk.primary_key_columns ? pk.primary_key_columns.split(',') : []
    }

    // Get foreign keys for all relevant tables (including related tables that aren't in the selection)
    const [fkResult] = await conn.query(`
      SELECT
        rc.constraint_name,
        kcu.table_name as source_table,
        kcu.referenced_table_name as target_table,
        GROUP_CONCAT(
          JSON_OBJECT(
            'position', kcu.ordinal_position,
            'sourceColumn', kcu.column_name,
            'targetColumn', kcu.referenced_column_name
          ) ORDER BY kcu.ordinal_position
        ) as column_pairs,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
       AND rc.constraint_schema = kcu.constraint_schema
      WHERE kcu.table_schema = DATABASE()
        AND (kcu.table_name IN (${tableNamesList}) OR kcu.referenced_table_name IN (${tableNamesList}))
      GROUP BY rc.constraint_name, kcu.table_name, kcu.referenced_column_name, rc.update_rule, rc.delete_rule
    `)

    // Group FKs by table
    const foreignKeysByTable: Record<string, any[]> = {}
    for (const fk of fkResult as any[]) {
      if (!foreignKeysByTable[fk.source_table]) {
        foreignKeysByTable[fk.source_table] = []
      }

      const columnPairs = JSON.parse(`[${fk.column_pairs}]`).map((pair: any) => ({
        position: pair.position,
        sourceColumn: pair.sourceColumn,
        targetColumn: pair.targetColumn
      }))

      foreignKeysByTable[fk.source_table].push({
        constraintName: fk.constraint_name,
        sourceTable: fk.source_table,
        targetTable: fk.target_table,
        columnPairs,
        updateRule: fk.update_rule,
        deleteRule: fk.delete_rule
      })
    }

    // Combine everything
    const enrichedTables = tables.map(table => ({
      tableId: table.id,
      tableName: table.name,
      columns: columnsByTable[table.id] || [],
      primaryKey: primaryKeys[table.id] || [],
      foreignKeys: foreignKeysByTable[table.id] || []
    }))

    const result = {
      tables: enrichedTables,
      relationships: Object.values(foreignKeysByTable).flat()
    }

    console.log(`[AUTO_JOIN_API] Schema analysis complete:`, {
      tableCount: result.tables.length,
      tables: result.tables.map(t => ({
        name: t.tableName,
        columnCount: t.columns.length,
        primaryKeyCount: t.primaryKey.length,
        foreignKeyCount: t.foreignKeys.length
      })),
      totalRelationships: result.relationships.length
    })

    return result
  })
}
