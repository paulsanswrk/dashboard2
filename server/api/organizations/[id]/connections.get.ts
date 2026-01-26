import { defineEventHandler } from 'h3'
import { db } from '../../../../lib/db'
import { dataConnections } from '../../../../lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuthHelper } from '../../../utils/authHelper'

/**
 * GET /api/organizations/:id/connections
 * 
 * Returns all data connections for an organization (Superadmin only)
 */
export default defineEventHandler(async (event) => {
    const ctx = await AuthHelper.requireAuthContext(event)

    const organizationId = event.context.params?.id

    // SUPERADMIN can access any organization's connections
    // ADMIN can only access their own organization's connections
    if (ctx.role !== 'SUPERADMIN') {
        if (ctx.role !== 'ADMIN' || ctx.organizationId !== organizationId) {
            throw createError({ statusCode: 403, statusMessage: 'Access denied. Admins can only view their own organization connections.' })
        }
    }
    if (!organizationId) {
        throw createError({ statusCode: 400, statusMessage: 'Organization ID is required' })
    }

    try {
        const connections = await db.query.dataConnections.findMany({
            where: eq(dataConnections.organizationId, organizationId),
            columns: {
                id: true,
                internalName: true,
                databaseName: true,
                databaseType: true,
                host: true,
                port: true,
                dbmsVersion: true,
                storageLocation: true,
                isImmutable: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: (connections, { desc }) => [desc(connections.createdAt)]
        })

        // Map to snake_case for frontend consistency
        const mappedConnections = connections.map(c => ({
            id: c.id,
            internal_name: c.internalName,
            database_name: c.databaseName,
            database_type: c.databaseType,
            host: c.host,
            port: c.port,
            dbms_version: c.dbmsVersion,
            storage_location: c.storageLocation,
            is_immutable: c.isImmutable,
            created_at: c.createdAt,
            updated_at: c.updatedAt
        }))

        return {
            success: true,
            connections: mappedConnections
        }
    } catch (error: any) {
        console.error('[org-connections] Error:', error?.message || error)
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to load connections: ${error?.message || 'Unknown error'}`
        })
    }
})
