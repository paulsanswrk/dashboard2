import { defineEventHandler } from 'h3'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../../utils/connectionConfig'

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

  const user = await serverSupabaseUser(event).catch(() => null as any)
  const isOwner = !!user && user.id === dashboard.owner_id

  async function loadConnectionConfigForOwner(connectionId: number) {
    // If owner is the requester, reuse existing helper (enforces ownership)
    if (isOwner) return await loadConnectionConfigFromSupabase(event, Number(connectionId))
    // Public access path: verify the connection belongs to the dashboard owner, then build cfg
    const { data, error } = await supabaseAdmin
      .from('data_connections')
      .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, owner_id')
      .eq('id', Number(connectionId))
      .single()
    if (error || !data || data.owner_id !== dashboard.owner_id) {
      throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
    }
    return {
      host: data.host,
      port: Number(data.port),
      user: data.username,
      password: data.password,
      database: data.database_name,
      useSshTunneling: !!data.use_ssh_tunneling,
      ssh: data.use_ssh_tunneling ? {
        host: data.ssh_host,
        port: Number(data.ssh_port),
        user: data.ssh_user,
        password: data.ssh_password || undefined,
        privateKey: data.ssh_private_key || undefined
      } : undefined
    }
  }

  // Fetch external data for all charts in parallel (uses internal info server-side)
  const tasks = (links || []).map(async (lnk: any) => {
    const chart = chartsById[lnk.chart_id]
    const sj = (chart?.state_json || {}) as any
    const internal = sj.internal || {}
    const effective = { ...sj, ...internal }
    delete (effective as any).internal

    // Prepare data using internal info
    let columns: any[] = []
    let rows: any[] = []
    const meta: Record<string, any> = {}

    try {
      const sql = internal.actualExecutedSql || internal.sqlText || ''
      const connectionId = internal.dataConnectionId ?? null
      if (sql) {
        let safeSql = sql.trim()
        if (!/\blimit\b/i.test(safeSql)) safeSql = `${safeSql} LIMIT 500`
        if (connectionId) {
          const cfg = await loadConnectionConfigForOwner(Number(connectionId))
          const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
            const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
            return res as any[]
          })
          rows = resRows
        } else {
          const resRows = await withMySqlConnection(async (conn) => {
            const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
            return res as any[]
          })
          rows = resRows
        }
        columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
      } else {
        meta.error = 'internal_state_missing'
      }
    } catch (e: any) {
      meta.error = e?.statusMessage || e?.message || 'query_failed'
    }

    // Build state for response: owner gets flattened full state; public gets only public subset
    const responseState = isOwner ? effective : sj // sj contains only public keys + internal hidden

    // Sanitize meta for public: do not include SQL
    if (!isOwner) delete (meta as any).sql

    return {
      id: lnk.chart_id,
      name: chart?.name || '',
      position: lnk.position,
      state: responseState,
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


