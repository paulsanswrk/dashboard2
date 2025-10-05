<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Reporting Builder</h2>
      <div class="space-x-2">
        <button class="px-3 py-2 border rounded" @click="onTestPreview" :disabled="!selectedDatasetId">Test Preview</button>
        <button class="px-3 py-2 border rounded" @click="onUndo" :disabled="!canUndo">Undo</button>
        <button class="px-3 py-2 border rounded" @click="onRedo" :disabled="!canRedo">Redo</button>
        <button class="px-3 py-2 border rounded" @click="openReports = true">Save / Load</button>
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
        <div class="flex items-center gap-3 mb-3">
          <label class="text-sm">Chart Type</label>
          <select v-model="chartType" class="border rounded px-2 py-1">
            <option value="table">Table</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="donut">Donut</option>
            <option value="kpi">KPI</option>
          </select>
          <label class="text-sm ml-4">Custom SQL</label>
          <input type="checkbox" v-model="useSql" />
        </div>
        <div v-if="useSql" class="mb-3">
          <textarea v-model="sqlText" class="w-full h-32 border rounded p-2 font-mono text-xs" placeholder="SELECT * FROM your_table LIMIT 100"></textarea>
          <div class="mt-2 space-x-2">
            <button class="px-3 py-1 border rounded" @click="onRunSql">Run SQL</button>
            <span class="text-xs text-gray-500">Only SELECT queries allowed; LIMIT enforced.</span>
          </div>
        </div>
        <component :is="chartComponent" :key="chartType"
                   :columns="columns" :rows="rows"
                   :x-dimensions="xDimensions" :breakdowns="breakdowns" :y-metrics="yMetrics"
                   :chart-type="chartType" :appearance="appearance" :loading="loading" />
      </div>
    </div>
    <ReportsModal :open="openReports" @close="openReports=false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ReportingChart from './ReportingChart.vue'
import ReportsModal from './ReportsModal.vue'
import ReportingPreview from './ReportingPreview.vue'
import { useReportingService } from '../../composables/useReportingService'
import { useReportState } from '../../composables/useReportState'

const { runPreview, runSql, selectedDatasetId } = useReportingService()
const { xDimensions, yMetrics, filters, breakdowns, appearance, undo, redo, canUndo, canRedo } = useReportState()
const loading = ref(false)
const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const chartType = ref<'table' | 'bar' | 'line' | 'pie' | 'donut' | 'kpi'>('table')
const chartComponent = computed(() => chartType.value === 'table' ? ReportingPreview : ReportingChart)
const openReports = ref(false)
const useSql = ref(false)
const sqlText = ref('')

async function onTestPreview() {
  if (!selectedDatasetId.value) return
  loading.value = true
  try {
    const res = await runPreview({
      datasetId: selectedDatasetId.value,
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      filters: filters.value,
      breakdowns: breakdowns.value,
      limit: 100
    })
    rows.value = res.rows
    columns.value = res.columns
  } finally {
    loading.value = false
  }
}

// Auto preview on state change (debounced by Vue batching)
const canAutoPreview = computed(() => !!selectedDatasetId.value)
watch([selectedDatasetId, xDimensions, yMetrics, filters, breakdowns], async () => {
  if (!canAutoPreview.value) return
  if (useSql.value) return
  await onTestPreview()
})

function onUndo() { undo() }
function onRedo() { redo() }

async function onRunSql() {
  loading.value = true
  try {
    const res = await runSql(sqlText.value)
    rows.value = res.rows
    columns.value = res.columns
    chartType.value = 'table'
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
</style>


