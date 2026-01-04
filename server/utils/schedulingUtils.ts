import { DateTime } from 'luxon'

export interface ScheduleConfig {
    interval: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    send_time: string // HH:MM format
    timezone: string // IANA timezone identifier
    day_of_week?: string[] // Array of day abbreviations for weekly reports: ['Mo', 'Tu', 'We', 'Th', 'Fr']
}

export interface ReportSchedule extends ScheduleConfig {
    id: string
    status: 'Active' | 'Paused'
}

/**
 * Calculate the next run timestamp for a scheduled report
 * Takes into account interval, send_time, timezone, and optional day_of_week
 *
 * @param schedule - The schedule configuration
 * @param fromTime - Optional base time to calculate from (defaults to now)
 * @returns DateTime object representing the next scheduled run in UTC
 */
export function calculateNextRun(schedule: ScheduleConfig, fromTime?: DateTime): DateTime {
    const { interval, send_time, timezone, day_of_week } = schedule

    // Default to current time if not provided
    const baseTime = fromTime || DateTime.now()

    // Parse send_time (HH:MM format)
    const [hours, minutes] = send_time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid send_time format: ${send_time}. Expected HH:MM`)
    }

    // Create a DateTime in the report's timezone for today at the specified send_time
    let nextRun = baseTime.setZone(timezone).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0
    })

    // Always advance to next occurrence since we're calculating the NEXT run
    // The cron may process items slightly before scheduled time (e.g., 21:30 for 21:33 scheduled)
    // so we need to always move forward, not stay on the same day
    switch (interval) {
        case 'DAILY':
            // If nextRun is in the past or very close to now, advance by 1 day
            if (nextRun <= baseTime.plus({ minutes: 5 })) {
                nextRun = nextRun.plus({ days: 1 })
            }
            break

        case 'WEEKLY':
            if (day_of_week && day_of_week.length > 0) {
                // For weekly, always find the next valid day
                if (nextRun <= baseTime.plus({ minutes: 5 })) {
                    nextRun = getNextWeeklyRun(nextRun, day_of_week, timezone)
                } else {
                    // Check if current day matches weekly constraints
                    const dayAbbrev = nextRun.toFormat('ccc')
                    if (!day_of_week.includes(dayAbbrev)) {
                        nextRun = getNextWeeklyRun(nextRun, day_of_week, timezone)
                    }
                }
            } else {
                if (nextRun <= baseTime.plus({ minutes: 5 })) {
                    nextRun = nextRun.plus({ weeks: 1 })
                }
            }
            break

        case 'MONTHLY':
            if (nextRun <= baseTime.plus({ minutes: 5 })) {
                nextRun = nextRun.plus({ months: 1 })
            }
            break

        default:
            throw new Error(`Unsupported interval: ${interval}`)
    }

    return nextRun.toUTC()
}

/**
 * Get the next valid weekly run based on specified days of the week
 */
function getNextWeeklyRun(fromTime: DateTime, dayOfWeek: string[], timezone: string): DateTime {
    const dayMap: Record<string, number> = {
        'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6, 'Su': 7
    }

    // Get current day of week (1 = Monday, 7 = Sunday in luxon)
    const currentDay = fromTime.weekday

    // Find the next valid day
    for (const day of dayOfWeek) {
        const targetDay = dayMap[day]
        if (!targetDay) continue

        let daysToAdd = targetDay - currentDay
        if (daysToAdd <= 0) {
            daysToAdd += 7 // Move to next week
        }

        const candidateTime = fromTime.plus({ days: daysToAdd })

        // Check if this candidate is in the future
        if (candidateTime > fromTime) {
            return candidateTime
        }
    }

    // If no valid day found this week, take the first day next week
    const firstDay = dayOfWeek[0]
    const firstDayNum = dayMap[firstDay]
    const daysToAdd = (firstDayNum - currentDay + 7) % 7 || 7
    return fromTime.plus({ days: daysToAdd })
}

/**
 * Validate a schedule configuration
 */
export function validateSchedule(schedule: ScheduleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate interval
    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(schedule.interval)) {
        errors.push(`Invalid interval: ${schedule.interval}`)
    }

    // Validate send_time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(schedule.send_time)) {
        errors.push(`Invalid send_time format: ${schedule.send_time}. Expected HH:MM (24-hour format)`)
    }

    // Validate timezone
    try {
        DateTime.now().setZone(schedule.timezone)
    } catch {
        errors.push(`Invalid timezone: ${schedule.timezone}`)
    }

    // Validate day_of_week for weekly schedules
    if (schedule.interval === 'WEEKLY') {
        if (!schedule.day_of_week || schedule.day_of_week.length === 0) {
            errors.push('day_of_week is required for WEEKLY schedules')
        } else {
            const validDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
            for (const day of schedule.day_of_week) {
                if (!validDays.includes(day)) {
                    errors.push(`Invalid day_of_week: ${day}. Valid values: ${validDays.join(', ')}`)
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Calculate all upcoming run times within a given period
 */
export function getUpcomingRuns(
    schedule: ScheduleConfig,
    count: number = 5,
    fromTime?: DateTime
): DateTime[] {
    const runs: DateTime[] = []
    let currentTime = fromTime || DateTime.now()

    for (let i = 0; i < count; i++) {
        const nextRun = calculateNextRun(schedule, currentTime)
        runs.push(nextRun)
        currentTime = nextRun.plus({ minutes: 1 }) // Add 1 minute to avoid infinite loop
    }

    return runs
}

/**
 * Format a DateTime for display in the user's timezone
 */
export function formatRunTime(runTime: DateTime, userTimezone: string): string {
    return runTime.setZone(userTimezone).toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')
}

/**
 * Check if a schedule should run now (within a tolerance window)
 */
export function shouldRunNow(
    scheduledTime: DateTime,
    toleranceMinutes: number = 5
): boolean {
    const now = DateTime.now().toUTC()
    const diffMinutes = scheduledTime.diff(now, 'minutes').minutes
    return Math.abs(diffMinutes) <= toleranceMinutes
}
