import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

const FORBIDDEN = [/\b(drop|truncate|alter|create|grant|revoke|insert|update|delete|merge)\b/i]

export default defineEventHandler(async (event) => {
  const { sql, limit = 500, connectionId } = await readBody<{ sql: string; limit?: number; connectionId?: number }>(event)
  if (!sql || typeof sql !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing SQL' })
  }
  // Basic safeguards
  if (FORBIDDEN.some((r) => r.test(sql))) {
    throw createError({ statusCode: 400, statusMessage: 'Forbidden statement' })
  }
  // Enforce a limit if not present
  let safeSql = sql.trim()
  if (!/\blimit\b/i.test(safeSql)) {
    safeSql = `${safeSql} LIMIT ${Math.min(Math.max(Number(limit), 1), 5000)}`
  }
  // Basic CROSS JOIN guard
  if (/\bcross\s+join\b/i.test(safeSql)) {
    return { columns: [], rows: [], meta: { error: 'cross_join_blocked' } } as any
  }

  // Use specific connection if provided, otherwise fall back to default
  const rows = connectionId
    ? await (async () => {
        const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
        return withMySqlConnectionConfig(cfg, async (conn) => {
          const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
          return res as any[]
        })
      })()
    : await withMySqlConnection(async (conn) => {
        const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
        return res as any[]
      })

  const columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
  return { columns, rows }
})


