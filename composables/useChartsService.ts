export type SavedChart = {
  id: number
  name: string
  description?: string
  ownerEmail?: string
  createdAt?: string
  updatedAt?: string
  state?: any
    width?: number | null
    height?: number | null
    thumbnailUrl?: string | null
}

export function useChartsService() {
    type CreateChartPayload = {
        name: string
        description?: string
        state: any
        width?: number | null
        height?: number | null
        thumbnailBase64?: string | null
    }

  async function listCharts(): Promise<SavedChart[]> {
    return await $fetch<SavedChart[]>('/api/reporting/charts')
  }
  async function getChart(id: number): Promise<SavedChart | null> {
    return await $fetch<SavedChart | null>('/api/reporting/charts', { params: { id } })
  }

    async function createChart(payload: CreateChartPayload): Promise<{ success: boolean; chartId: number }> {
    return await $fetch<{ success: boolean; chartId: number }>('/api/reporting/charts', { method: 'POST', body: payload })
  }

    async function updateChart(payload: { id: number; name?: string; description?: string; state?: any; width?: number | null; height?: number | null; thumbnailBase64?: string | null }): Promise<{
        success: boolean
    }> {
    return await $fetch<{ success: boolean }>('/api/reporting/charts', { method: 'PUT', body: payload })
  }
  async function deleteChart(id: number): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/reporting/charts', { method: 'DELETE', params: { id } })
  }
  return { listCharts, getChart, createChart, updateChart, deleteChart }
}
