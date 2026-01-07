import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient.dev'

export default defineEventHandler(async (event) => {
  const { datasetId, fields, filters, limit = 100 } = await readBody<any>(event)
  if (!datasetId) return { columns: [], rows: [] }
  const safe = (n: string) => /^[a-zA-Z0-9_]+$/.test(n)
  if (!safe(datasetId)) return { columns: [], rows: [] }
  const table = `\`${datasetId}\``
  const cols = Array.isArray(fields) && fields.length ? fields.filter((f: string) => safe(f)).map((f: string) => `\`${f}\``).join(', ') : '*'
  const whereParts: string[] = []
  const params: any[] = []
  for (const f of filters || []) {
    if (!safe(f.fieldId)) continue
    const field = `\`${f.fieldId}\``
    if (f.operator === 'equals') { whereParts.push(`${field} = ?`); params.push(f.value) }
    else if (f.operator === 'contains') { whereParts.push(`${field} LIKE ?`); params.push(`%${f.value}%`) }
  }
  const sql = `SELECT ${cols} FROM ${table} ${whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : ''} LIMIT ${Math.min(Math.max(Number(limit), 1), 1000)}`
  const rows = await withMySqlConnection(async (conn) => {
    const [res] = await conn.query(sql, params)
    return res as any[]
  })
  const columns = rows.length ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : []
  return { columns, rows }
})


