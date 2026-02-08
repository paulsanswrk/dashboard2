import { defineEventHandler, readBody } from 'h3'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { computePathsForTables, type Edge, selectJoinTree, type TableGraph } from '../../utils/schemaGraph'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../utils/internalStorageQuery'
import { executeOptiqoflowQuery } from '../../utils/optiqoflowQuery'
import { createWrapIdForDbms } from '../../utils/storageHelpers'
import { db } from '../../../lib/db'
import { organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'


type ReportField = { fieldId: string; name?: string; label?: string; type?: string; isNumeric?: boolean; table?: string }
type MetricRef = ReportField & { aggregation?: string }
type DimensionRef = ReportField & {
  sort?: 'asc' | 'desc'
  dateInterval?: string
  filterValues?: string[]
  filterMode?: 'include' | 'exclude'
  dateRangeStart?: string
  dateRangeEnd?: string
  dateRangeType?: 'static' | 'dynamic'
  dynamicRange?: string
}
type FilterCondition = ReportField & {
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'between' | 'is_null' | 'is_not_null'
  values?: string[]
  value?: string
  valueTo?: string
}
type PreviewRequest = {
  datasetId: string
  xDimensions: DimensionRef[]
  yMetrics: MetricRef[]
  breakdowns: DimensionRef[]
  filters?: FilterCondition[]
  joins?: Array<{ joinType: 'inner' | 'left'; sourceTable: string; targetTable: string; columnPairs: Array<{ sourceColumn: string; targetColumn: string }> }>
  limit?: number
  connectionId?: number
  excludeNullsInDimensions?: boolean
  sizeValue?: MetricRef  // For bubble chart SIZE zone
  chartType?: string     // Used to skip aggregation for certain chart types (e.g. boxplot)
}

function isSafeIdentifier(name: string | undefined): name is string {
  return !!name && /^[a-zA-Z0-9_]+$/.test(name)
}

function getDynamicDateRangeExpr(fieldExpr: string, range: string): string | null {
  switch (range) {
    case 'last_7_days':
      return `${fieldExpr} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    case 'last_30_days':
      return `${fieldExpr} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    case 'last_90_days':
      return `${fieldExpr} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`
    case 'this_month':
      return `${fieldExpr} >= DATE_FORMAT(NOW(), '%Y-%m-01')`
    case 'this_quarter':
      return `${fieldExpr} >= MAKEDATE(YEAR(NOW()), 1) + INTERVAL QUARTER(NOW())*3-3 MONTH`
    case 'this_year':
      return `${fieldExpr} >= DATE_FORMAT(NOW(), '%Y-01-01')`
    default:
      return null
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PreviewRequest>(event)

  const start = Date.now()
  try {
    if (!body?.datasetId || !isSafeIdentifier(body.datasetId)) {
      return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'missing_dataset' } }
    }

    const connectionId = body.connectionId ? Number(body.connectionId) : null
    if (!connectionId) {
      return { columns: [], rows: [], meta: { executionMs: Date.now() - start, error: 'missing_connection' } }
    }

    const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
      columns: 'id, organization_id, auto_join_info, database_type, storage_location, dbms_version'
    })
    console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: Auth check complete, database_type=${connection.database_type}, dbms_version=${connection.dbms_version}`)

    // Get storage location for query routing
    const storageLocation = connection.storage_location || 'external'
    // Use storage_location + dbms_version to determine SQL syntax
    // For synced connections (storage_location=supabase_synced), always use PostgreSQL syntax
    const wrapId = createWrapIdForDbms(storageLocation, connection.dbms_version)

    const table = wrapId(body.datasetId)

    // Derive tenantId from authenticated user's organization (required for Optiqoflow)
    let tenantId: string | undefined
    const user = await serverSupabaseUser(event)
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (profile?.organization_id) {
        const org = await db.select({ tenantId: organizations.tenantId })
          .from(organizations)
          .where(eq(organizations.id, profile.organization_id))
          .limit(1)
          .then(rows => rows[0])

        tenantId = org?.tenantId || undefined
      }
    }

    const dims: DimensionRef[] = [...(body.xDimensions || []), ...(body.breakdowns || [])]
    const metrics: MetricRef[] = [...(body.yMetrics || [])]
    // Include sizeValue as a metric if provided (for bubble chart SIZE zone)
    if (body.sizeValue) {
      metrics.push(body.sizeValue)
    }

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

    // Skip aggregation for chart types that need raw individual values (e.g. boxplot)
    const skipAggregation = body.chartType === 'boxplot'

    for (const m of metrics) {
      const field = qualify(m)
      if (!field) continue
      if (skipAggregation) {
        // Box plot: select raw values without aggregation
        selectParts.push(`${field} AS ${wrapId(m.fieldId)}`)
        columns.push({ key: m.fieldId, label: m.label || m.name || m.fieldId })
      } else {
        let agg = (m.aggregation || (m.isNumeric ? 'SUM' : 'COUNT')).toUpperCase()
        if (!['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'].includes(agg)) {
          agg = m.isNumeric ? 'SUM' : 'COUNT'
        }
        const alias = `${agg.toLowerCase()}_${m.fieldId}`
        selectParts.push(`${agg}(${field}) AS ${wrapId(alias)}`)
        columns.push({ key: alias, label: (m.label || m.name || m.fieldId) + ` (${agg})` })
      }
    }

    if (selectParts.length === 0) {
      // Default COUNT(*) if nothing selected
      selectParts.push('COUNT(*) AS `count`')
      columns.push({ key: 'count', label: 'Count' })
    }

    // WHERE from dimension/metric filters
    const whereParts: string[] = []
    const params: any[] = []

    // Dimension filters (Value list and Date range)
    for (const d of dims) {
      const fieldExpr = qualify(d)
      if (!fieldExpr) continue

      // Value list filters
      if (d.filterValues && d.filterValues.length > 0) {
        const mode = d.filterMode === 'exclude' ? 'NOT IN' : 'IN'
        whereParts.push(`${fieldExpr} ${mode} (${d.filterValues.map(() => '?').join(',')})`)
        params.push(...d.filterValues)
      }

      // Date range filters
      if (d.dateRangeType === 'static') {
        if (d.dateRangeStart) {
          whereParts.push(`${fieldExpr} >= ?`)
          params.push(d.dateRangeStart)
        }
        if (d.dateRangeEnd) {
          whereParts.push(`${fieldExpr} <= ?`)
          params.push(d.dateRangeEnd)
        }
      } else if (d.dateRangeType === 'dynamic' && d.dynamicRange) {
        const rangeExpr = getDynamicDateRangeExpr(fieldExpr, d.dynamicRange)
        if (rangeExpr) {
          whereParts.push(rangeExpr)
        }
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

    // Process standalone filters (Filter By zone)
    const standaloneFilters: FilterCondition[] = body.filters || []
    for (const f of standaloneFilters) {
      const fieldExpr = qualify(f)
      if (!fieldExpr) continue

      switch (f.operator) {
        case 'equals':
          if (f.values && f.values.length > 0) {
            whereParts.push(`${fieldExpr} IN (${f.values.map(() => '?').join(',')})`)
            params.push(...f.values)
          } else if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} = ?`)
            params.push(f.value)
          }
          break
        case 'not_equals':
          if (f.values && f.values.length > 0) {
            whereParts.push(`${fieldExpr} NOT IN (${f.values.map(() => '?').join(',')})`)
            params.push(...f.values)
          } else if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} != ?`)
            params.push(f.value)
          }
          break
        case 'contains':
          if (f.value) {
            whereParts.push(`${fieldExpr} LIKE ?`)
            params.push(`%${f.value}%`)
          }
          break
        case 'not_contains':
          if (f.value) {
            whereParts.push(`${fieldExpr} NOT LIKE ?`)
            params.push(`%${f.value}%`)
          }
          break
        case 'starts_with':
          if (f.value) {
            whereParts.push(`${fieldExpr} LIKE ?`)
            params.push(`${f.value}%`)
          }
          break
        case 'ends_with':
          if (f.value) {
            whereParts.push(`${fieldExpr} LIKE ?`)
            params.push(`%${f.value}`)
          }
          break
        case 'greater_than':
          if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} > ?`)
            params.push(f.value)
          }
          break
        case 'less_than':
          if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} < ?`)
            params.push(f.value)
          }
          break
        case 'greater_or_equal':
          if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} >= ?`)
            params.push(f.value)
          }
          break
        case 'less_or_equal':
          if (f.value !== undefined && f.value !== '') {
            whereParts.push(`${fieldExpr} <= ?`)
            params.push(f.value)
          }
          break
        case 'between':
          if (f.value !== undefined && f.value !== '' && f.valueTo !== undefined && f.valueTo !== '') {
            whereParts.push(`${fieldExpr} BETWEEN ? AND ?`)
            params.push(f.value, f.valueTo)
          }
          break
        case 'is_null':
          whereParts.push(`${fieldExpr} IS NULL`)
          break
        case 'is_not_null':
          whereParts.push(`${fieldExpr} IS NOT NULL`)
          break
      }
    }

    // LIMIT — raise cap for box plots which need more data points for statistical accuracy
    const maxLimit = skipAggregation ? 5000 : 1000
    const limit = Math.min(Math.max(Number(body.limit || 100), 1), maxLimit)

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
    // Also include tables from standalone filters
    for (const f of standaloneFilters) {
      if (f.table && isSafeIdentifier(f.table)) {
        allTables.add(f.table)
      }
    }

    const tableNames = Array.from(allTables)
    console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: SQL building started`)
    console.log(`[PREVIEW_AUTO_JOIN] Tables involved in query:`, tableNames)

    // Build JOIN clauses (MySQL)
    const joinClauses: string[] = []
    const includedTables = new Set<string>([body.datasetId])
    const includedLower = new Set<string>([String(body.datasetId).toLowerCase()])

    // Use auto-join if we have multiple tables and no manual joins specified
    if (tableNames.length > 1 && (!body.joins || body.joins.length === 0) && connectionId) {
      console.log(`[PREVIEW_AUTO_JOIN] Attempting auto-join for ${tableNames.length} tables:`, tableNames)

      try {
        const aji = (connection as any)?.auto_join_info
        if (aji?.graph?.nodes && aji?.graph?.adj) {
          console.log(`[PREVIEW_AUTO_JOIN] Using stored graph for connection ${connectionId}`)

          // Reconstruct TableGraph from stored entries
          const graph: TableGraph = {
            nodes: new Map<string, any>(aji.graph.nodes as [string, any][]),
            adj: new Map<string, Edge[]>(aji.graph.adj as [string, Edge[]][])
          }

          // Compute paths only for the tables in this query (O(K²) where K = tables used)
          const pathsIndex = computePathsForTables(graph, tableNames)

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
          console.error(`[PREVIEW_AUTO_JOIN] Missing auto_join_info for connection ${connectionId}`)
          const executionMsBefore = Date.now() - start
          return { columns, rows: [], meta: { executionMs: executionMsBefore, error: 'missing_auto_join_info' } }
        }
      } catch (error) {
        console.error(`[PREVIEW_AUTO_JOIN] Failed to compute auto-join:`, error)
      }
      console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: Auto-join complete`)
    }

    // Fallback to manual joins if provided — iterate until all are resolved (order-independent)
    const pendingJoins = (body.joins || []).map((j, i) => ({ ...j, _idx: i }))
    let joinProgress = true
    while (pendingJoins.length > 0 && joinProgress) {
      joinProgress = false
      for (let i = pendingJoins.length - 1; i >= 0; i--) {
        const j = pendingJoins[i]
        if (!j) continue
        const jt = j.joinType === 'left' ? 'LEFT JOIN' : 'INNER JOIN'
        if (!isSafeIdentifier(j.targetTable) || !isSafeIdentifier(j.sourceTable)) {
          pendingJoins.splice(i, 1)
          continue
        }
        // Determine which side to join based on what's already included
        let srcTable = j.sourceTable
        let tgtTable = j.targetTable
        let pairs = (j.columnPairs || []).map((p: any) => ({ sourceColumn: p.sourceColumn, targetColumn: p.targetColumn }))
        if (includedTables.has(tgtTable) && !includedTables.has(srcTable)) {
          // Swap so we join the not-yet-included table
          ;[srcTable, tgtTable] = [tgtTable, srcTable]
          pairs = pairs.map((p: any) => ({ sourceColumn: p.targetColumn, targetColumn: p.sourceColumn }))
        }
        if (includedTables.has(tgtTable) || includedLower.has(String(tgtTable).toLowerCase())) {
          // Both tables already included; skip redundant self/double joins
          pendingJoins.splice(i, 1)
          continue
        }
        if (!includedTables.has(srcTable) && !includedLower.has(String(srcTable).toLowerCase())) {
          // Neither side is included yet — skip for now, try again next pass
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
          pendingJoins.splice(i, 1)
          joinProgress = true
        }
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

    // Build ORDER BY from dimensions with sort specified
    const orderByParts: string[] = []
    for (const d of dims) {
      if (d.sort && (d.sort === 'asc' || d.sort === 'desc')) {
        const field = qualify(d)
        if (field) {
          orderByParts.push(`${field} ${d.sort.toUpperCase()}`)
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
      !skipAggregation && groupByParts.length ? 'GROUP BY ' + groupByParts.join(', ') : '',
      orderByParts.length ? 'ORDER BY ' + orderByParts.join(', ') : '',
      'LIMIT ' + limit
    ].filter(Boolean).join(' ')

    const executionMsBefore = Date.now() - start
    const metaPre: Record<string, any> = { executionMs: executionMsBefore, sql }
    if (missingTables.length) {
      metaPre.error = `No join path found for: ${missingTables.join(', ')}. Please use columns from the same table or define a join path.`
      return { columns, rows: [], meta: metaPre }
    }

    console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: SQL built, checking connection type`)

    let rows: any[]

    // Route based on storage_location (already determined above for SQL generation)
    switch (storageLocation) {
      case 'optiqoflow': {
        if (!tenantId) {
          return {
            columns,
            rows: [],
            meta: {
              executionMs: Date.now() - start,
              error: 'User must be associated with an organization that has a tenant_id configured for Optiqoflow data access.'
            }
          }
        }
        console.log(`[preview] Using optiqoflow data source`)
        // SQL is already built with PostgreSQL syntax via createWrapId(storageLocation)
        rows = await executeOptiqoflowQuery(sql, params, tenantId)
        break
      }

      case 'supabase_synced': {
        const storageInfo = await loadInternalStorageInfo(connectionId)
        if (!storageInfo.useInternalStorage || !storageInfo.schemaName) {
          return {
            columns,
            rows: [],
            meta: {
              executionMs: Date.now() - start,
              error: 'Synced storage not configured properly'
            }
          }
        }
        console.log(`[preview] Using synced storage: ${storageInfo.schemaName}`)
        // SQL is already built with PostgreSQL syntax via createWrapId(storageLocation)
        rows = await executeInternalStorageQuery(storageInfo.schemaName, sql, params)
        break
      }

      case 'external':
      default: {
        // Direct MySQL connection
        console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: Loading MySQL config...`)
        const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
        console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: MySQL config loaded, executing query...`)
        console.log(`[PREVIEW_TIMING] SQL: ${sql.substring(0, 200)}...`)
        rows = await withMySqlConnectionConfig(cfg, async (conn) => {
          console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: MySQL connection acquired, running query...`)
          const [res] = await conn.query(sql, params)
          console.log(`[PREVIEW_TIMING] +${Date.now() - start}ms: Query returned ${(res as any[]).length} rows`)
          return res as any[]
        })
        break
      }
    }


    const executionMs = Date.now() - start
    const meta: Record<string, any> = { executionMs, sql, sqlParams: params }
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


