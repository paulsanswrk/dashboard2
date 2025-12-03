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
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    id,
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
    status
  } = body || {}

  // Validation
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Report ID is required' })
  }

  if (!report_title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Report title is required' })
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one recipient is required' })
  }

  if (!email_subject?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Email subject is required' })
  }

  // Validate content based on scope
  if (scope === 'Dashboard' && !dashboard_id) {
    throw createError({ statusCode: 400, statusMessage: 'Dashboard selection is required' })
  }
    if (scope === 'Single Tab' && !tab_id) {
        throw createError({statusCode: 400, statusMessage: 'Tab selection is required'})
  }

  if (!Array.isArray(formats) || formats.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one export format is required' })
  }

  if (!send_time) {
    throw createError({ statusCode: 400, statusMessage: 'Send time is required' })
  }

  if (!timezone) {
    throw createError({ statusCode: 400, statusMessage: 'Timezone is required' })
  }

  if (interval === 'WEEKLY' && (!Array.isArray(day_of_week) || day_of_week.length === 0)) {
    throw createError({ statusCode: 400, statusMessage: 'At least one day of the week must be selected for weekly reports' })
  }

    if (!status || !['Active', 'Paused'].includes(status)) {
        throw createError({statusCode: 400, statusMessage: 'Valid status is required (Active or Paused)'})
  }

  try {
    // Verify the user owns this report
    const { data: existingReport, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingReport) {
      throw createError({ statusCode: 404, statusMessage: 'Report not found or access denied' })
    }

    // Calculate new next run time
      const nextRunDateTime = calculateNextRun({
      interval,
      send_time,
      timezone,
      day_of_week: interval === 'WEEKLY' ? day_of_week : undefined
    })

      if (!nextRunDateTime) {
      throw createError({ statusCode: 400, statusMessage: 'Failed to calculate next run time' })
    }

      const nextRunTime = nextRunDateTime.toISO()

    // Update report using service role (bypasses RLS)
    const { error: reportError } = await supabaseAdmin
      .from('reports')
      .update({
        report_title: report_title.trim(),
        recipients,
        email_subject: email_subject.trim(),
        email_message: email_message?.trim() || null,
        scope,
        dashboard_id: scope === 'Dashboard' ? dashboard_id : null,
          tab_id: scope === 'Single Tab' ? tab_id : null,
        time_frame,
        formats,
        interval,
        send_time,
        timezone,
        day_of_week: interval === 'WEEKLY' ? day_of_week : null,
          status,
          next_run_at: status === 'Active' ? nextRunTime : null
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (reportError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to update report: ${reportError.message}` })
    }

      // Handle email queue management based on status change
      if (status === 'Active') {
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

    return { success: true, reportId: id }

  } catch (error: any) {
    if (error.statusCode) throw error // Re-throw H3 errors
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal server error' })
  }
})

