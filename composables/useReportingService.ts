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
    const { data, error } = await useFetch<Dataset[]>("/api/reporting/datasets")
    if (error.value) throw error.value
    return data.value || []
  }

  function setSelectedDatasetId(id: string) {
    selectedDatasetId.value = id
  }

  async function runPreview(payload: PreviewRequest): Promise<PreviewResponse> {
    const { data, error } = await useFetch<PreviewResponse>("/api/reporting/preview", {
      method: "POST",
      body: payload
    })
    if (error.value) throw error.value
    return data.value || { columns: [], rows: [] }
  }

  return { listDatasets, runPreview, setSelectedDatasetId, selectedDatasetId }
}


