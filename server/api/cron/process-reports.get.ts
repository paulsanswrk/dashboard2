import {createClient} from '@supabase/supabase-js'
import {DateTime} from 'luxon'
import {calculateNextRun} from '../../utils/schedulingUtils'
import {generateReportAttachments} from '../../utils/reportGenerator'
import {sendReportEmail} from '../../utils/emailService'
import {LogAccumulator} from '../../utils/loggingUtils'

// Types for email queue processing
interface EmailQueueItem {
    id: string
    report_id: string
    scheduled_for: string
    delivery_status: string
    attempt_count: number
    error_message?: string
}

interface ReportConfig {
    id: string
    user_id: string
    report_title: string
    recipients: string[]
    email_subject: string
    email_message?: string
    scope: 'Dashboard' | 'Single Tab'
    dashboard_id?: string
    tab_id?: string
    time_frame: string
    formats: string[]
    interval: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    send_time: string
    timezone: string
    day_of_week?: string[]
    status: 'Active' | 'Paused'
    next_run_at?: string
}

export default defineEventHandler(async (event) => {
    const startTime = Date.now()
    let processedCount = 0
    let successCount = 0
    let failureCount = 0

    // Create log accumulator for batch logging
    const logAccumulator = new LogAccumulator()

    try {
        // Bypass authentication in local development when DEBUG_ENV=true
        if (process.env.DEBUG_ENV === 'true') {
            logAccumulator.addLog('debug', 'cron', 'Bypassing cron authentication for local development', {
                url: event.node.req.url,
                user_id: null
            })
        } else {
            // Only allow service role access (for Vercel cron jobs)
            const authHeader = getHeader(event, 'authorization')
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                logAccumulator.addLog('error', 'cron', 'Missing or invalid authorization header', {
                    url: event.node.req.url,
                    user_id: null
                })
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Unauthorized'
                })
            }

            // Verify the authorization header per Vercel docs
            const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`

            if (!process.env.CRON_SECRET || authHeader !== expectedAuthHeader) {
                logAccumulator.addLog('error', 'cron', 'Invalid authorization header', {
                    url: event.node.req.url,
                    auth_header_provided: !!authHeader,
                    expected_header_set: !!process.env.CRON_SECRET
                })
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Unauthorized'
                })
            }
        }

        logAccumulator.addLog('debug', 'cron', 'Starting report processing cron job', {
            url: event.node.req.url
        })

        // Get Supabase client with service role
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Find pending email queue items that should run now (within 5-minute window)
        const now = DateTime.now().toUTC()
        const fiveMinutesAgo = now.minus({minutes: 5})
        const fiveMinutesFromNow = now.plus({minutes: 5})

        const {data: pendingItems, error: queueError} = await supabase
            .from('email_queue')
            .select(`
        id,
        report_id,
        scheduled_for,
        delivery_status,
        attempt_count,
        error_message,
        reports!inner(
          id,
          user_id,
          report_title,
          recipients,
          email_subject,
          email_message,
          scope,
          dashboard_id,
          tab_id,
          time_frame,
          formats,
          interval,
          send_time,
          timezone,
          day_of_week,
          status,
          next_run_at
        )
      `)
            .eq('delivery_status', 'PENDING')
            .gte('scheduled_for', fiveMinutesAgo.toISO())
            .lte('scheduled_for', fiveMinutesFromNow.toISO())
            .order('scheduled_for', {ascending: true})

        if (queueError) {
            logAccumulator.addLog('error', 'cron', 'Failed to fetch pending email queue items', {
                error: queueError.message,
                url: event.node.req.url
            })
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to fetch pending items'
            })
        }

        if (!pendingItems || pendingItems.length === 0) {
            logAccumulator.addLog('debug', 'cron', 'No pending reports to process', {
                url: event.node.req.url
            })
            // Flush logs before returning
            await logAccumulator.flushLogs()
            return {
                success: true,
                message: 'No pending reports to process',
                processed: 0,
                successful: 0,
                failed: 0
            }
        }

        logAccumulator.addLog('debug', 'cron', `Found ${pendingItems.length} pending reports to process`, {
            url: event.node.req.url,
            count: pendingItems.length
        })

        // Process each pending item
        for (const item of pendingItems) {
            processedCount++
            const queueItem = item as any // Type assertion for the joined data
            const report = queueItem.reports as ReportConfig

            let reportOutcome = 'success'
            let reportError: string | undefined
            let reportDetails: any = {}

            try {
                // Mark as processing (to prevent duplicate processing)
                await supabase
                    .from('email_queue')
                    .update({
                        attempt_count: queueItem.attempt_count + 1,
                        processed_at: now.toISO()
                    })
                    .eq('id', queueItem.id)

                // Generate report attachments
                const attachments = await generateReportAttachments(report)
                reportDetails.attachments_generated = attachments.length

                // Send email with attachments
                const emailResult = await sendReportEmail({
                    to: report.recipients,
                    subject: report.email_subject,
                    message: report.email_message || '',
                    attachments,
                    reportTitle: report.report_title
                })

                if (!emailResult.success) {
                    // Email sending failed
                    reportOutcome = 'email_failed'
                    reportError = `Email sending failed: ${emailResult.error!.message}`
                    reportDetails.email_error = {
                        recipient_count: emailResult.error!.recipientCount,
                        subject: emailResult.error!.subject,
                        attachment_count: emailResult.error!.attachmentCount,
                        error_message: emailResult.error!.message
                    }
                    throw new Error(reportError)
                }

                // Mark as sent
                await supabase
                    .from('email_queue')
                    .update({
                        delivery_status: 'SENT',
                        processed_at: now.toISO()
                    })
                    .eq('id', queueItem.id)

                // Calculate and schedule next run if this is a recurring report
                if (report.status === 'Active') {
                    const nextRunTime = calculateNextRun({
                        interval: report.interval,
                        send_time: report.send_time,
                        timezone: report.timezone,
                        day_of_week: report.day_of_week
                    }, now)

                    await supabase
                        .from('email_queue')
                        .insert({
                            report_id: report.id,
                            scheduled_for: nextRunTime.toISO(),
                            delivery_status: 'PENDING'
                        })

                    // Update the report's next_run_at
                    await supabase
                        .from('reports')
                        .update({next_run_at: nextRunTime.toISO()})
                        .eq('id', report.id)

                    reportDetails.next_run_scheduled = nextRunTime.toISO()
                }

                successCount++
                reportDetails.recipients = report.recipients.length

            } catch (error: any) {
                failureCount++
                const errorMessage = error.message || 'Unknown error during report processing'

                reportOutcome = 'failed'
                reportError = errorMessage
                reportDetails.error = errorMessage
                reportDetails.stack = error.stack

                // Update queue item with failure
                const newAttemptCount = queueItem.attempt_count + 1
                const shouldRetry = newAttemptCount < 3 // Max 3 attempts

                await supabase
                    .from('email_queue')
                    .update({
                        delivery_status: shouldRetry ? 'PENDING' : 'FAILED',
                        attempt_count: newAttemptCount,
                        error_message: errorMessage,
                        processed_at: now.toISO()
                    })
                    .eq('id', queueItem.id)

                if (!shouldRetry) {
                    reportOutcome = 'max_retries_reached'
                    reportDetails.final_attempt = true
                }
            }

            // Single consolidated log entry per report
            const logLevel = reportOutcome === 'success' ? 'debug' : 'error'
            const logMessage = reportOutcome === 'success'
                ? `Report processed successfully: ${report.id}`
                : `Report processing failed: ${report.id} (${reportOutcome})`

            logAccumulator.addLog(logLevel, 'cron', logMessage, {
                report_id: report.id,
                user_id: report.user_id,
                queue_item_id: queueItem.id,
                outcome: reportOutcome,
                attempt_count: queueItem.attempt_count + 1,
                error: reportError,
                ...reportDetails
            })
        }

        const duration = Date.now() - startTime
        logAccumulator.addLog('debug', 'cron', `Cron job completed in ${duration}ms`, {
            url: event.node.req.url,
            processed: processedCount,
            successful: successCount,
            failed: failureCount,
            duration
        })

        // Flush all accumulated logs before returning
        await logAccumulator.flushLogs()

        return {
            success: true,
            message: `Processed ${processedCount} reports`,
            processed: processedCount,
            successful: successCount,
            failed: failureCount,
            duration
        }

    } catch (error: any) {
        const duration = Date.now() - startTime
        logAccumulator.addLog('error', 'cron', `Cron job failed after ${duration}ms: ${error.message}`, {
            error: error.message,
            stack: error.stack,
            processed: processedCount,
            successful: successCount,
            failed: failureCount,
            duration
        })

        // Flush logs even on error to capture what happened
        await logAccumulator.flushLogs()

        throw createError({
            statusCode: 500,
            statusMessage: `Cron job failed: ${error.message}`
        })
    }
})
