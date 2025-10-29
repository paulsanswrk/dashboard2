import { defineEventHandler } from 'h3'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../../utils/connectionConfig'

function sanitizeAndLimitSql(sql: string, limit: number = 500) {
  const FORBIDDEN = /\b(drop|truncate|alter|create|grant|revoke|insert|update|delete|merge)\b/i
  if (!sql || typeof sql !== 'string') throw createError({ statusCode: 400, statusMessage: 'Missing SQL' })
  if (FORBIDDEN.test(sql)) throw createError({ statusCode: 400, statusMessage: 'Forbidden statement' })
  let safeSql = sql.trim()
  if (!/\blimit\b/i.test(safeSql)) {
    safeSql = `${safeSql} LIMIT ${Math.min(Math.max(Number(limit), 1), 5000)}`
  }
  if (/\bcross\s+join\b/i.test(safeSql)) {
    return { blocked: true, sql: safeSql }
  }
  return { blocked: false, sql: safeSql }
}

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id as string
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

  // Load dashboard first
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id, name, owner_id, is_public, created_at')
    .eq('id', id)
    .single()

  if (dashError || !dashboard) throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })

  // Access control: if not public, require owner
  if (!dashboard.is_public) {
    const user = await serverSupabaseUser(event)
    if (!user || user.id !== dashboard.owner_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  // Load positions
  const { data: links, error: linksError } = await supabaseAdmin
    .from('dashboard_charts')
    .select('chart_id, position, created_at')
    .eq('dashboard_id', dashboard.id)
    .order('created_at', { ascending: true })
  if (linksError) throw createError({ statusCode: 500, statusMessage: linksError.message })

  const chartIds: number[] = (links || []).map((l: any) => l.chart_id)
  const chartsById: Record<number, any> = {}
  if (chartIds.length) {
    const { data: charts, error: chartsError } = await supabaseAdmin
      .from('charts')
      .select('id, name, description, state_json')
      .in('id', chartIds)
    if (chartsError) throw createError({ statusCode: 500, statusMessage: chartsError.message })
    for (const c of charts || []) chartsById[c.id] = c
  }

  // Build promises to load external data in parallel
  const tasks = (links || []).map(async (lnk: any) => {
    const chart = chartsById[lnk.chart_id]
    const state = chart?.state_json || {}
    let columns: any[] = []
    let rows: any[] = []
    const meta: Record<string, any> = {}

    try {
      const sql = state?.actualExecutedSql || state?.sqlText || ''
      const connectionId = state?.dataConnectionId ?? null
      if (sql) {
        const s = sanitizeAndLimitSql(sql)
        if (s.blocked) {
          meta.error = 'cross_join_blocked'
        } else {
          if (connectionId) {
            const cfg = await loadConnectionConfigFromSupabase(event, Number(connectionId))
            const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
              const [res] = await conn.query({ sql: s.sql, timeout: 10000 } as any)
              return res as any[]
            })
            rows = resRows
          } else {
            const resRows = await withMySqlConnection(async (conn) => {
              const [res] = await conn.query({ sql: s.sql, timeout: 10000 } as any)
              return res as any[]
            })
            rows = resRows
          }
          columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
        }
      } else {
        meta.error = 'missing_sql'
      }
    } catch (e: any) {
      meta.error = e?.statusMessage || e?.message || 'query_failed'
    }

    return {
      id: lnk.chart_id,
      name: chart?.name || '',
      position: lnk.position,
      state,
      data: { columns, rows, meta }
    }
  })

  const results = await Promise.all(tasks)

  return {
    id: dashboard.id,
    name: dashboard.name,
    isPublic: dashboard.is_public,
    createdAt: dashboard.created_at,
    charts: results
  }
})


