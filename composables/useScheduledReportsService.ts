export type ScheduledReport = {
  id: string
  created_at: string
  user_id: string
  report_title: string
  recipients: any[]
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
}

export type EmailQueueItem = {
  id: string
  report_id: string
  scheduled_for: string
  delivery_status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  attempt_count: number
  error_message?: string
  processed_at?: string
}

export function useScheduledReportsService() {
  async function listReports(): Promise<ScheduledReport[]> {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async function getReport(id: string): Promise<ScheduledReport | null> {
    // Use server API to bypass RLS - server uses Service Role
    const data = await $fetch<ScheduledReport>('/api/reports', {
      query: { id }
    })
    return data || null
  }

  async function createReport(reportData: Omit<ScheduledReport, 'id' | 'created_at'>): Promise<{ success: boolean; reportId: string }> {
    const supabase = useSupabaseClient()

    const { data, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select('id')
      .single()

    if (error) throw error
    return { success: true, reportId: data.id }
  }

  async function updateReport(id: string, updates: Partial<ScheduledReport>): Promise<{ success: boolean }> {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }

  async function deleteReport(id: string): Promise<{ success: boolean }> {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }

  async function toggleReportStatus(id: string, currentStatus: string): Promise<{ success: boolean; newStatus: string }> {
    const { error } = await $fetch('/api/reports/status', {
      method: 'PUT',
      body: { id, currentStatus }
    })

    if (error) throw error
    return { success: true, newStatus: currentStatus === 'Active' ? 'Paused' : 'Active' }
  }

  async function getEmailQueueForReport(reportId: string): Promise<EmailQueueItem[]> {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('report_id', reportId)
      .eq('delivery_status', 'PENDING')
      .order('scheduled_for', { ascending: true })
      .limit(1)

    if (error) throw error
    return data || []
  }

  async function listEmailQueue(statusFilter?: string, page = 1, pageSize = 50): Promise<{ items: EmailQueueItem[], total: number }> {
    const supabase = useSupabaseClient()

    let query = supabase
      .from('email_queue')
      .select(`
        *,
        reports!inner(report_title)
      `, { count: 'exact' })
      .order('scheduled_for', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (statusFilter) {
      query = query.eq('delivery_status', statusFilter)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { items: data || [], total: count || 0 }
  }

  async function createEmailQueueEntry(reportId: string, scheduledFor: string): Promise<{ success: boolean }> {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('email_queue')
      .insert({
        report_id: reportId,
        scheduled_for: scheduledFor,
        delivery_status: 'PENDING'
      })

    if (error) throw error
    return { success: true }
  }

  return {
    listReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
    toggleReportStatus,
    getEmailQueueForReport,
    listEmailQueue,
    createEmailQueueEntry
  }
}
