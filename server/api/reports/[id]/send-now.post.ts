import { defineEventHandler, getRouterParam } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import { generateReportAttachments, type ReportConfig } from '../../../utils/reportGenerator'
import { sendReportEmail } from '../../../utils/emailService'
import { logReportProcessingSuccess, logReportProcessingFailure } from '../../../utils/loggingUtils'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

/**
 * POST /api/reports/:id/send-now
 * 
 * Triggers immediate delivery of a scheduled report.
 * This sends the report right away without waiting for the next scheduled time.
 */
export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const reportId = getRouterParam(event, 'id')
    if (!reportId) {
        throw createError({ statusCode: 400, statusMessage: 'Report ID is required' })
    }

    // Get the report and verify ownership
    const { data: report, error: reportError } = await supabaseAdmin
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('user_id', user.id)
        .single()

    if (reportError || !report) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Report not found or you do not have permission to access it'
        })
    }

    try {
        // Build the report configuration
        const reportConfig: ReportConfig = {
            id: report.id,
            user_id: report.user_id,
            report_title: report.report_title,
            scope: report.scope,
            dashboard_id: report.dashboard_id,
            tab_id: report.tab_id,
            time_frame: report.time_frame,
            formats: report.formats || ['PDF']
        }

        // Generate report attachments
        console.log(`[send-now] Generating attachments for report ${reportId}`)
        const attachments = await generateReportAttachments(reportConfig)

        if (attachments.length === 0) {
            throw new Error('No attachments were generated')
        }

        // Send the report email
        console.log(`[send-now] Sending email for report ${reportId} to ${report.recipients?.length || 0} recipients`)
        await sendReportEmail({
            to: report.recipients || [],
            subject: report.email_subject,
            message: report.email_message || '',
            reportTitle: report.report_title,
            attachments
        })

        // Log success (use 'manual-send' as queueItemId for manual sends)
        await logReportProcessingSuccess(
            report.id,
            'manual-send',
            user.id,
            attachments.length,
            report.recipients || []
        ).catch(e =>
            console.warn('[send-now] Failed to log success:', e)
        )

        console.log(`[send-now] Report ${reportId} sent successfully`)

        return {
            success: true,
            message: 'Report sent successfully',
            attachmentCount: attachments.length
        }
    } catch (error: any) {
        console.error(`[send-now] Error sending report ${reportId}:`, error)

        // Log failure (use 'manual-send' as queueItemId, 1 as attemptCount for manual sends)
        await logReportProcessingFailure(
            report.id,
            'manual-send',
            user.id,
            error.message || 'Unknown error',
            1
        ).catch(e =>
            console.warn('[send-now] Failed to log failure:', e)
        )

        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to send report'
        })
    }
})
