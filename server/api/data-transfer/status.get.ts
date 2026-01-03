/**
 * GET /api/data-transfer/status
 *
 * Get the current sync status for a connection.
 */

import {db} from '../../../lib/db'
import {dataConnections, datasourceSync, syncQueue} from '../../../lib/db/schema'
import {eq, sql} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    if (!query.connectionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'connectionId is required'
        })
    }

    const connectionId = parseInt(query.connectionId as string, 10)

    if (isNaN(connectionId)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid connectionId'
        })
    }

    // Get connection
    const [connection] = await db
        .select({
            id: dataConnections.id,
            internalName: dataConnections.internalName,
        })
        .from(dataConnections)
        .where(eq(dataConnections.id, connectionId))
        .limit(1)

    if (!connection) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Connection not found'
        })
    }

    // Get sync record
    const [syncRecord] = await db
        .select()
        .from(datasourceSync)
        .where(eq(datasourceSync.connectionId, connectionId))
        .limit(1)

    if (!syncRecord) {
        return {
            connectionId: connection.id,
            internalName: connection.internalName,
            syncStatus: 'no_sync',
            message: 'No sync configured for this connection',
        }
    }

    // Get queue statistics
    const queueStats = await db
        .select({
            status: syncQueue.status,
            count: sql<number>`count(*)`,
        })
        .from(syncQueue)
        .where(eq(syncQueue.syncId, syncRecord.id))
        .groupBy(syncQueue.status)

    const queueSummary = {
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0,
    }

    for (const stat of queueStats) {
        if (stat.status && stat.status in queueSummary) {
            queueSummary[stat.status as keyof typeof queueSummary] = Number(stat.count)
        }
    }

    const totalTables = Object.values(queueSummary).reduce((a, b) => a + b, 0)

    return {
        connectionId: connection.id,
        internalName: connection.internalName,
        syncId: syncRecord.id,
        targetSchemaName: syncRecord.targetSchemaName,
        syncStatus: syncRecord.syncStatus,
        syncProgress: syncRecord.syncProgress,
        syncError: syncRecord.syncError,
        lastSyncAt: syncRecord.lastSyncAt,
        nextSyncAt: syncRecord.nextSyncAt,
        schedule: syncRecord.syncSchedule,
        queue: {
            ...queueSummary,
            total: totalTables,
        },
    }
})
