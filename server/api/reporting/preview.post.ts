import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { computePathsIndex, selectJoinTree, type Edge, type TableGraph } from '../../utils/schemaGraph'

type ReportField = { fieldId: string; name?: string; label?: string; type?: string; isNumeric?: boolean; table?: string }
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
  connectionId?: number
  excludeNullsInDimensions?: boolean
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
    const usedTables = new Set<string>()
    const qualify = (f: { fieldId?: string; table?: string } | null | undefined): string | null => {
      if (!f || !isSafeIdentifier(f.fieldId)) return null
      const col = wrapId(f.fieldId as string)
      if (f.table && isSafeIdentifier(f.table)) {
        usedTables.add(f.table)
        return `${wrapId(f.table)}.${col}`
      }
      return col
    }

    for (const d of dims) {
      const field = qualify(d)
      if (!field) continue
      selectParts.push(`${field} AS ${wrapId(d.fieldId)}`)
      groupByParts.push(field)
      columns.push({ key: d.fieldId, label: d.label || d.name || d.fieldId })
    }

    for (const m of metrics) {
      const field = qualify(m)
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
      const fieldExpr = qualify(f?.field)
      if (!fieldExpr) continue
      const op = (f.operator || 'equals').toLowerCase()
      if (op === 'equals') {
        whereParts.push(`${fieldExpr} = ?`)
        params.push(f.value)
      } else if (op === 'contains') {
        whereParts.push(`${fieldExpr} LIKE ?`)
        params.push(`%${f.value}%`)
      } else if (op === 'in') {
        const arr = String(f.value || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
        if (arr.length) {
          whereParts.push(`${fieldExpr} IN (${arr.map(() => '?').join(',')})`)
          params.push(...arr)
        }
      } else if (op === 'between') {
        const start = (f.value || {}).start
        const end = (f.value || {}).end
        if (start != null && end != null) {
          whereParts.push(`${fieldExpr} BETWEEN ? AND ?`)
          params.push(start, end)
        }
      } else if (op === 'is_null') {
        whereParts.push(`${fieldExpr} IS NULL`)
      } else if (op === 'not_null') {
        whereParts.push(`${fieldExpr} IS NOT NULL`)
      }
    }

    // Exclude nulls in dimensions option
    if (body.excludeNullsInDimensions && dims.length) {
      for (const d of dims) {
        const field = qualify(d)
        if (!field) continue
        whereParts.push(`${field} IS NOT NULL`)
      }
    }

    // LIMIT
    const limit = Math.min(Math.max(Number(body.limit || 100), 1), 1000)

    // Extract all unique table names from selected fields
    const allTables = new Set<string>([body.datasetId]) // Start with datasetId as base table

    for (const d of dims) {
      if (d.table && isSafeIdentifier(d.table)) {
        allTables.add(d.table)
      }
    }
    for (const m of metrics) {
      if (m.table && isSafeIdentifier(m.table)) {
        allTables.add(m.table)
      }
    }
    for (const f of body.filters || []) {
      if (f.field?.table && isSafeIdentifier(f.field.table)) {
        allTables.add(f.field.table)
      }
    }

    const tableNames = Array.from(allTables)
    console.log(`[PREVIEW_AUTO_JOIN] Tables involved in query:`, tableNames)

    // Build JOIN clauses (MySQL)
    const joinClauses: string[] = []
    const includedTables = new Set<string>([body.datasetId])
    const includedLower = new Set<string>([String(body.datasetId).toLowerCase()])

    // Use auto-join if we have multiple tables and no manual joins specified
    if (tableNames.length > 1 && (!body.joins || body.joins.length === 0) && body.connectionId) {
      console.log(`[PREVIEW_AUTO_JOIN] Attempting auto-join for ${tableNames.length} tables:`, tableNames)

      try {
        // Load precomputed auto_join_info (preferred) and fallback schema_json
        const user = await serverSupabaseUser(event)
        if (user) {
          const { data: connectionData } = await supabaseAdmin
            .from('data_connections')
            .select('auto_join_info')
            .eq('id', body.connectionId)
            .eq('owner_id', user.id)
            .single()

          const aji = (connectionData as any)?.auto_join_info
          if (aji?.graph?.nodes && aji?.graph?.adj) {
            console.log(`[PREVIEW_AUTO_JOIN] Using stored auto_join_info graph for connection ${body.connectionId}`)

            // Reconstruct TableGraph from stored entries
            const graph: TableGraph = {
              nodes: new Map<string, any>(aji.graph.nodes as [string, any][]),
              adj: new Map<string, Edge[]>(aji.graph.adj as [string, Edge[]][])
            }

            // Build paths index (stored Map was not JSON-serializable)
            const pathsIndex = computePathsIndex(graph)

            // Select join tree for requested tables
            const joinTree = selectJoinTree(tableNames, graph, pathsIndex)
            console.log(`[PREVIEW_AUTO_JOIN] Join tree: nodes=${joinTree.nodes.length}, edges=${joinTree.edgeIds.length}`)

            if (joinTree.edgeIds.length > 0) {
              // Build quick edge lookup
              const edgeById = new Map<string, Edge>()
              for (const [, edges] of graph.adj) {
                for (const e of edges) edgeById.set(e.id, e)
              }

              // Resolve edge objects
              const sortedEdges = joinTree.edgeIds
                .map(id => edgeById.get(id))
                .filter(Boolean) as Edge[]

              // Add JOINs in dependency order starting from base datasetId
              const pending = new Set(sortedEdges.map(e => e.id))
              let madeProgress = true
              while (pending.size && madeProgress) {
                madeProgress = false
                for (const edgeId of Array.from(pending)) {
                  const edge = edgeById.get(edgeId)!
                  const sourceTable = edge.from
                  const targetTable = edge.to
                  if (includedTables.has(targetTable) || includedLower.has(String(targetTable).toLowerCase())) {
                    pending.delete(edgeId)
                    continue
                  }
                  if (includedTables.has(sourceTable) || includedLower.has(String(sourceTable).toLowerCase())) {
                    const onParts: string[] = []
                    for (const pair of edge.payload.columnPairs || []) {
                      if (isSafeIdentifier(pair.sourceColumn) && isSafeIdentifier(pair.targetColumn)) {
                        onParts.push(`${wrapId(sourceTable)}.${wrapId(pair.sourceColumn)} = ${wrapId(targetTable)}.${wrapId(pair.targetColumn)}`)
                      }
                    }
                    if (onParts.length) {
                      joinClauses.push(`INNER JOIN ${wrapId(targetTable)} ON ${onParts.join(' AND ')}`)
                      includedTables.add(targetTable)
                      includedLower.add(String(targetTable).toLowerCase())
                      pending.delete(edgeId)
                      madeProgress = true
                      console.log(`[PREVIEW_AUTO_JOIN] Added join: ${sourceTable} -> ${targetTable}`)
                    }
                  }
                }
              }
            }
          } else {
            console.error(`[PREVIEW_AUTO_JOIN] Missing auto_join_info for connection ${body.connectionId}`)
            const executionMsBefore = Date.now() - start
            return { columns, rows: [], meta: { executionMs: executionMsBefore, error: 'missing_auto_join_info' } }
          }
        }
      } catch (error) {
        console.error(`[PREVIEW_AUTO_JOIN] Failed to compute auto-join:`, error)
      }
    }

    // Fallback to manual joins if provided
    for (const j of body.joins || []) {
      const jt = j.joinType === 'left' ? 'LEFT JOIN' : 'INNER JOIN'
      if (!isSafeIdentifier(j.targetTable) || !isSafeIdentifier(j.sourceTable)) continue
      // Determine which side to join based on what's already included
      let srcTable = j.sourceTable
      let tgtTable = j.targetTable
      let pairs = (j.columnPairs || []).map(p => ({ sourceColumn: p.sourceColumn, targetColumn: p.targetColumn }))
      if (includedTables.has(tgtTable) && !includedTables.has(srcTable)) {
        // Swap so we join the not-yet-included table
        ;[srcTable, tgtTable] = [tgtTable, srcTable]
        pairs = pairs.map(p => ({ sourceColumn: p.targetColumn, targetColumn: p.sourceColumn }))
      }
      if (includedTables.has(tgtTable) || includedLower.has(String(tgtTable).toLowerCase())) {
        // Both tables already included; skip redundant self/double joins
        continue
      }
      const target = wrapId(tgtTable)
      const source = wrapId(srcTable)
      const onParts: string[] = []
      for (const p of pairs) {
        if (!isSafeIdentifier(p.sourceColumn) || !isSafeIdentifier(p.targetColumn)) continue
        onParts.push(`${source}.${wrapId(p.sourceColumn)} = ${target}.${wrapId(p.targetColumn)}`)
      }
      if (onParts.length) {
        joinClauses.push(`${jt} ${target} ON ${onParts.join(' AND ')}`)
        includedTables.add(tgtTable)
        includedLower.add(String(tgtTable).toLowerCase())
      }
    }

    // Ensure all used tables are present; CROSS JOIN missing ones
    const crossJoinClauses: string[] = []
    const missingTables: string[] = []
    const usedLower = new Set(Array.from(usedTables).map(t => String(t).toLowerCase()))
    for (const tLower of usedLower) {
      if (!includedLower.has(tLower)) {
        // try to find original-cased name from usedTables set
        const original = Array.from(usedTables).find(x => String(x).toLowerCase() === tLower) as string
        if (original && isSafeIdentifier(original)) {
          crossJoinClauses.push(`CROSS JOIN ${wrapId(original)}`)
          missingTables.push(original)
          includedTables.add(original)
          includedLower.add(tLower)
        }
      }
    }

    const sql = [
      'SELECT',
      selectParts.join(', '),
      'FROM',
      table,
      ...joinClauses,
      ...crossJoinClauses,
      whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '',
      groupByParts.length ? 'GROUP BY ' + groupByParts.join(', ') : '',
      'LIMIT ' + limit
    ].filter(Boolean).join(' ')

    const executionMsBefore = Date.now() - start
    const metaPre: Record<string, any> = { executionMs: executionMsBefore, sql }
    if (missingTables.length) {
      metaPre.warnings = [`Tables without explicit joins added via CROSS JOIN: ${missingTables.join(', ')}`]
      metaPre.error = 'cross_join_blocked'
      return { columns, rows: [], meta: metaPre }
    }

    if (!body.connectionId) {
      return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'missing_connection' } }
    }
    const cfg = await loadConnectionConfigFromSupabase(event, Number(body.connectionId))
    const rows = await withMySqlConnectionConfig(cfg, async (conn) => {
      const [res] = await conn.query(sql, params)
      return res as any[]
    })

    const executionMs = Date.now() - start
    const meta: Record<string, any> = { executionMs, sql }
    return {
      columns,
      rows,
      meta
    }
  } catch (e: any) {
    const executionMs = Date.now() - start
    return { columns: [], rows: [], meta: { executionMs, error: e?.message || 'query_failed' } }
  }
})


