<template>
  <div class="w-full h-full">

    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-3 text-gray-500">Loading chart...</span>
    </div>
    <div v-else-if="error" class="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
      <strong>Chart Error:</strong> {{ error }}
      <br><small>Chart Type: {{ chartType }}, State: {{ JSON.stringify(props.state, null, 2) }}</small>
    </div>
    <div v-else-if="!rows || rows.length === 0" class="flex items-center justify-center h-full text-gray-500">
      <div class="text-center">
        <div class="text-lg mb-2">📊</div>
        <div>No data available</div>
        <small class="text-xs">Chart Type: {{ chartType }}, Rows: {{ rows?.length || 0 }}</small>
      </div>
    </div>
    <div v-else>
      <component :is="chartComponent" :key="chartType"
                 :loading="loading"
                 :columns="columns" :rows="rows"
                 :x-dimensions="xDimensions" :breakdowns="breakdowns" :y-metrics="yMetrics"
                 :chart-type="chartType" :appearance="appearance" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import ReportingChart from './reporting/ReportingChart.vue'
import ReportingPreview from './reporting/ReportingPreview.vue'
import { useReportingService } from '../composables/useReportingService'

const props = defineProps<{
  state: any
  preloadedColumns?: Array<{ key: string; label: string }>
  preloadedRows?: Array<Record<string, unknown>>
}>()

const { runPreview, runSql } = useReportingService()

const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const error = ref<string | null>(null)
const loading = ref(true)

const chartType = computed(() => props.state?.chartType || 'table')
const appearance = computed(() => props.state?.appearance || {})
const xDimensions = computed(() => props.state?.xDimensions || [])
const yMetrics = computed(() => props.state?.yMetrics || [])
const breakdowns = computed(() => props.state?.breakdowns || [])

const chartComponent = computed(() =>
  chartType.value === 'table' ? ReportingPreview : ReportingChart
)

async function loadData() {
  error.value = null
  loading.value = true
  try {
    if (props.preloadedColumns && props.preloadedRows) {
      columns.value = props.preloadedColumns
      rows.value = props.preloadedRows
      loading.value = false
      return
    }
    if (props.state?.useSql) {
      const sql = props.state?.actualExecutedSql || props.state?.sqlText || ''
      const connectionId = props.state?.dataConnectionId ?? null
      if (!sql) { error.value = 'Missing SQL for chart'; loading.value = false; return }
      const res = await runSql(sql, undefined, connectionId)
      rows.value = res.rows
      columns.value = res.columns
      loading.value = false
      return
    }

    const datasetId = props.state?.selectedDatasetId
    const connectionId = props.state?.dataConnectionId ?? null
    if (!datasetId) { error.value = 'Missing dataset for chart'; loading.value = false; return }
    const res = await runPreview({
      datasetId,
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      filters: props.state?.filters || [],
      breakdowns: breakdowns.value,
      joins: props.state?.joins || [],
      limit: 100,
      connectionId
    })
    rows.value = res.rows
    columns.value = res.columns
    loading.value = false
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Failed to load chart data'
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
</style>


