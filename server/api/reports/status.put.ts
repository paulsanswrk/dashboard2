import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
import {calculateNextRun} from '../../utils/schedulingUtils'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const body = await readBody(event)
    const {id, currentStatus} = body || {}

    // Validation
    if (!id) {
        throw createError({statusCode: 400, statusMessage: 'Report ID is required'})
    }

    if (!currentStatus || !['Active', 'Paused'].includes(currentStatus)) {
        throw createError({statusCode: 400, statusMessage: 'Valid current status is required (Active or Paused)'})
    }

    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active'

    try {
        // Verify the user owns this report and get current data
        const {data: existingReport, error: fetchError} = await supabaseAdmin
            .from('reports')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !existingReport) {
            throw createError({statusCode: 404, statusMessage: 'Report not found or access denied'})
        }

        // Calculate next run time (only needed when activating)
        let nextRunTime = null
        if (newStatus === 'Active') {
            const nextRunDateTime = calculateNextRun({
                interval: existingReport.interval,
                send_time: existingReport.send_time,
                timezone: existingReport.timezone,
                day_of_week: existingReport.interval === 'WEEKLY' ? existingReport.day_of_week : undefined
            })

            if (!nextRunDateTime) {
                throw createError({statusCode: 400, statusMessage: 'Failed to calculate next run time'})
            }

            nextRunTime = nextRunDateTime.toISO()
        }

        // Update report status
        const {error: updateError} = await supabaseAdmin
            .from('reports')
            .update({
                status: newStatus,
                next_run_at: newStatus === 'Active' ? nextRunTime : null
            })
            .eq('id', id)
            .eq('user_id', user.id)

        if (updateError) {
            throw createError({statusCode: 500, statusMessage: `Failed to update report status: ${updateError.message}`})
        }

        // Handle email queue management based on status change
        if (newStatus === 'Active') {
            // When activating a report, ensure there's a pending email queue entry
            const {data: existingQueue} = await supabaseAdmin
                .from('email_queue')
                .select('id')
                .eq('report_id', id)
                .eq('delivery_status', 'PENDING')
                .limit(1)

            // Only create new queue entry if none exists
            if (!existingQueue || existingQueue.length === 0) {
                const {error: queueError} = await supabaseAdmin
                    .from('email_queue')
                    .insert({
                        report_id: id,
                        scheduled_for: nextRunTime,
                        delivery_status: 'PENDING'
                    })

                if (queueError) {
                    throw createError({statusCode: 500, statusMessage: `Failed to schedule report: ${queueError.message}`})
                }
            }
        } else {
            // When pausing a report, cancel any pending queue entries
            const {error: cancelError} = await supabaseAdmin
                .from('email_queue')
                .update({delivery_status: 'CANCELLED'})
                .eq('report_id', id)
                .eq('delivery_status', 'PENDING')

            if (cancelError) {
                throw createError({statusCode: 500, statusMessage: `Failed to cancel pending deliveries: ${cancelError.message}`})
            }
        }

        return {success: true, newStatus}

    } catch (error: any) {
        if (error.statusCode) throw error // Re-throw H3 errors
        throw createError({statusCode: 500, statusMessage: error.message || 'Internal server error'})
    }
})
