import { defineEventHandler, readBody } from 'h3'

type PreviewRequest = {
  datasetId: string
  xDimensions: any[]
  yMetrics: any[]
  filters: any[]
  breakdowns: any[]
  limit?: number
}

export default defineEventHandler(async (event) => {
  const _body = await readBody<PreviewRequest>(event)
  // Return mock data to validate end-to-end wiring
  return {
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'value', label: 'Value' }
    ],
    rows: [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
      { category: 'C', value: 15 }
    ],
    meta: { executionMs: 5, source: 'mock' }
  }
})


