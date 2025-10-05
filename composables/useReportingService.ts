import { ref } from 'vue'

type Dataset = { id: string; name: string; label?: string }
type PreviewRequest = {
  datasetId: string
  xDimensions: Array<any>
  yMetrics: Array<any>
  filters: Array<any>
  breakdowns: Array<any>
  limit?: number
}

type PreviewResponse = {
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, unknown>>
  meta?: Record<string, unknown>
}

const selectedDatasetId = ref<string | null>(null)

export function useReportingService() {
  async function listDatasets(): Promise<Dataset[]> {
    return await $fetch<Dataset[]>("/api/reporting/datasets")
  }

  function setSelectedDatasetId(id: string) {
    selectedDatasetId.value = id
  }

  async function getSchema(datasetId: string): Promise<any[]> {
    return await $fetch<any[]>(`/api/reporting/schema`, { params: { datasetId } })
  }

  async function getRelationships(datasetId: string): Promise<any[]> {
    return await $fetch<any[]>(`/api/reporting/relationships`, { params: { datasetId } })
  }

  async function runPreview(payload: PreviewRequest): Promise<PreviewResponse> {
    return await $fetch<PreviewResponse>("/api/reporting/preview", { method: "POST", body: payload })
  }

  async function runSql(sql: string, limit?: number): Promise<PreviewResponse> {
    return await $fetch<PreviewResponse>("/api/reporting/sql", { method: "POST", body: { sql, limit } })
  }

  return { listDatasets, getSchema, getRelationships, runPreview, runSql, setSelectedDatasetId, selectedDatasetId }
}


