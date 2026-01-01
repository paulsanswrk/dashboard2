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
import {computed, onMounted, ref, watch} from 'vue'
import ReportingChart from './reporting/ReportingChart.vue'
import ReportingPreview from './reporting/ReportingPreview.vue'
import {useReportingService} from '../composables/useReportingService'

import type {TabStyleOptions} from '~/types/tab-options'

interface DashboardFilterCondition {
  fieldId: string
  table: string
  type: string
  operator: string
  value: any
  values?: any[]
}

const props = defineProps<{
  state: any
  preloadedColumns?: Array<{ key: string; label: string }>
  preloadedRows?: Array<Record<string, unknown>>
  configOverride?: any
  dashboardFilters?: DashboardFilterCondition[]
  tabStyle?: TabStyleOptions
}>()

const { runPreview, runSql } = useReportingService()

const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const error = ref<string | null>(null)
const loading = ref(true)

function mergeAppearance(base: any, override: any) {
  return {
    ...(base || {}),
    ...(override || {}),
    numberFormat: {
      ...(base?.numberFormat || {}),
      ...(override?.numberFormat || {})
    }
  }
}

function mergeState(state: any, override: any) {
  if (!override) return state
  const merged = {...(state || {}), ...(override || {})}
  merged.appearance = mergeAppearance(state?.appearance, override?.appearance)
  return merged
}

const effectiveState = computed(() => {
  const merged = mergeState(props.state, props.configOverride)

  // Apply tab styles if available
  if (props.tabStyle?.seriesColors && props.tabStyle.seriesColors.length > 0) {
    if (!merged.appearance) merged.appearance = {}

    // Only apply tab palette if chart doesn't have a specific palette set
    // or if the chart is using default colors
    if (!merged.appearance.palette || merged.appearance.palette.length === 0) {
      merged.appearance.palette = props.tabStyle.seriesColors
    }
  }

  return merged
})

const chartType = computed(() => effectiveState.value?.chartType || 'table')
const appearance = computed(() => effectiveState.value?.appearance || {})
const xDimensions = computed(() => effectiveState.value?.xDimensions || [])
const yMetrics = computed(() => effectiveState.value?.yMetrics || [])
const breakdowns = computed(() => effectiveState.value?.breakdowns || [])

const chartComponent = computed(() =>
  chartType.value === 'table' ? ReportingPreview : ReportingChart
)

// Convert dashboard filter to chart filter format
function convertDashboardFilter(df: DashboardFilterCondition): any {
  return {
    field: df.fieldId,
    table: df.table,
    operator: df.operator,
    value: df.values || df.value,
    type: df.type
  }
}

// Merge chart-level filters with dashboard filters
function getMergedFilters(chartFilters: any[]): any[] {
  const dashFilters = (props.dashboardFilters || []).map(convertDashboardFilter)
  return [...(chartFilters || []), ...dashFilters]
}

async function loadData() {
  error.value = null
  loading.value = true
  try {
    if (props.preloadedColumns && props.preloadedRows && !props.dashboardFilters?.length) {
      columns.value = props.preloadedColumns
      rows.value = props.preloadedRows
      loading.value = false
      return
    }
    const state = effectiveState.value || {}

    if (state.useSql) {
      const sql = state.actualExecutedSql || state.sqlText || ''
      const connectionId = state.dataConnectionId ?? null
      if (!sql) { error.value = 'Missing SQL for chart'; loading.value = false; return }
      const res = await runSql(sql, undefined, connectionId)
      rows.value = res.rows
      columns.value = res.columns
      loading.value = false
      return
    }

    const datasetId = state.selectedDatasetId
    const connectionId = state.dataConnectionId ?? null
    if (!datasetId) { error.value = 'Missing dataset for chart'; loading.value = false; return }

    // Merge chart filters with dashboard filters
    const mergedFilters = getMergedFilters(state.filters || [])

    const res = await runPreview({
      datasetId,
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      filters: mergedFilters,
      breakdowns: breakdowns.value,
      joins: state.joins || [],
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

// Reload data when dashboard filters change
watch(() => props.dashboardFilters, () => {
  if (props.dashboardFilters !== undefined) {
    loadData()
  }
}, { deep: true })
</script>

<style scoped>
</style>


