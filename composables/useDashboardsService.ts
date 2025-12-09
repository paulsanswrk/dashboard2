export type Dashboard = {
  id: string
  name: string
    organization_id: string
    creator: string
  is_public: boolean
  password?: string
  created_at: string
    width?: number | null
    height?: number | null
    thumbnail_url?: string | null
}

export type DashboardReport = {
  dashboard_id: string
  chart_id: number
  position: any
  created_at: string
}

export function useDashboardsService() {
  async function listDashboards(): Promise<Dashboard[]> {
    return await $fetch<Dashboard[]>('/api/dashboards')
  }

  async function getDashboard(id: string): Promise<{ id: string; name: string; created_at: string; charts: Array<{ chartId: number; name: string; position: any; state?: any }> }> {
    return await $fetch(`/api/dashboards/${id}`)
  }

    async function getDashboardFull(id: string, context?: string): Promise<{
        id: string;
        name: string;
        isPublic: boolean;
        createdAt: string;
        charts: Array<{ id: number; name: string; position: any; state?: any; data?: { columns: any[]; rows: any[]; meta?: any } }>
    }> {
        const params = context ? {context} : {}
        return await $fetch(`/api/dashboards/${id}/full`, {params})
  }

  async function createDashboard(payload: {
    name: string
    isPublic?: boolean
    password?: string
  }): Promise<{ success: boolean; dashboardId: string }> {
    return await $fetch<{ success: boolean; dashboardId: string }>('/api/dashboards', {
      method: 'POST',
      body: payload
    })
  }

    async function updateDashboard(payload: {
        id: string;
        name?: string;
        layout?: Array<{ chartId: number; position: any }>;
        width?: number | null;
        height?: number | null;
        thumbnailBase64?: string | null
    }): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/dashboards', {
      method: 'PUT',
      body: payload
    })
  }

  async function deleteDashboard(id: string): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/dashboards', {
      method: 'DELETE',
      params: { id }
    })
  }

  async function createDashboardReport(payload: {
    dashboardId: string
    chartId: number
    position: any
      tabId?: string
  }): Promise<{ success: boolean }> {
    return await $fetch<{ success: boolean }>('/api/dashboard-reports', {
      method: 'POST',
      body: {
        dashboardId: payload.dashboardId,
        chartId: payload.chartId,
          position: payload.position,
          tabId: payload.tabId
      }
    })
  }

  return { listDashboards, getDashboard, getDashboardFull, createDashboard, updateDashboard, deleteDashboard, createDashboardReport }
}
