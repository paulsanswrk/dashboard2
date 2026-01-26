import { defineEventHandler, readBody, createError } from 'h3'
import { withMySqlConnection } from '../../utils/mysqlClient.dev'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { loadInternalStorageInfo, executeInternalStorageQuery } from '../../utils/internalStorageQuery'
import { executeOptiqoflowQuery, translateIdentifiers } from '../../utils/optiqoflowQuery'
import { db } from '../../../lib/db'
import { dataConnections, organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

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
  let rows: any[]
  try {
    if (connectionId) {
      // Get connection to check storage_location
      const connection = await db.query.dataConnections.findFirst({
        where: eq(dataConnections.id, connectionId),
        columns: { id: true, storageLocation: true }
      })

      const storageLocation = connection?.storageLocation || 'external'

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

      // Route based on storage_location
      switch (storageLocation) {
        case 'optiqoflow': {
          if (!tenantId) {
            return {
              columns: [],
              rows: [],
              meta: { error: 'User must be associated with an organization that has a tenant_id configured for Optiqoflow data access.' }
            }
          }
          console.log(`[sql.post] Using optiqoflow data source`)
          const pgSql = translateIdentifiers(safeSql)
          rows = await executeOptiqoflowQuery(pgSql, [], tenantId)
          break
        }

        case 'supabase_synced': {
          const storageInfo = await loadInternalStorageInfo(connectionId)
          if (!storageInfo.useInternalStorage || !storageInfo.schemaName) {
            return {
              columns: [],
              rows: [],
              meta: { error: 'Synced storage not configured properly' }
            }
          }
          console.log(`[sql.post] Using synced storage: ${storageInfo.schemaName}`)
          rows = await executeInternalStorageQuery(storageInfo.schemaName, safeSql)
          break
        }

        case 'external':
        default: {
          // Direct MySQL connection
          const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
          rows = await withMySqlConnectionConfig(cfg, async (conn) => {
            const [res] = await conn.query({ sql: safeSql, timeout: 30000 } as any)
            return res as any[]
          })
          break
        }
      }
    } else {
      // No connection ID - use default MySQL connection
      rows = await withMySqlConnection(async (conn) => {
        const [res] = await conn.query({ sql: safeSql, timeout: 30000 } as any)
        return res as any[]
      })
    }

  } catch (error: any) {
    // Handle MySQL timeout errors specifically
    if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || error.message?.includes('Query inactivity timeout')) {
      return {
        columns: [],
        rows: [],
        meta: {
          error: 'Query timed out. The database query took too long to execute. Try simplifying your query or adding more specific filters.'
        }
      }
    }
    // Handle other MySQL errors
    if (error.code || error.sqlState) {
      return {
        columns: [],
        rows: [],
        meta: {
          error: `Database error: ${error.message || 'Unknown database error'}`
        }
      }
    }
    // Re-throw unexpected errors
    throw error
  }

  const columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
  return { columns, rows }
})


