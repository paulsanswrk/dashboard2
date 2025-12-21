import {describe, it, expect} from 'vitest'
import {
    calculateNextRun,
    validateSchedule,
    type ScheduleConfig
} from '../server/utils/schedulingUtils'
import {DateTime} from 'luxon'

describe('Scheduling Utils - Next Run Time Calculations', () => {
    const baseTime = DateTime.fromISO('2025-11-24T10:30:00.000Z') // Monday, November 24, 2025, 10:30 AM UTC

    describe('calculateNextRun - Basic Functionality', () => {
        it('should calculate next run for daily schedule in the future', () => {
            const schedule: ScheduleConfig = {
                interval: 'DAILY',
                send_time: '14:00', // 2:00 PM
                timezone: 'America/New_York'
            }

            const result = calculateNextRun(schedule, baseTime)

            // Should be today at 2:00 PM EST (which is 7:00 PM UTC)
            expect(result.toUTC().toFormat('yyyy-MM-dd HH:mm')).toBe('2025-11-24 19:00')
            expect(result.zoneName).toBe('UTC')
        })

        it('should calculate next run for daily schedule in the past', () => {
            const schedule: ScheduleConfig = {
                interval: 'DAILY',
                send_time: '08:00', // 8:00 AM - already passed today
                timezone: 'America/New_York'
            }

            // Use a time after 8:00 AM EST has passed
            const pastTime = DateTime.fromISO('2025-11-24T15:00:00.000Z') // 10:00 AM EST / 3:00 PM UTC
            const result = calculateNextRun(schedule, pastTime)

            // Should be tomorrow at 8:00 AM EST (1:00 PM UTC)
            expect(result.toUTC().toFormat('yyyy-MM-dd HH:mm')).toBe('2025-11-25 13:00')
        })

        it('should handle weekly schedules with specific days', () => {
            const schedule: ScheduleConfig = {
                interval: 'WEEKLY',
                send_time: '09:00',
                timezone: 'America/New_York',
                day_of_week: ['We', 'Fr'] // Wednesday, Friday
            }

            const result = calculateNextRun(schedule, baseTime)

            // Next Wednesday (Nov 26) at 9:00 AM EST (2:00 PM UTC)
            expect(result.toUTC().toFormat('yyyy-MM-dd HH:mm')).toBe('2025-11-26 14:00')
        })
    })

    describe('validateSchedule - Input Validation', () => {
        it('should validate correct daily schedule', () => {
            const schedule: ScheduleConfig = {
                interval: 'DAILY',
                send_time: '14:30',
                timezone: 'America/New_York'
            }

            const result = validateSchedule(schedule)
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should reject invalid interval', () => {
            const schedule = {
                interval: 'INVALID' as any,
                send_time: '10:00',
                timezone: 'UTC'
            }

            const result = validateSchedule(schedule)
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('Invalid interval: INVALID')
        })

        it('should require day_of_week for weekly schedules', () => {
            const schedule: ScheduleConfig = {
                interval: 'WEEKLY',
                send_time: '10:00',
                timezone: 'UTC'
                // Missing day_of_week
            }

            const result = validateSchedule(schedule)
            expect(result.valid).toBe(false)
            expect(result.errors).toContain('day_of_week is required for WEEKLY schedules')
        })
    })

    describe('Database Configuration Tests', () => {
        it('should handle report configuration with all required fields', () => {
            const schedule: ScheduleConfig = {
                interval: 'WEEKLY',
                send_time: '09:00',
                timezone: 'America/New_York',
                day_of_week: ['Mo', 'Th']
            }

            const result = validateSchedule(schedule)
            expect(result.valid).toBe(true)

            const nextRun = calculateNextRun(schedule, baseTime)
            expect(nextRun.isValid).toBe(true)
            expect(nextRun.zoneName).toBe('UTC')
        })

        it('should handle paused reports (calculation still works)', () => {
            const schedule: ScheduleConfig = {
                interval: 'DAILY',
                send_time: '09:00',
                timezone: 'UTC'
            }

            const nextRun = calculateNextRun(schedule, baseTime)
            expect(nextRun.isValid).toBe(true)
        })
    })
})
