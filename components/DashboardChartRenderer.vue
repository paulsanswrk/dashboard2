<template>
  <div class="w-full h-full relative">
    <!-- Filter Warning Banner -->
    <div v-if="filterWarning" class="absolute top-0 left-0 right-0 z-10 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1">
      <span>⚠️</span>
      <span>{{ filterWarning }}</span>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-3 text-gray-500">Loading chart...</span>
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full p-4">
      <div class="text-center max-w-sm">
        <div class="text-3xl mb-3">⚠️</div>
        <div class="text-gray-600 dark:text-gray-400 text-sm">{{ friendlyErrorMessage }}</div>
        <button 
          v-if="canRetry"
          @click="loadData" 
          class="mt-3 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded cursor-pointer transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
    <div v-else-if="!rows || rows.length === 0" class="flex items-center justify-center h-full text-gray-500">
      <div class="text-center">
        <div class="text-lg mb-2">📊</div>
        <div>No data available</div>
        <div v-if="hasActiveFilters" class="text-xs mt-1 text-gray-400">Try adjusting your filters</div>
      </div>
    </div>
    <div v-else :class="{'pt-6': filterWarning}">
      <component :is="chartComponent" :key="chartType"
                 :loading="loading"
                 :columns="columns" :rows="rows"
                 :x-dimensions="xDimensions" :breakdowns="breakdowns" :y-metrics="yMetrics"
                 :chart-type="chartType" :appearance="appearance" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, inject, onMounted, ref, watch, type Ref} from 'vue'
import ReportingChart from './reporting/ReportingChart.vue'
import ReportingPreview from './reporting/ReportingPreview.vue'
import {useReportingService} from '../composables/useReportingService'
import {withChartDataConcurrency} from '../composables/useChartConcurrency'
import {CHART_DATA_TIMEOUT_MS} from '~/lib/dashboard-constants'

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
  // New props for progressive loading
  dashboardId?: string
  chartId?: number
}>()

const { runPreview, runSql } = useReportingService()

// Inject render context token from parent (used in PDF render mode)
const renderContextToken = inject<Ref<string | undefined>>('renderContextToken', ref(undefined))

const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const error = ref<string | null>(null)
const loading = ref(true)
const canRetry = ref(false)
const filterWarning = ref<string | null>(null)
const filtersApplied = ref(0)

const hasActiveFilters = computed(() => props.dashboardFilters && props.dashboardFilters.length > 0)

// Map technical errors to user-friendly messages
const friendlyErrorMessage = computed(() => {
  const err = error.value || ''
  
  // Network/connection errors
  if (err.includes('NetworkError') || err.includes('no response') || err.includes('fetch failed')) {
    return 'Unable to load chart data. The data source may be unavailable.'
  }
  if (err.includes('timeout') || err.includes('Timeout')) {
    return 'The request took too long. The data source may be slow to respond.'
  }
  if (err.includes('ECONNREFUSED') || err.includes('ENOTFOUND')) {
    return 'Unable to connect to the data source.'
  }
  
  // Access errors
  if (err.includes('403') || err.includes('Forbidden')) {
    return 'You don\'t have permission to view this chart.'
  }
  if (err.includes('404') || err.includes('not found')) {
    return 'Chart or data source not found.'
  }
  
  // Query errors
  if (err.includes('no_sql_available') || err.includes('Missing SQL')) {
    return 'Chart configuration is incomplete.'
  }
  if (err.includes('no_connection_id')) {
    return 'No data connection configured for this chart.'
  }
  if (err.includes('query_failed')) {
    return 'Failed to execute the data query.'
  }
  
  // Generic fallback - don't show technical details
  return 'Unable to load chart data. Please try again later.'
})

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

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout<T>(url: string, options: any = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHART_DATA_TIMEOUT_MS)
  
  try {
    const res = await $fetch<T>(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return res
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      throw new Error('Request timeout - data source took too long to respond')
    }
    throw e
  }
}

/**
 * Fetch chart data from the dedicated chart data endpoint.
 * This is used when dashboardId and chartId are provided for progressive loading.
 * Uses concurrency limiting to prevent overwhelming the database.
 */
async function fetchChartData(): Promise<{ columns: any[]; rows: any[]; error?: string; filterWarning?: string }> {
  if (!props.dashboardId || !props.chartId) {
    return { columns: [], rows: [], error: 'Missing dashboard or chart ID' }
  }
  
  try {
    // Use concurrency limiter to prevent too many simultaneous requests
    return await withChartDataConcurrency(props.dashboardId, async () => {
      const params: Record<string, string> = {}
      if (props.dashboardFilters?.length) {
        params.filterOverrides = JSON.stringify(props.dashboardFilters)
      }
      
      const res = await fetchWithTimeout<{ 
        columns: any[]; 
        rows: any[]; 
        meta?: { error?: string; filterWarning?: string; filtersApplied?: number; filtersSkipped?: number } 
      }>(
        `/api/dashboards/${props.dashboardId}/charts/${props.chartId}/data`,
        { params: {
          ...params,
          ...(renderContextToken?.value ? { context: renderContextToken.value } : {})
        } }
      )
      
      if (res.meta?.error) {
        return { columns: res.columns || [], rows: res.rows || [], error: res.meta.error }
      }
    
      return { 
        columns: res.columns || [], 
        rows: res.rows || [],
        filterWarning: res.meta?.filterWarning
      }
    })
  } catch (e: any) {
    console.error('[DashboardChartRenderer] Failed to fetch chart data:', e)
    return { columns: [], rows: [], error: e?.statusMessage || e?.message || 'Failed to fetch chart data' }
  }
}


async function loadData() {
  error.value = null
  loading.value = true
  canRetry.value = false
  
  try {
    // Priority 1: Use preloaded data if available and no dashboard filters
    if (props.preloadedColumns && props.preloadedRows && !props.dashboardFilters?.length) {
      columns.value = props.preloadedColumns
      rows.value = props.preloadedRows
      loading.value = false
      return
    }
    
    // Priority 2: Use dedicated chart data endpoint if dashboardId and chartId are provided
    if (props.dashboardId && props.chartId) {
      const result = await fetchChartData()
      columns.value = result.columns
      rows.value = result.rows
      filterWarning.value = result.filterWarning || null
      if (result.error) {
        error.value = result.error
        canRetry.value = true
      }
      loading.value = false
      return
    }

    
    // Priority 3: Fall back to runSql/runPreview for backward compatibility
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
    canRetry.value = true
    loading.value = false
  }
}

onMounted(loadData)

// Reload data when dashboard filters change
// Use a computed signature to only reload when active filter values actually change
const activeFilterSignature = computed(() => {
  const activeFilters = (props.dashboardFilters || []).filter(f => 
    f.value != null || (f.values && f.values.length > 0)
  )
  return JSON.stringify(activeFilters)
})

watch(activeFilterSignature, (newSig, oldSig) => {
  if (newSig !== oldSig) {
    loadData()
  }
})

</script>

<style scoped>
</style>
