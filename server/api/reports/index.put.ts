import {defineEventHandler, readBody} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
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

  if (!status || !['Active', 'Paused', 'Draft'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid status is required (Active, Paused, or Draft)' })
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
    const nextRunTime = calculateNextRunTime({
      interval,
      send_time,
      timezone,
      day_of_week: interval === 'WEEKLY' ? day_of_week : undefined
    })

    if (!nextRunTime) {
      throw createError({ statusCode: 400, statusMessage: 'Failed to calculate next run time' })
    }

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
        status
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (reportError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to update report: ${reportError.message}` })
    }

    // Update email queue entry - delete existing and create new one
    // First, delete existing queue entries for this report
    await supabaseAdmin
      .from('email_queue')
      .delete()
      .eq('report_id', id)

    // Create new email queue entry
    const { error: queueError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        report_id: id,
        scheduled_for: nextRunTime,
        delivery_status: 'PENDING'
      })

    if (queueError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to reschedule report: ${queueError.message}` })
    }

    return { success: true, reportId: id }

  } catch (error: any) {
    if (error.statusCode) throw error // Re-throw H3 errors
    throw createError({ statusCode: 500, statusMessage: error.message || 'Internal server error' })
  }
})

// Calculate next run time helper function
function calculateNextRunTime(config: any) {
  try {
    const now = new Date()
    const [hours, minutes] = config.send_time.split(':').map(Number)

    // Create target time in user's timezone
    const targetTime = new Date(now)
    targetTime.setHours(hours, minutes, 0, 0)

    // If target time is in the past today, move to tomorrow/next occurrence
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }

    // Handle weekly scheduling
    if (config.interval === 'WEEKLY' && config.day_of_week?.length > 0) {
      const dayMap = { 'Su': 0, 'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6 }
      const targetDays = config.day_of_week.map((d: string) => dayMap[d]).sort()

      for (const targetDay of targetDays) {
        const candidate = new Date(targetTime)
        const currentDay = candidate.getDay()

        if (currentDay <= targetDay) {
          candidate.setDate(candidate.getDate() + (targetDay - currentDay))
        } else {
          candidate.setDate(candidate.getDate() + (7 - currentDay + targetDay))
        }

        if (candidate > now) {
          targetTime.setTime(candidate.getTime())
          break
        }
      }
    }

    // Handle monthly scheduling
    if (config.interval === 'MONTHLY') {
      targetTime.setMonth(targetTime.getMonth() + 1)
      targetTime.setDate(1) // First day of next month at specified time
    }

    return targetTime.toISOString()
  } catch (error) {
    console.error('Error calculating next run time:', error)
    return null
  }
}
