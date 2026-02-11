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

export type DashboardWidget = {
  widgetId: string
  type: 'chart' | 'text' | 'image' | 'icon'
  chartId?: number
  position: any
  configOverride?: any
  style?: any
  name?: string
  state?: any
  dataStatus?: 'cached' | 'pending'
  preloadedColumns?: Array<{ key: string; label: string }>
  preloadedRows?: Array<Record<string, unknown>>
}

export type DashboardTab = {
  id: string
  name: string
  position: number
  style?: any
  options?: any
  widgets: DashboardWidget[]
  widgetsLoaded?: boolean
}

export type DashboardFull = {
  id: string
  name: string
  isPublic: boolean
  password?: boolean // Boolean indicating if password is set
  createdAt: string
  width?: number | null
  height?: number | null
  thumbnailUrl?: string | null
  tabs: DashboardTab[]
}

export function useDashboardsService() {
  async function listDashboards(): Promise<Dashboard[]> {
    return await $fetch<Dashboard[]>('/api/dashboards')
  }

  async function getDashboard(id: string): Promise<{ id: string; name: string; created_at: string; charts: Array<{ chartId: number; name: string; position: any; state?: any }> }> {
    return await $fetch(`/api/dashboards/${id}`)
  }

  async function getDashboardFull(id: string, context?: string, activeTabId?: string): Promise<DashboardFull> {
    const params: Record<string, string> = {}
    if (context) params.context = context
    if (activeTabId) params.activeTabId = activeTabId
    return await $fetch(`/api/dashboards/${id}/full`, { params })
  }

  async function getDashboardPreview(id: string, authToken?: string): Promise<DashboardFull & { requiresPassword?: boolean }> {
    const params: any = {}
    if (authToken) {
      params.authToken = authToken
    }
    return await $fetch(`/api/dashboards/${id}/preview`, { params })
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
    layout?: Array<{ widgetId: string; position: any } | { chartId: number; position: any }>;
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
  /**
   * Fetch chart data for a specific chart within a dashboard.
   * Used for progressive loading - charts load their data independently.
   */
  async function getChartData(
    dashboardId: string,
    chartId: number,
    filters?: any[]
  ): Promise<{
    columns: Array<{ key: string; label: string }>;
    rows: Array<Record<string, unknown>>;
    meta?: { error?: string };
  }> {
    const params: any = {}
    if (filters?.length) {
      params.filterOverrides = JSON.stringify(filters)
    }
    return await $fetch(`/api/dashboards/${dashboardId}/charts/${chartId}/data`, { params })
  }

  return { listDashboards, getDashboard, getDashboardFull, getDashboardPreview, createDashboard, updateDashboard, deleteDashboard, createDashboardReport, getChartData }
}
