import { defineEventHandler, getQuery } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient'

export default defineEventHandler(async (event) => {
  const { datasetId } = getQuery(event)
  if (!datasetId || typeof datasetId !== 'string') return []

  try {
    const rows = await withMySqlConnection(async (conn) => {
      const [rows] = await conn.query(
        `select rc.constraint_name,
                kcu.table_name as source_table,
                kcu.referenced_table_name as target_table,
                group_concat(json_object('position', kcu.ordinal_position,
                                         'sourceColumn', kcu.column_name,
                                         'targetColumn', kcu.referenced_column_name)
                             order by kcu.ordinal_position separator ',') as pairs,
                rc.update_rule,
                rc.delete_rule
         from information_schema.referential_constraints rc
         join information_schema.key_column_usage kcu
           on rc.constraint_name = kcu.constraint_name
          and rc.constraint_schema = kcu.constraint_schema
         where kcu.table_schema = database()
           and kcu.table_name = ?
         group by rc.constraint_name, kcu.table_name, kcu.referenced_table_name, rc.update_rule, rc.delete_rule`,
        [datasetId]
      )
      return rows as any[]
    })
    return rows.map((r: any) => ({
      constraintName: r.constraint_name,
      sourceTable: r.source_table,
      targetTable: r.target_table,
      columnPairs: JSON.parse(`[${r.pairs}]`),
      updateRule: r.update_rule,
      deleteRule: r.delete_rule,
      isDeferrable: false,
      initiallyDeferred: false
    }))
  } catch (e) {
    return []
  }
})


