import mysql from 'mysql2/promise'
import type { MySqlConnectionConfig } from './mysqlClient'
import { withMySqlConnectionConfig } from './mysqlClient'

export async function introspectTable(cfg: MySqlConnectionConfig, tableName: string): Promise<any> {
  return withMySqlConnectionConfig(cfg, async (conn) => {
    // Get primary keys - improved logic
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
      [tableName]
    ) as any

    // If no PK constraint found, check for PRIMARY index (unique index named PRIMARY)
    let primaryKey: string[] = []
    if (pkConstraintRows.length > 0) {
      primaryKey = pkConstraintRows.map((r: any) => r.column_name)
    } else {
      const [primaryIndexRows] = await conn.query(
        `select column_name, seq_in_index
         from information_schema.statistics
         where table_schema = database()
           and table_name = ?
           and index_name = 'PRIMARY'
           and non_unique = 0
         order by seq_in_index`,
        [tableName]
      ) as any
      primaryKey = primaryIndexRows.map((r: any) => r.column_name)
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
      [tableName]
    ) as any

    // Group unique constraints by name
    const uniqueConstraints: Record<string, string[]> = {}
    for (const row of uniqueConstraintRows) {
      if (!uniqueConstraints[row.constraint_name]) {
        uniqueConstraints[row.constraint_name] = []
      }
      uniqueConstraints[row.constraint_name].push(row.column_name)
    }

    // Get foreign keys (both directions - as source and as target)
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
      [tableName, tableName]
    ) as any

    // Get unique constraints for both source and target tables
    const sourceTableUniqueConstraints = uniqueConstraints
    const targetTables = [...new Set(fkRows.map((r: any) => r.target_table))]
    const targetUniqueConstraints: Record<string, Record<string, string[]>> = {}

    for (const targetTable of targetTables) {
      if (targetTable !== tableName) {
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
    for (const r of fkRows) {
      const name = r.constraint_name
      if (!grouped[name]) {
        // If current table is the source, it's a foreign key (child -> parent)
        // If current table is the target, it's a reverse reference (parent <- child)
        const isForeignKey = r.source_table === tableName

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
          Object.values(sourceTableUniqueConstraints).some(constraintCols => constraintCols.includes(col))
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

    // Get all columns for reference
    const [columns] = await conn.query(
      `select column_name, data_type, is_nullable, column_key, column_default, extra
       from information_schema.columns
       where table_schema = database()
         and table_name = ?
       order by ordinal_position`,
      [tableName]
    ) as any

    return {
      tableId: tableName,
      tableName: tableName,
      primaryKey,
      foreignKeys: foreignKeys,
      columns: columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        primaryKey: primaryKey.includes(col.column_name),
        autoIncrement: col.extra?.includes('auto_increment') || false
      }))
    }
  })
}
