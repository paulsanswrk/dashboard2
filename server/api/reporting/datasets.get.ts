import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  // Stub datasets; to be replaced in Sprint 02 with Supabase-backed discovery
  return [
    { id: 'mock_dataset', name: 'mock_dataset', label: 'Mock Dataset' }
  ]
})


