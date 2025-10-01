import { defineEventHandler, getQuery } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient'

export default defineEventHandler(async (event) => {
  const { datasetId } = getQuery(event)
  if (!datasetId || typeof datasetId !== 'string') return []

  try {
    const rows = await withMySqlConnection(async (conn) => {
      const [rows] = await conn.query(
        `select column_name as field_id,
                column_name as name,
                column_name as label,
                data_type
         from information_schema.columns
         where table_schema = database() and table_name = ?
         order by ordinal_position`,
        [datasetId]
      )
      return rows as any[]
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
  } catch (e) {
    return [
      { fieldId: 'category', name: 'category', label: 'Category', type: 'text', isString: true },
      { fieldId: 'value', name: 'value', label: 'Value', type: 'number', isNumeric: true }
    ]
  }
})


