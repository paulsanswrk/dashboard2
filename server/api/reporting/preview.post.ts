import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient'

type ReportField = { fieldId: string; name?: string; label?: string; type?: string; isNumeric?: boolean }
type MetricRef = ReportField & { aggregation?: string }
type DimensionRef = ReportField
type FilterRef = { field: ReportField; operator: string; value: any }

type PreviewRequest = {
  datasetId: string
  xDimensions: DimensionRef[]
  yMetrics: MetricRef[]
  filters: FilterRef[]
  breakdowns: DimensionRef[]
  joins?: Array<{ joinType: 'inner' | 'left'; sourceTable: string; targetTable: string; columnPairs: Array<{ sourceColumn: string; targetColumn: string }> }>
  limit?: number
}

function isSafeIdentifier(name: string | undefined): name is string {
  return !!name && /^[a-zA-Z0-9_]+$/.test(name)
}

function wrapId(id: string) {
  return `\`${id}\``
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PreviewRequest>(event)

  const start = Date.now()
  try {
    if (!body?.datasetId || !isSafeIdentifier(body.datasetId)) {
      return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'missing_dataset' } }
    }

    const table = wrapId(body.datasetId)
    const dims: DimensionRef[] = [...(body.xDimensions || []), ...(body.breakdowns || [])]
    const metrics: MetricRef[] = body.yMetrics || []

    // Build SELECT parts
    const selectParts: string[] = []
    const groupByParts: string[] = []
    const columns: Array<{ key: string; label: string }> = []

    for (const d of dims) {
      const field = isSafeIdentifier(d.fieldId) ? wrapId(d.fieldId) : null
      if (!field) continue
      selectParts.push(`${field} AS ${wrapId(d.fieldId)}`)
      groupByParts.push(field)
      columns.push({ key: d.fieldId, label: d.label || d.name || d.fieldId })
    }

    for (const m of metrics) {
      const field = isSafeIdentifier(m.fieldId) ? wrapId(m.fieldId) : null
      if (!field) continue
      let agg = (m.aggregation || (m.isNumeric ? 'SUM' : 'COUNT')).toUpperCase()
      if (!['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'].includes(agg)) {
        agg = m.isNumeric ? 'SUM' : 'COUNT'
      }
      const alias = `${agg.toLowerCase()}_${m.fieldId}`
      selectParts.push(`${agg}(${field}) AS ${wrapId(alias)}`)
      columns.push({ key: alias, label: (m.label || m.name || m.fieldId) + ` (${agg})` })
    }

    if (selectParts.length === 0) {
      // Default COUNT(*) if nothing selected
      selectParts.push('COUNT(*) AS `count`')
      columns.push({ key: 'count', label: 'Count' })
    }

    // WHERE from filters (basic operators)
    const whereParts: string[] = []
    const params: any[] = []
    for (const f of body.filters || []) {
      const fieldName = f?.field?.fieldId
      if (!isSafeIdentifier(fieldName)) continue
      const field = wrapId(fieldName)
      const op = (f.operator || 'equals').toLowerCase()
      if (op === 'equals') {
        whereParts.push(`${field} = ?`)
        params.push(f.value)
      } else if (op === 'contains') {
        whereParts.push(`${field} LIKE ?`)
        params.push(`%${f.value}%`)
      } else if (op === 'in') {
        const arr = String(f.value || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
        if (arr.length) {
          whereParts.push(`${field} IN (${arr.map(() => '?').join(',')})`)
          params.push(...arr)
        }
      } else if (op === 'between') {
        const start = (f.value || {}).start
        const end = (f.value || {}).end
        if (start != null && end != null) {
          whereParts.push(`${field} BETWEEN ? AND ?`)
          params.push(start, end)
        }
      } else if (op === 'is_null') {
        whereParts.push(`${field} IS NULL`)
      } else if (op === 'not_null') {
        whereParts.push(`${field} IS NOT NULL`)
      }
    }

    // Exclude nulls in dimensions option
    if (body.excludeNullsInDimensions && dims.length) {
      for (const d of dims) {
        if (!isSafeIdentifier(d.fieldId)) continue
        whereParts.push(`${wrapId(d.fieldId)} IS NOT NULL`)
      }
    }

    // LIMIT
    const limit = Math.min(Math.max(Number(body.limit || 100), 1), 1000)

    // Build JOIN clauses (MySQL)
    const joinClauses: string[] = []
    for (const j of body.joins || []) {
      const jt = j.joinType === 'left' ? 'LEFT JOIN' : 'INNER JOIN'
      if (!isSafeIdentifier(j.targetTable)) continue
      const target = wrapId(j.targetTable)
      const onParts: string[] = []
      for (const p of j.columnPairs || []) {
        if (!isSafeIdentifier(p.sourceColumn) || !isSafeIdentifier(p.targetColumn)) continue
        onParts.push(`${wrapId(p.sourceColumn)} = ${target}.${wrapId(p.targetColumn)}`)
      }
      if (onParts.length) joinClauses.push(`${jt} ${target} ON ${onParts.join(' AND ')}`)
    }

    const sql = [
      'SELECT',
      selectParts.join(', '),
      'FROM',
      table,
      ...joinClauses,
      whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '',
      groupByParts.length ? 'GROUP BY ' + groupByParts.join(', ') : '',
      'LIMIT ' + limit
    ].filter(Boolean).join(' ')

    const rows = await withMySqlConnection(async (conn) => {
      const [res] = await conn.query(sql, params)
      return res as any[]
    })

    const executionMs = Date.now() - start
    return {
      columns,
      rows,
      meta: { executionMs, sql }
    }
  } catch (e: any) {
    const executionMs = Date.now() - start
    return { columns: [], rows: [], meta: { executionMs, error: e?.message || 'query_failed' } }
  }
})


