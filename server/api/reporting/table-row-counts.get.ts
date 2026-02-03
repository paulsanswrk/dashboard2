import { defineEventHandler, getQuery } from 'h3'
import { AuthHelper } from '../../utils/authHelper'
import { loadInternalStorageInfo } from '../../utils/internalStorageQuery'
import { pgClient } from '../../../lib/db'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'

/**
 * Get row counts for all tables in a connection.
 * Used by the schema editor to filter out empty tables.
 */
export default defineEventHandler(async (event) => {
    const { connectionId } = getQuery(event) as any
    if (!connectionId) {
        return {}
    }

    const connId = Number(connectionId)

    const connection = await AuthHelper.requireConnectionAccess(event, connId, {
        columns: 'id, organization_id, database_type, storage_location'
    })

    const isInternal = isInternalDataSource(connection as any)
    const isOptiqoFlowSource = (connection as any)?.storage_location === 'optiqoflow'
    const storageInfo = await loadInternalStorageInfo(connId)

    console.log(`[table-row-counts] Connection ${connId}:`, {
        database_type: (connection as any)?.database_type,
        storage_location: (connection as any)?.storage_location,
        isInternal,
        isOptiqoFlowSource,
        useInternalStorage: storageInfo.useInternalStorage,
        schemaName: storageInfo.schemaName
    })

    // Handle OptiqoFlow connections (tenant-aware row counts)
    if (isOptiqoFlowSource) {
        try {
            console.log('[table-row-counts] OptiqoFlow handler started')

            // Get organization and tenant info for this connection
            const { db: drizzleDb } = await import('~/lib/db')
            const connectionDetails = await drizzleDb.query.dataConnections.findFirst({
                where: (dataConnections: any, { eq }: any) => eq(dataConnections.id, connId),
                columns: {
                    organizationId: true,
                },
            })

            console.log('[table-row-counts] Connection details:', connectionDetails)

            if (!connectionDetails?.organizationId) {
                console.error('[table-row-counts] OptiqoFlow connection missing organization_id')
                return {}
            }

            // Get tenant_id from organization
            const { organizations } = await import('~/lib/db/schema')
            const org = await drizzleDb.query.organizations.findFirst({
                where: (orgs: any, { eq }: any) => eq(orgs.id, connectionDetails.organizationId),
                columns: {
                    tenantId: true,
                },
            })

            console.log('[table-row-counts] Organization:', org)

            if (!org?.tenantId) {
                console.error('[table-row-counts] Organization missing tenant_id')
                return {}
            }

            console.log(`[table-row-counts] Calling get_tenant_schema with tenant_id: ${org.tenantId} (type: ${typeof org.tenantId})`)

            // Get tenant schema name
            const tenantSchemaResult = await pgClient.unsafe(
                `SELECT tenants.get_tenant_schema($1::uuid) as schema_name`,
                [org.tenantId]
            ) as Array<{ schema_name: string }>

            console.log('[table-row-counts] Tenant schema result:', tenantSchemaResult)

            if (!tenantSchemaResult || !tenantSchemaResult[0]?.schema_name) {
                console.error('[table-row-counts] Could not get tenant schema')
                return {}
            }

            const tenantSchema = tenantSchemaResult[0].schema_name
            console.log(`[table-row-counts] Using tenant schema: ${tenantSchema}`)

            // Get row counts from tenant schema (tenant-specific views)
            // Note: tenantSchema comes from our own database function, so it's safe to interpolate
            const rows = await pgClient.unsafe(`
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name,
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', '${tenantSchema}', table_name), false, true, '') as xml_count
          FROM information_schema.tables
          WHERE table_schema = '${tenantSchema}'
            AND table_type = 'VIEW'
        ) t
      `) as Array<{ table_name: string; row_count: number }>

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] OptiqoFlow (${tenantSchema}): ${Object.keys(counts).length} tables counted`)
            return counts
        } catch (error: any) {
            console.error('[table-row-counts] Error fetching OptiqoFlow row counts:', error?.message)
            console.error('[table-row-counts] Full error:', error)
            return {}
        }
    }

    // Handle internal data source (optiqoflow schema)
    if (isInternal) {
        try {
            const rows = await pgClient.unsafe(`
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name,
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM optiqoflow.%I', table_name), false, true, '') as xml_count
          FROM information_schema.tables
          WHERE table_schema = 'optiqoflow'
            AND table_type = 'BASE TABLE'
        ) t
      `) as Array<{ table_name: string; row_count: number }>

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] Internal source: ${Object.keys(counts).length} tables counted`)
            return counts
        } catch (error: any) {
            console.error('[table-row-counts] Error fetching internal row counts:', error?.message)
            return {}
        }
    }

    // Handle internal storage (synced MySQL data in PostgreSQL)
    if (storageInfo.useInternalStorage && storageInfo.schemaName) {
        try {
            const schemaName = storageInfo.schemaName
            const rows = await pgClient.unsafe(`
        SELECT 
          table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
        FROM (
          SELECT 
            table_name,
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', $1, table_name), false, true, '') as xml_count
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
        ) t
      `, [schemaName]) as Array<{ table_name: string; row_count: number }>

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] Internal storage (${schemaName}): ${Object.keys(counts).length} tables counted`)
            return counts
        } catch (error: any) {
            console.error('[table-row-counts] Error fetching internal storage row counts:', error?.message)
            return {}
        }
    }

    // Handle external MySQL connection
    try {
        const cfg = await loadConnectionConfigFromSupabase(event, connId)

        return await withMySqlConnectionConfig(cfg, async (conn) => {
            const [rows] = await conn.query(`
        SELECT 
          table_name,
          table_rows as row_count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
      `) as any

            const counts: Record<string, number> = {}
            for (const row of rows) {
                counts[row.table_name] = row.row_count ?? 0
            }

            console.log(`[table-row-counts] MySQL: ${Object.keys(counts).length} tables counted`)
            return counts
        })
    } catch (error: any) {
        console.error('[table-row-counts] Error fetching MySQL row counts:', error?.message)
        return {}
    }
})
