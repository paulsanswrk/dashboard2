export type SavedReport = {
  id: number
  name: string
  description?: string
  ownerEmail?: string
  createdAt?: string
  updatedAt?: string
  state?: any
}

export function useReportsService() {
  async function listReports(): Promise<SavedReport[]> {
    return await $fetch<SavedReport[]>('/api/reporting/reports')
  }
  async function getReport(id: number): Promise<SavedReport | null> {
    return await $fetch<SavedReport | null>('/api/reporting/reports', { params: { id } })
  }
  async function createReport(payload: { name: string; description?: string; state: any }): Promise<{ success: boolean; reportId: number }> {
    return await $fetch<{ success: boolean; reportId: number }>('/api/reporting/reports', { method: 'POST', body: payload })
  }
  async function updateReport(payload: { id: number; name?: string; description?: string; state?: any }): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/reporting/reports', { method: 'PUT', body: payload })
  }
  async function deleteReport(id: number): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/reporting/reports', { method: 'DELETE', params: { id } })
  }
  return { listReports, getReport, createReport, updateReport, deleteReport }
}


