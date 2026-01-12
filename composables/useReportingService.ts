import { ref } from 'vue'

type Dataset = { id: string; name: string; label?: string }
type PreviewRequest = {
  datasetId: string
  xDimensions: Array<any>
  yMetrics: Array<any>
  filters: Array<any>
  breakdowns: Array<any>
  joins?: Array<any>
  limit?: number
  connectionId?: number | null
}

type PreviewResponse = {
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, unknown>>
  meta?: Record<string, unknown>
}

const selectedDatasetId = ref<string | null>(null)
const selectedConnectionId = ref<number | null>(null)

export function useReportingService() {
  async function listDatasets(): Promise<Dataset[]> {
    return await $fetch<Dataset[]>("/api/reporting/datasets")
  }

  function setSelectedDatasetId(id: string | null) {
    selectedDatasetId.value = id
  }

  async function getSchema(datasetId: string): Promise<any[]> {
    const params: any = { datasetId }
    if (selectedConnectionId.value) params.connectionId = selectedConnectionId.value
    return await $fetch<any[]>(`/api/reporting/schema`, { params })
  }

  async function getRelationships(datasetId: string): Promise<any[]> {
    const params: any = { datasetId }
    if (selectedConnectionId.value) params.connectionId = selectedConnectionId.value
    return await $fetch<any[]>(`/api/reporting/relationships`, { params })
  }

  async function runPreview(payload: any): Promise<PreviewResponse> {
    const body = {
      ...payload,
      // Prefer explicit payload.connectionId; otherwise fall back to selectedConnectionId
      connectionId: payload?.connectionId ?? selectedConnectionId.value ?? null
    }
    console.log('[runPreview] Making API call, datasetId:', body.datasetId, 'timestamp:', Date.now())
    return await $fetch<PreviewResponse>("/api/reporting/preview", {
      method: "POST",
      body,
      timeout: 60000  // 60 seconds
    })
  }

  async function runSql(sql: string, limit?: number, connectionId?: number | null): Promise<PreviewResponse> {
    return await $fetch<PreviewResponse>("/api/reporting/sql", {
      method: "POST",
      body: {
        sql,
        limit,
        connectionId: connectionId ?? selectedConnectionId.value ?? null
      }
    })
  }

  async function listConnections(): Promise<Array<{ id: number; internal_name: string }>> {
    return await $fetch("/api/reporting/connections")
  }

  function setSelectedConnectionId(id: number | null) {
    selectedConnectionId.value = id
  }

  return { listConnections, listDatasets, getSchema, getRelationships, runPreview, runSql, setSelectedDatasetId, selectedDatasetId, selectedConnectionId, setSelectedConnectionId }
}


