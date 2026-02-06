/**
 * Helper function to route queries based on storage_location  
 * Shared logic for all query endpoints
 */

import type { H3Event } from 'h3'
import { loadConnectionConfigFromSupabase } from './connectionConfig'
import { withMySqlConnectionConfig } from './mysqlClient'
import { executeOptiqoflowQuery } from './optiqoflowQuery'
import { loadInternalStorageInfo, executeInternalStorageQuery } from './internalStorageQuery'
import { type StorageLocation } from './storageHelpers'
import { db } from '../../lib/db'
import { dataConnections } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'

// Re-export for backwards compatibility
export type { StorageLocation } from './storageHelpers'

export interface QueryRouterOptions {
    connectionId: number
    sql: string
    params?: any[]
    tenantId?: string
    event?: H3Event
}

export interface QueryRouterResult {
    rows: any[]
    storageLocation: StorageLocation
    error?: string
}

/**
 * Route and execute query based on connection's storage_location
 */
export async function routeAndExecuteQuery(options: QueryRouterOptions): Promise<QueryRouterResult> {
    const { connectionId, sql, params = [], tenantId, event } = options

    // Get connection's storage location
    const connection = await db.query.dataConnections.findFirst({
        where: eq(dataConnections.id, connectionId),
        columns: { id: true, storageLocation: true }
    })

    const storageLocation = (connection?.storageLocation as StorageLocation) || 'external'

    try {
        let rows: any[]

        switch (storageLocation) {
            case 'external': {
                // Direct MySQL connection
                const cfg = event
                    ? await loadConnectionConfigFromSupabase(event, connectionId)
                    : await loadConnectionConfigFromSupabase({} as H3Event, connectionId)

                rows = await withMySqlConnectionConfig(cfg, async (conn) => {
                    const [res] = await conn.query({ sql, timeout: 30000 } as any)
                    return res as any[]
                })
                break
            }

            case 'optiqoflow': {
                // OptiqoFlow data with tenant isolation
                if (!tenantId) {
                    return {
                        rows: [],
                        storageLocation,
                        error: 'User must be associated with an organization that has a tenant_id configured for Optiqoflow data access.'
                    }
                }
                // SQL is already in PostgreSQL syntax (dbms_version determines SQL generation)
                rows = await executeOptiqoflowQuery(sql, params, tenantId)
                break
            }

            case 'supabase_synced': {
                // Synced MySQL data in Supabase PostgreSQL
                // SQL is already in PostgreSQL syntax (preview.post.ts generates correct syntax)
                const storageInfo = await loadInternalStorageInfo(connectionId)
                if (!storageInfo.useInternalStorage || !storageInfo.schemaName) {
                    return {
                        rows: [],
                        storageLocation,
                        error: 'Synced storage not configured properly for this connection'
                    }
                }
                rows = await executeInternalStorageQuery(storageInfo.schemaName, sql, params)
                break
            }

            default:
                throw new Error(`Unknown storage_location: ${storageLocation}`)
        }

        return { rows, storageLocation }

    } catch (error: any) {
        return {
            rows: [],
            storageLocation,
            error: error.message || 'Query execution failed'
        }
    }
}
