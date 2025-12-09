import {defineEventHandler, getQuery} from 'h3'
import {withMySqlConnectionConfig} from '../../utils/mysqlClient'
import {loadConnectionConfigFromSupabase} from '../../utils/connectionConfig'
import {AuthHelper} from '../../utils/authHelper'

export default defineEventHandler(async (event) => {
  const { connectionId } = getQuery(event) as any
  if (!connectionId) return { tables: [], relationships: [] }

  const connId = Number(connectionId)
    await AuthHelper.requireConnectionAccess(event, connId)

  const cfg = await loadConnectionConfigFromSupabase(event, connId)

  return await withMySqlConnectionConfig(cfg, async (conn) => {
    // Get all tables
    const [tablesResult] = await conn.query(`
      SELECT table_name as id, table_name as name, table_name as label
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tables = tablesResult as Array<{ id: string; name: string; label: string }>

    if (!tables.length) {
      return { tables: [], relationships: [] }
    }

    // Get all columns for all tables in one query
    const tableNames = tables.map(t => `'${t.id}'`).join(',')
    const [columnsResult] = await conn.query(`
      SELECT
        table_name as table_id,
        column_name as field_id,
        column_name as name,
        column_name as label,
        data_type as type,
        CASE
          WHEN data_type IN ('int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'double', 'float') THEN 1
          WHEN data_type IN ('date', 'datetime', 'timestamp') THEN 1
          WHEN data_type IN ('char', 'text', 'varchar') THEN 1
          WHEN data_type IN ('tinyint(1)', 'boolean', 'bool') THEN 1
          ELSE 0
        END as is_numeric,
        CASE WHEN data_type IN ('date', 'datetime', 'timestamp') THEN 1 ELSE 0 END as is_date,
        CASE WHEN data_type IN ('char', 'text', 'varchar') THEN 1 ELSE 0 END as is_string,
        CASE WHEN data_type IN ('tinyint(1)', 'boolean', 'bool') THEN 1 ELSE 0 END as is_boolean
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name IN (${tableNames})
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
        type: col.type,
        isNumeric: !!col.is_numeric,
        isDate: !!col.is_date,
        isString: !!col.is_string,
        isBoolean: !!col.is_boolean
      })
    }

    // Get primary keys for all tables
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
        AND tc.table_name IN (${tableNames})
        AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY kcu.table_name
    `)

    const primaryKeys: Record<string, string[]> = {}
    for (const pk of pkResult as any[]) {
      primaryKeys[pk.table_name] = pk.primary_key_columns ? pk.primary_key_columns.split(',') : []
    }

    // Get foreign keys for all tables
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
        AND (kcu.table_name IN (${tableNames}) OR kcu.referenced_table_name IN (${tableNames}))
      GROUP BY rc.constraint_name, kcu.table_name, kcu.referenced_table_name, rc.update_rule, rc.delete_rule
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
        deleteRule: fk.delete_rule,
        isDeferrable: false,
        initiallyDeferred: false
      })
    }

    // Combine everything into the expected format
    const enrichedTables = tables.map(table => ({
      tableId: table.id,
      tableName: table.name,
      columns: columnsByTable[table.id] || [],
      primaryKey: primaryKeys[table.id] || [],
      foreignKeys: foreignKeysByTable[table.id] || []
    }))

    // Also return all relationships for the relationships endpoint
    const allRelationships = Object.values(foreignKeysByTable).flat()

    return {
      tables: enrichedTables,
      relationships: allRelationships
    }
  })
})
