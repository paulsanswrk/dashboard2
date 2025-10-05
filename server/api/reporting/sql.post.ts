import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient'

const FORBIDDEN = [/\b(drop|truncate|alter|create|grant|revoke|insert|update|delete|merge)\b/i]

export default defineEventHandler(async (event) => {
  const { sql, limit = 500 } = await readBody<{ sql: string; limit?: number }>(event)
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
  const rows = await withMySqlConnection(async (conn) => {
    const [res] = await conn.query(safeSql)
    return res as any[]
  })
  const columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
  return { columns, rows }
})


