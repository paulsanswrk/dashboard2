/**
 * POST /api/data-transfer/schedule
 *
 * Configure the sync schedule for a connection.
 */

import {db} from '../../../lib/db'
import {datasourceSync} from '../../../lib/db/schema'
import {eq} from 'drizzle-orm'
import {DateTime} from 'luxon'

interface SyncScheduleConfig {
    interval: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
    time: string  // HH:MM format
    timezone: string  // IANA timezone
    daysOfWeek?: string[]  // For DAILY: which days to run
}

/**
 * Calculate the next sync time based on schedule config
 */
function calculateNextSyncTime(config: SyncScheduleConfig): DateTime {
    const [hour, minute] = config.time.split(':').map(Number)
    let next = DateTime.now().setZone(config.timezone).set({
        hour,
        minute,
        second: 0,
        millisecond: 0
    })

    // If we're past the scheduled time today, start from tomorrow
    if (next <= DateTime.now()) {
        next = next.plus({days: 1})
    }

    switch (config.interval) {
        case 'HOURLY':
            // Run every hour at the specified minute
            next = DateTime.now().setZone(config.timezone).set({
                minute,
                second: 0,
                millisecond: 0
            })
            if (next <= DateTime.now()) {
                next = next.plus({hours: 1})
            }
            break

        case 'DAILY':
            // If specific days are configured, find the next matching day
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                const dayMap: Record<string, number> = {
                    'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6, 'Su': 7
                }
                const allowedDays = config.daysOfWeek.map(d => dayMap[d])

                // Find next allowed day
                for (let i = 0; i < 8; i++) {
                    const checkDate = next.plus({days: i})
                    if (allowedDays.includes(checkDate.weekday)) {
                        next = checkDate
                        break
                    }
                }
            }
            break

        case 'WEEKLY':
            // Run once per week on the first configured day
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                const dayMap: Record<string, number> = {
                    'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6, 'Su': 7
                }
                const firstDay = config.daysOfWeek[0]
                const targetDay = firstDay ? (dayMap[firstDay] || 1) : 1

                while (next.weekday !== targetDay) {
                    next = next.plus({days: 1})
                }
            }
            break

        case 'MONTHLY':
            // Run on the 1st of each month
            next = next.set({day: 1})
            if (next <= DateTime.now()) {
                next = next.plus({months: 1})
            }
            break
    }

    return next
}

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

    // Validate schedule config
    const config: SyncScheduleConfig = {
        interval: body.interval || 'DAILY',
        time: body.time || '04:30',
        timezone: body.timezone || 'UTC',
        daysOfWeek: body.daysOfWeek,
    }

    // Validate interval
    if (!['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'].includes(config.interval)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid interval. Must be HOURLY, DAILY, WEEKLY, or MONTHLY'
        })
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(config.time)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid time format. Must be HH:MM'
        })
    }

    // Calculate next sync time
    const nextSyncTime = calculateNextSyncTime(config)

    // Get or create sync record
    let [syncRecord] = await db
        .select()
        .from(datasourceSync)
        .where(eq(datasourceSync.connectionId, connectionId))
        .limit(1)

    if (!syncRecord) {
        // Create new sync record with schedule
        const [newSync] = await db.insert(datasourceSync)
            .values({
                connectionId,
                syncSchedule: config as any,
                nextSyncAt: nextSyncTime.toJSDate(),
                syncStatus: 'idle',
            })
            .returning()
        syncRecord = newSync
    } else {
        // Update existing sync record
        await db.update(datasourceSync)
            .set({
                syncSchedule: config as any,
                nextSyncAt: nextSyncTime.toJSDate(),
                updatedAt: new Date(),
            })
            .where(eq(datasourceSync.id, syncRecord.id))
    }

    return {
        success: true,
        syncId: syncRecord!.id,
        schedule: config,
        nextSyncAt: nextSyncTime.toISO(),
        message: `Sync schedule configured. Next sync at ${nextSyncTime.toFormat('yyyy-MM-dd HH:mm')} ${config.timezone}`
    }
})
