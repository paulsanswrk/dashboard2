import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { datasetId } = getQuery(event)
  // Stub schema; real discovery in Sprint 02
  if (!datasetId) {
    return []
  }
  return [
    { fieldId: 'category', name: 'category', label: 'Category', type: 'text', isString: true },
    { fieldId: 'value', name: 'value', label: 'Value', type: 'number', isNumeric: true }
  ]
})


