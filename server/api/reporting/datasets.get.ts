import { defineEventHandler, getQuery } from 'h3'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

export default defineEventHandler(async (event) => {
  const { connectionId } = getQuery(event) as any
  if (!connectionId) return []
  // MySQL: list tables from information_schema for current database
  try {
    const rows = await (async () => {
      const cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))
      return await withMySqlConnectionConfig(cfg, async (conn) => {
        const [r] = await conn.query(
          `select table_name as id, table_name as name, table_name as label
           from information_schema.tables
           where table_schema = database() and table_type = 'BASE TABLE'
           order by table_name`
        )
        return r as any[]
      })
    })()
    return rows
  } catch (e) {
    return []
  }
})


