import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { findJoinPaths } from '../../utils/autoJoinAlgorithm'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { connectionId, tableNames } = await readBody(event) as {
    connectionId: number
    tableNames: string[]
  }

  if (!connectionId || !Array.isArray(tableNames) || tableNames.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request: connectionId and tableNames are required' })
  }

  // Verify user owns the data connection
  const { data: connectionData, error: connError } = await supabaseAdmin
    .from('data_connections')
    .select('owner_id')
    .eq('id', connectionId)
    .single()

  if (connError || !connectionData || connectionData.owner_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied to connection' })
  }

  const cfg = await loadConnectionConfigFromSupabase(event, connectionId)

  // Get the schema for join analysis
  const schemaResult = await getSchemaForJoinAnalysis(cfg, tableNames)

  if (!schemaResult.tables.length) {
    throw createError({ statusCode: 404, statusMessage: 'No schema information found for the specified tables' })
  }

  // Find join paths using our algorithm
  const joinResult = findJoinPaths(schemaResult.tables, tableNames)

  return {
    status: joinResult.status,
    joinGraph: joinResult.joinGraph,
    sql: joinResult.sql,
    message: joinResult.message,
    details: joinResult.details
  }
})

async function getSchemaForJoinAnalysis(cfg: any, tableNames: string[]) {
  // We'll need to import the withMySqlConnectionConfig function
  const { withMySqlConnectionConfig } = await import('../../utils/mysqlClient')

  return await withMySqlConnectionConfig(cfg, async (conn) => {
    // Get tables and their relationships
    const tableNamesList = tableNames.map(name => `'${name}'`).join(',')

    // Get all tables that might be involved in joins
    const [tablesResult] = await conn.query(`
      SELECT DISTINCT table_name as id, table_name as name, table_name as label
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
        AND table_name IN (${tableNamesList})
      ORDER BY table_name
    `)

    const tables = tablesResult as Array<{ id: string; name: string; label: string }>

    if (!tables.length) {
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

    return {
      tables: enrichedTables,
      relationships: Object.values(foreignKeysByTable).flat()
    }
  })
}
