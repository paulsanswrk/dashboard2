<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Reporting Builder</h2>
      <div class="space-x-2">
        <button class="px-3 py-2 border rounded" @click="onTestPreview">Test Preview</button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <h3 class="font-medium mb-2">Zones</h3>
        <div class="space-y-2">
          <div class="p-3 border rounded bg-gray-50">X (Dimensions): <span class="text-gray-500">Drag fields here (stub)</span></div>
          <div class="p-3 border rounded bg-gray-50">Y (Metrics): <span class="text-gray-500">Drag fields here (stub)</span></div>
          <div class="p-3 border rounded bg-gray-50">Filters: <span class="text-gray-500">Add filters (stub)</span></div>
          <div class="p-3 border rounded bg-gray-50">Breakdown: <span class="text-gray-500">Add breakdown (stub)</span></div>
        </div>
      </div>

      <div>
        <h3 class="font-medium mb-2">Preview</h3>
        <ReportingPreview :loading="loading" :rows="rows" :columns="columns" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ReportingPreview from './ReportingPreview.vue'
import { useReportingService } from '../../composables/useReportingService'

const { runPreview, selectedDatasetId } = useReportingService()
const loading = ref(false)
const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])

async function onTestPreview() {
  loading.value = true
  try {
    const res = await runPreview({
      datasetId: selectedDatasetId.value || 'mock_dataset',
      xDimensions: [],
      yMetrics: [],
      filters: [],
      breakdowns: [],
      limit: 10
    })
    rows.value = res.rows
    columns.value = res.columns
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
</style>


