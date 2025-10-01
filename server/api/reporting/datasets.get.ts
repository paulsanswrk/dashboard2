import { defineEventHandler } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient'

export default defineEventHandler(async () => {
  // MySQL: list tables from information_schema for current database
  try {
    const rows = await withMySqlConnection(async (conn) => {
      const [rows] = await conn.query(
        `select table_name as id, table_name as name, table_name as label
         from information_schema.tables
         where table_schema = database() and table_type = 'BASE TABLE'
         order by table_name`
      )
      return rows as any[]
    })
    return rows
  } catch (e) {
    return [ { id: 'mock_dataset', name: 'mock_dataset', label: 'Mock Dataset' } ]
  }
})


