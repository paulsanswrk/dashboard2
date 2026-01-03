/**
 * GET /api/cron/sync-data
 *
 * Vercel cron job that processes the sync queue.
 * Runs every 5 minutes and processes data chunks within the time limit.
 */

import { DateTime } from 'luxon'
import { initializeDataTransfer, processSyncQueue } from '../../utils/dataTransfer'
import { db } from '../../../lib/db'
import { dataConnections, datasourceSync } from '../../../lib/db/schema'
import { and, eq, lte, or } from 'drizzle-orm'
import { LogAccumulator } from '../../utils/loggingUtils'

export default defineEventHandler(async (event) => {
    // TEMPORARILY DISABLED: Resume logic debugging
    // Re-enable scheduled sync by removing this block when ready
    console.log('⚠️ [CRON-SYNC] Scheduled sync is temporarily disabled - use manual sync instead')
    return {
        success: true,
        message: 'Scheduled sync is temporarily disabled',
        disabled: true,
    }

    const startTime = Date.now()
    const logAccumulator = new LogAccumulator()

    try {
        // Auth check - bypass in debug mode
        if (process.env.DEBUG_ENV === 'true') {
            logAccumulator.addLog('debug', 'cron-sync', 'Bypassing cron authentication for local development')
        } else {
            const authHeader = getHeader(event, 'authorization')
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
            }

            const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`
            if (!process.env.CRON_SECRET || authHeader !== expectedAuthHeader) {
                throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
            }
        }

        logAccumulator.addLog('debug', 'cron-sync', 'Starting sync data cron job')
        console.log('🔄 [CRON-SYNC] Starting sync data cron job...')

        const now = DateTime.now().toUTC()

        // Step 1: Check for sync records that are due for a new sync
        const syncsDueForSync = await db
            .select({
                id: datasourceSync.id,
                connectionId: datasourceSync.connectionId,
                syncStatus: datasourceSync.syncStatus,
            })
            .from(datasourceSync)
            .innerJoin(dataConnections, eq(datasourceSync.connectionId, dataConnections.id))
            .where(and(
                lte(datasourceSync.nextSyncAt, now.toJSDate()),
                or(
                    eq(datasourceSync.syncStatus, 'idle'),
                    eq(datasourceSync.syncStatus, 'completed')
                ),
                eq(dataConnections.storageLocation, 'internal')
            ))
            .limit(5)

        console.log(`🔍 [CRON-SYNC] Found ${syncsDueForSync.length} syncs due for initialization`)

        let syncInitialized = 0
        for (const sync of syncsDueForSync) {
            try {
                logAccumulator.addLog('debug', 'cron-sync', `Initializing sync for connection ${sync.connectionId}`)
                console.log(`📦 [CRON-SYNC] Initializing sync for connection ${sync.connectionId}`)
                await initializeDataTransfer(sync.connectionId)
                syncInitialized++
                console.log(`✅ [CRON-SYNC] Sync initialized for connection ${sync.connectionId}`)
            } catch (error: any) {
                logAccumulator.addLog('error', 'cron-sync', `Failed to initialize sync for ${sync.connectionId}: ${error.message}`)
            }
        }

        // Step 2: Process pending queue items
        const maxProcessingTime = 4 * 60 * 1000
        console.log(`📊 [CRON-SYNC] Processing pending queue items (max ${maxProcessingTime}ms)...`)
        const result = await processSyncQueue(maxProcessingTime)
        console.log(`📈 [CRON-SYNC] Queue processing complete:`, {
            itemsProcessed: result.itemsProcessed,
            rowsTransferred: result.rowsTransferred,
            errors: result.errors.length,
            complete: result.complete
        })

        // Step 3: Update next_sync_at for completed syncs
        const completedSyncs = await db
            .select({
                id: datasourceSync.id,
                syncSchedule: datasourceSync.syncSchedule,
            })
            .from(datasourceSync)
            .where(eq(datasourceSync.syncStatus, 'completed'))
            .limit(10)

        for (const sync of completedSyncs) {
            if (sync.syncSchedule) {
                const schedule = sync.syncSchedule as any
                const nextSync = calculateNextSyncTime(schedule)

                await db.update(datasourceSync)
                    .set({
                        syncStatus: 'idle',
                        nextSyncAt: nextSync.toJSDate(),
                        updatedAt: new Date(),
                    })
                    .where(eq(datasourceSync.id, sync.id))
            } else {
                await db.update(datasourceSync)
                    .set({
                        syncStatus: 'idle',
                        updatedAt: new Date(),
                    })
                    .where(eq(datasourceSync.id, sync.id))
            }
        }

        const duration = Date.now() - startTime

        logAccumulator.addLog('debug', 'cron-sync', `Sync cron completed in ${duration}ms`, {
            syncInitialized,
            itemsProcessed: result.itemsProcessed,
            rowsTransferred: result.rowsTransferred,
            errors: result.errors.length,
            complete: result.complete,
        })

        await logAccumulator.flushLogs()

        return {
            success: true,
            duration,
            syncInitialized,
            itemsProcessed: result.itemsProcessed,
            rowsTransferred: result.rowsTransferred,
            errors: result.errors,
            queueComplete: result.complete,
        }

    } catch (error: any) {
        const duration = Date.now() - startTime

        logAccumulator.addLog('error', 'cron-sync', `Sync cron failed: ${error.message}`, {
            stack: error.stack,
            duration,
        })

        await logAccumulator.flushLogs()

        throw createError({
            statusCode: 500,
            statusMessage: error.message,
        })
    }
})

/**
 * Calculate next sync time from schedule config
 */
function calculateNextSyncTime(config: any): DateTime {
    const [hour, minute] = (config.time || '04:30').split(':').map(Number)
    const timezone = config.timezone || 'UTC'

    let next = DateTime.now().setZone(timezone).set({
        hour,
        minute,
        second: 0,
        millisecond: 0
    })

    if (next <= DateTime.now()) {
        switch (config.interval) {
            case 'HOURLY':
                next = DateTime.now().setZone(timezone).set({ minute, second: 0, millisecond: 0 })
                if (next <= DateTime.now()) {
                    next = next.plus({ hours: 1 })
                }
                break
            case 'DAILY':
                next = next.plus({ days: 1 })
                break
            case 'WEEKLY':
                next = next.plus({ weeks: 1 })
                break
            case 'MONTHLY':
                next = next.plus({ months: 1 })
                break
            default:
                next = next.plus({ days: 1 })
        }
    }

    return next
}
