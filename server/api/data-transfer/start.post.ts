/**
 * POST /api/data-transfer/start
 *
 * Initialize data transfer for a connection.
 * Creates target schema, tables, and queues data for transfer.
 */

import {initializeDataTransfer} from '../../utils/dataTransfer'
import {db} from '../../../lib/db'
import {dataConnections, datasourceSync} from '../../../lib/db/schema'
import {eq} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    if (!body?.connectionId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'connectionId is required'
        })
    }

    const connectionId = parseInt(body.connectionId, 10)

    if (isNaN(connectionId)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid connectionId'
        })
    }

    // Verify connection exists
    const [connection] = await db
        .select({
            id: dataConnections.id,
            storageLocation: dataConnections.storageLocation,
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

    // Check if storage location is set to internal
    if (connection.storageLocation !== 'internal') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Connection must have storage_location set to "internal" for data transfer'
        })
    }

    // Check if already syncing via datasource_sync table
    const [existingSync] = await db
        .select({
            id: datasourceSync.id,
            syncStatus: datasourceSync.syncStatus
        })
        .from(datasourceSync)
        .where(eq(datasourceSync.connectionId, connectionId))
        .limit(1)

    let resultMsg = ''
    let tablesQueued = 0
    let schemaName = ''

    // If syncing or queued, we just want to force a processing cycle
    if (existingSync && (existingSync.syncStatus === 'syncing' || existingSync.syncStatus === 'queued')) {
        console.log(`⚠️ [SYNC] Sync already in progress for connection ${connectionId}. Triggering immediate processing.`)
        resultMsg = 'Sync process triggered for existing job.'
        // Note: We don't initialize again, just process queue below
    } else {
        // Start transfer initialization
        const result = await initializeDataTransfer(connectionId)

        if (result.error) {
            throw createError({
                statusCode: 500,
                statusMessage: result.error
            })
        }

        resultMsg = `Data transfer initialized. ${result.tablesQueued} tables queued for transfer.`
        tablesQueued = result.tablesQueued
        schemaName = result.schemaName
    }

    // Trigger immediate processing of the queue
    // Use a short timeout to give immediate feedback but let the rest execute in background if possible,
    // or just process a batch synchronously to ensure "it works".
    // Since Vercel might kill background tasks, we'll process for up to 5 seconds synchronously.

    // Import processSyncQueue dynamically to avoid circular dependencies if any (though utils import is fine)
    try {
        const {processSyncQueue} = await import('../../utils/dataTransfer')
        // Increase to 290s (leave 10s buffer for 5min limit)
        const processingTime = 290 * 1000
        console.log(`🚀 [SYNC] Triggering immediate processing for ${processingTime / 1000}s...`)

        await processSyncQueue(processingTime)

        console.log(`✅ [SYNC] Immediate processing batch complete.`)
    } catch (err) {
        console.error(`❌ [SYNC] Error triggering immediate processing:`, err)
        // Don't fail the request, just log it
    }

    return {
        success: true,
        schemaName: schemaName || existingSync?.syncStatus || 'unknown',
        tablesQueued,
        message: resultMsg
    }
})
