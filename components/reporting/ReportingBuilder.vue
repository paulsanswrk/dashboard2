<template>
  <div class="p-6">
    <div class="flex justify-end mb-4">
      <button
        class="px-3 py-2 bg-blue-600 text-white border border-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
        @click="openSelectBoard = true"
        :disabled="loading"
      >
        <Icon name="heroicons:square-3-stack-3d" class="w-4 h-4" />
        Save Chart to Dashboard
      </button>
    </div>

    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Reporting Builder</h2>
      <div class="flex items-center space-x-2">
        <button
          class="px-3 py-2 border rounded flex items-center gap-2"
          @click="onTestPreview"
          :disabled="!canAutoPreview || loading"
        >
          <Icon v-if="loading" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-path" class="w-4 h-4" />
          Refresh
        </button>
        <button v-if="false" class="px-3 py-2 border rounded" @click="onUndo" :disabled="!canUndo">Undo</button>
        <button v-if="false" class="px-3 py-2 border rounded" @click="onRedo" :disabled="!canRedo">Redo</button>
        <div class="flex items-center space-x-2 ml-4">
          <label class="text-sm font-medium text-gray-700">Show SQL</label>
          <button
            @click="useSql = !useSql"
            :disabled="loading"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="useSql ? 'bg-indigo-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="useSql ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
        <button
          v-if="!sidebarVisible"
          @click="$emit('toggle-sidebar')"
          class="px-3 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Icon name="heroicons:cog-6-tooth" class="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>

    <div v-if="useSql" class="mb-4 p-4 bg-gray-50 rounded-lg border">
      <div class="flex items-center gap-3 mb-3">
        <label class="text-sm font-medium">Override SQL</label>
        <input type="checkbox" v-model="overrideSql" :disabled="loading" />
      </div>
      <textarea :readonly="!overrideSql || loading" v-model="sqlTextComputed" class="w-full h-32 border rounded p-2 font-mono text-xs disabled:opacity-50" placeholder="SELECT * FROM your_table LIMIT 100"></textarea>
      <div class="mt-2 space-x-2">
        <button class="px-3 py-1 border rounded" @click="onRunSqlClick" :disabled="!overrideSql || loading">Run SQL</button>
        <span class="text-xs text-gray-500">Only SELECT queries allowed; LIMIT enforced.</span>
      </div>
    </div>

    <div class="">

      <div>
        <h3 class="font-medium mb-2">Preview</h3>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <button v-for="t in chartTypes" :key="t.value" @click="chartType = t.value as any"
                    :disabled="loading"
                    class="flex flex-col items-center justify-center w-16 h-16 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="chartType === t.value ? 'border-primary bg-primary-50' : 'border-neutral-300 bg-white'">
              <Icon :name="t.icon" class="w-6 h-6" />
              <span class="text-xs mt-1">{{ t.label }}</span>
            </button>
          </div>
        </div>
        <div v-if="serverError" class="mb-3 p-2 border border-red-300 bg-red-50 text-red-700 text-sm rounded">
          {{ serverError }}
        </div>
        <div v-if="serverWarnings.length" class="mb-3 p-2 border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded">
          <div v-for="(w, i) in serverWarnings" :key="i">{{ w }}</div>
        </div>
        <component :is="chartComponent" :key="chartType"
                   :columns="columns" :rows="rows"
                   :x-dimensions="xDimensions" :breakdowns="breakdowns" :y-metrics="yMetrics"
                   :chart-type="chartType" :appearance="appearance" :loading="loading" />
      </div>
    </div>
    <ChartsModal
      :open="openReports"
      :data-connection-id="selectedConnectionId ?? connectionId ?? getUrlConnectionId()"
      :use-sql="useSql"
      :override-sql="overrideSql"
      :sql-text="sqlText"
      :actual-executed-sql="actualExecutedSql"
      :chart-type="chartType"
      @close="openReports=false"
      @load-chart="handleLoadChart"
    />
    <SelectBoardModal
      :is-open="openSelectBoard"
      @close="openSelectBoard=false"
      @save="handleSaveToDashboard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'

// Props
const props = defineProps<{
  sidebarVisible?: boolean
  connectionId?: number | null
}>()

// Emits
const emit = defineEmits<{
  'toggle-sidebar': []
  'preview-meta': [{ error: string | null; warnings: string[] }]
}>()
import ReportingChart from './ReportingChart.vue'
import ChartsModal from './ChartsModal.vue'
import ReportingPreview from './ReportingPreview.vue'
import SelectBoardModal from '../SelectBoardModal.vue'
import { useReportingService } from '../../composables/useReportingService'
import { useReportState } from '../../composables/useReportState'
import { useChartsService } from '../../composables/useChartsService'
import { useDashboardsService } from '../../composables/useDashboardsService'

const { runPreview, runSql, selectedDatasetId, selectedConnectionId, setSelectedConnectionId } = useReportingService()
const { xDimensions, yMetrics, filters, breakdowns, appearance, joins, undo, redo, canUndo, canRedo, excludeNullsInDimensions } = useReportState()
const { createChart } = useChartsService()
const { createDashboard, createDashboardReport } = useDashboardsService()
const loading = ref(false)
const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const serverError = ref<string | null>(null)
const serverWarnings = ref<string[]>([])
const chartType = ref<'table' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey'>('table')
const chartComponent = computed(() => chartType.value === 'table' ? ReportingPreview : ReportingChart)
const openReports = ref(false)
const openSelectBoard = ref(false)
const useSql = ref(false)
const overrideSql = ref(false)
const sqlText = ref('')
const actualExecutedSql = ref('')

const chartTypes = [
  { value: 'table', label: 'Table', icon: 'heroicons:table-cells' },
  { value: 'bar', label: 'Bar', icon: 'heroicons:chart-bar' },
  { value: 'line', label: 'Line', icon: 'heroicons:chart-bar' },
  { value: 'area', label: 'Area', icon: 'heroicons:chart-bar' },
  { value: 'pie', label: 'Pie', icon: 'heroicons:chart-pie' },
  { value: 'donut', label: 'Donut', icon: 'heroicons:circle-stack' },
  { value: 'funnel', label: 'Funnel', icon: 'heroicons:rectangle-stack' },
  { value: 'gauge', label: 'Gauge', icon: 'heroicons:clock' },
  { value: 'scatter', label: 'Scatter', icon: 'heroicons:squares-2x2' },
  { value: 'treemap', label: 'Treemap', icon: 'heroicons:squares-plus' },
  { value: 'sankey', label: 'Sankey', icon: 'heroicons:arrows-right-left' }
]

// Zone configuration for different chart types
type ZoneConfig = {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
}

const zoneConfig = computed((): ZoneConfig => {
  switch (chartType.value) {
    case 'table':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: true,
        xLabel: 'Columns',
        yLabel: 'Values',
        breakdownLabel: 'Rows'
      }
    case 'bar':
    case 'line':
    case 'area':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: true,
        xLabel: 'X (Categories)',
        yLabel: 'Y (Values)',
        breakdownLabel: 'Series'
      }
    case 'pie':
    case 'donut':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: false,
        xLabel: 'Categories',
        yLabel: 'Values'
      }
    case 'funnel':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: false,
        xLabel: 'Stages',
        yLabel: 'Values'
      }
    case 'gauge':
      return {
        showXDimensions: false,
        showYMetrics: true,
        showBreakdowns: false,
        yLabel: 'Value'
      }
    case 'scatter':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: false,
        xLabel: 'X Values',
        yLabel: 'Y Values'
      }
    case 'map':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: false,
        xLabel: 'Regions',
        yLabel: 'Values'
      }
    case 'treemap':
      return {
        showXDimensions: true,
        showYMetrics: false,
        showBreakdowns: true,
        xLabel: 'Hierarchy',
        breakdownLabel: 'Size Values'
      }
    case 'sankey':
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: false,
        xLabel: 'Sources',
        yLabel: 'Targets'
      }
    default:
      return {
        showXDimensions: true,
        showYMetrics: true,
        showBreakdowns: true,
        xLabel: 'X (Dimensions)',
        yLabel: 'Y (Metrics)',
        breakdownLabel: 'Breakdown'
      }
  }
})

const sqlGenerated = computed(() => {
  if (!selectedDatasetId.value) return ''
  const safeId = (s?: string) => !!s && /^[a-zA-Z0-9_]+$/.test(s)
  const wrap = (s: string) => `\`${s}\``
  const table = wrap(selectedDatasetId.value)
  const qualify = (f: { fieldId?: string; table?: string } | null | undefined): string | null => {
    if (!f || !safeId(f.fieldId)) return null
    const col = wrap(f.fieldId as string)
    if (f.table && safeId(f.table)) {
      return `${wrap(f.table)}.${col}`
    }
    return col
  }
  const selectParts: string[] = []
  const groupByParts: string[] = []
  const usedTables = new Set<string>()
  const usedLowerToOriginal = new Map<string, string>()
  ;[...xDimensions.value, ...breakdowns.value].forEach((d: any) => {
    const expr = qualify(d)
    if (expr) {
      selectParts.push(`${expr} AS ${wrap(d.fieldId)}`)
      groupByParts.push(expr)
      if (d?.table && safeId(d.table)) {
        usedTables.add(d.table)
        usedLowerToOriginal.set(String(d.table).toLowerCase(), d.table)
      }
    }
  })
  yMetrics.value.forEach((m: any) => {
    const expr = qualify(m)
    if (!expr) return
    if (m?.table && safeId(m.table)) {
      usedTables.add(m.table)
      usedLowerToOriginal.set(String(m.table).toLowerCase(), m.table)
    }
    let agg = (m.aggregation || (m.isNumeric ? 'SUM' : 'COUNT')).toUpperCase()
    if (!['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'].includes(agg)) agg = m.isNumeric ? 'SUM' : 'COUNT'
    const alias = `${agg.toLowerCase()}_${m.fieldId}`
    selectParts.push(`${agg}(${expr}) AS ${wrap(alias)}`)
  })
  if (!selectParts.length) selectParts.push('COUNT(*) AS `count`')
  const whereParts: string[] = []
  const addWhere = (clause: string) => { if (clause) whereParts.push(clause) }
  filters.value.forEach((f: any) => {
    const field = qualify(f?.field)
    if (!field) return
    const op = (f.operator || 'equals').toLowerCase()
    if (op === 'equals') addWhere(`${field} = ?`)
    else if (op === 'contains') addWhere(`${field} LIKE ?`)
    else if (op === 'in') {
      const parts = String(f.value || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length) addWhere(`${field} IN (${parts.map(() => '?').join(',')})`)
    } else if (op === 'between') addWhere(`${field} BETWEEN ? AND ?`)
    else if (op === 'is_null') addWhere(`${field} IS NULL`)
    else if (op === 'not_null') addWhere(`${field} IS NOT NULL`)
  })
  const joinClauses: string[] = []
  const includedTables = new Set<string>([selectedDatasetId.value])
  const includedLower = new Set<string>([String(selectedDatasetId.value).toLowerCase()])
  ;(joins.value || []).forEach((j: any) => {
    const jt = j.joinType === 'left' ? 'LEFT JOIN' : 'INNER JOIN'
    if (!safeId(j.targetTable) || !safeId(j.sourceTable)) return
    let srcTable = j.sourceTable
    let tgtTable = j.targetTable
    let pairs = (j.columnPairs || []).map((p: any) => ({ sourceColumn: p.sourceColumn, targetColumn: p.targetColumn }))
    if (includedTables.has(tgtTable) && !includedTables.has(srcTable)) {
      ;[srcTable, tgtTable] = [tgtTable, srcTable]
      pairs = pairs.map((p: any) => ({ sourceColumn: p.targetColumn, targetColumn: p.sourceColumn }))
    }
    if (includedTables.has(tgtTable) || includedLower.has(String(tgtTable).toLowerCase())) return
    const target = wrap(tgtTable)
    const source = wrap(srcTable)
    const onParts: string[] = []
    pairs.forEach((p: any) => {
      if (safeId(p.sourceColumn) && safeId(p.targetColumn)) onParts.push(`${source}.${wrap(p.sourceColumn)} = ${target}.${wrap(p.targetColumn)}`)
    })
    if (onParts.length) {
      joinClauses.push(`${jt} ${target} ON ${onParts.join(' AND ')}`)
      includedTables.add(tgtTable)
      includedLower.add(String(tgtTable).toLowerCase())
    }
  })
  const crossJoinClauses: string[] = []
  const usedLower = new Set(Array.from(usedTables).map(t => String(t).toLowerCase()))
  usedLower.forEach((tLower) => {
    if (!includedLower.has(tLower)) {
      const original = usedLowerToOriginal.get(tLower)
      if (original && safeId(original)) crossJoinClauses.push(`CROSS JOIN ${wrap(original)}`)
    }
  })
  const limit = 100
  return [
    'SELECT',
    selectParts.join(', '),
    'FROM',
    table,
    ...joinClauses,
    ...crossJoinClauses,
    whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '',
    groupByParts.length ? 'GROUP BY ' + groupByParts.join(', ') : '',
    'LIMIT ' + limit
  ].filter(Boolean).join(' ')
})

const sqlTextComputed = computed({
  get: () => (overrideSql.value ? sqlText.value : actualExecutedSql.value || sqlGenerated.value),
  set: (v: string) => { sqlText.value = v }
})

function getUrlConnectionId(): number | null {
  try {
    const url = new URL(window.location.href)
    const cid = url.searchParams.get('data_connection_id')
    if (!cid) return null
    const n = Number(cid)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

async function onTestPreview() {
  // Determine datasetId: use selectedDatasetId if set, otherwise use first table from X dimensions
  let datasetId = selectedDatasetId.value
  if (!datasetId && xDimensions.value.length > 0) {
    datasetId = xDimensions.value[0].table || null
  }
  if (!datasetId && yMetrics.value.length > 0) {
    datasetId = yMetrics.value[0].table || null
  }
  if (!datasetId) return

  loading.value = true
  try {
    const res = await runPreview({
      datasetId,
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      filters: filters.value,
      breakdowns: breakdowns.value,
      joins: joins.value as any,
      limit: 100,
      connectionId: selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId()
    })
    rows.value = res.rows
    columns.value = res.columns
    serverError.value = (res.meta as any)?.error || null
    serverWarnings.value = ((res.meta as any)?.warnings as string[]) || []
    actualExecutedSql.value = (res.meta as any)?.sql || ''
    emit('preview-meta', { error: serverError.value, warnings: serverWarnings.value })
  } finally {
    loading.value = false
  }
}

// Auto preview on state change (debounced by Vue batching)
const canAutoPreview = computed(() => {
  // Can preview if we have dimensions/metrics configured
  const hasData = xDimensions.value.length > 0 || yMetrics.value.length > 0
  if (!hasData) return false

  // Can preview if we have a selectedDatasetId, or can determine one from the data
  if (selectedDatasetId.value) return true

  // Check if we can determine datasetId from X dimensions or Y metrics
  if (xDimensions.value.length > 0 && xDimensions.value[0].table) return true
  if (yMetrics.value.length > 0 && yMetrics.value[0].table) return true

  return false
})
watch([selectedDatasetId, xDimensions, yMetrics, filters, breakdowns, joins], async () => {
  if (!canAutoPreview.value) return
  if (useSql.value) return
  await onTestPreview()
}, { deep: true })

// Initial preview on mount if we have sufficient parameters
onMounted(() => {
  // Use nextTick to ensure component is fully mounted and reactive system is ready
  nextTick(async () => {
    // Wait for connectionId to be available if we need it
    const checkAndRunPreview = async () => {
      try {
        // Check if we can determine a datasetId and have data to preview
        const hasData = xDimensions.value.length > 0 || yMetrics.value.length > 0
        const canDetermineDatasetId = selectedDatasetId.value ||
          (xDimensions.value.length > 0 && xDimensions.value[0].table) ||
          (yMetrics.value.length > 0 && yMetrics.value[0].table)

        // Only run preview if we have data, can determine datasetId, and have a connectionId available
        const hasConnection = (selectedConnectionId.value != null) || (props.connectionId != null) || (getUrlConnectionId() != null)
        if (hasData && canDetermineDatasetId && hasConnection && !useSql.value) {
          await onTestPreview()
          return true // Preview was run
        }
        return false // Preview not ready yet
      } catch (error) {
        // Silently handle errors during initial preview to prevent component mounting issues
        console.warn('Failed to load initial preview:', error)
        return true // Don't retry on error
      }
    }

    // Try to run preview immediately
    const previewRun = await checkAndRunPreview()

    // If preview wasn't run (connectionId not ready), set up a watcher to run it when connectionId becomes available
    if (!previewRun) {
      const unwatch = watch([() => props.connectionId, selectedConnectionId], async () => {
        const hasConnection = (selectedConnectionId.value != null) || (props.connectionId != null) || (getUrlConnectionId() != null)
        if (hasConnection && canAutoPreview.value && !useSql.value) {
          unwatch()
          await onTestPreview()
        }
      })
    }
  })
})

function onUndo() { undo() }
function onRedo() { redo() }

function handleLoadChart(state: {
  dataConnectionId: number | null
  useSql: boolean
  overrideSql: boolean
  sqlText: string
  actualExecutedSql: string
  chartType: string
}) {
  // Set connection ID if provided
  if (state.dataConnectionId !== null) {
    setSelectedConnectionId(state.dataConnectionId)
  }

  useSql.value = state.useSql
  overrideSql.value = state.overrideSql
  sqlText.value = state.sqlText
  actualExecutedSql.value = state.actualExecutedSql
  chartType.value = state.chartType as typeof chartType.value
}

async function handleSaveToDashboard(data: { saveAsName: string; selectedDestination: string; selectedDashboardId?: string }) {
  try {
    loading.value = true

    // Get current report state
    const reportState = {
      selectedDatasetId: selectedDatasetId.value,
      dataConnectionId: selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId(),
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      filters: filters.value,
      breakdowns: breakdowns.value,
      excludeNullsInDimensions: excludeNullsInDimensions.value,
      appearance: appearance.value,
      // SQL configuration
      useSql: useSql.value,
      overrideSql: overrideSql.value,
      sqlText: sqlText.value,
      actualExecutedSql: actualExecutedSql.value,
      // Chart configuration
      chartType: chartType.value
    }

    // Save the chart
    const chartResult = await createChart({
      name: data.saveAsName,
      state: reportState
    })

    if (!chartResult.success) {
      throw new Error('Failed to save chart')
    }

    let dashboardId: string
    let successMessage: string

    if (data.selectedDestination === 'new') {
      // Create the dashboard
      const dashboardResult = await createDashboard({
        name: data.saveAsName,
        isPublic: false
      })

      if (!dashboardResult.success) {
        throw new Error('Failed to create dashboard')
      }

      dashboardId = dashboardResult.dashboardId
      successMessage = `Chart "${data.saveAsName}" has been saved to a new dashboard!`
    } else if (data.selectedDestination === 'existing' && data.selectedDashboardId) {
      // Use existing dashboard
      dashboardId = data.selectedDashboardId
      successMessage = `Chart "${data.saveAsName}" has been saved to the existing dashboard!`
    } else {
      throw new Error('Invalid destination or missing dashboard ID')
    }

    // Create the dashboard-report relationship with default position
    const position = {
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      i: chartResult.chartId.toString()
    }

    await createDashboardReport({
      dashboardId: dashboardId,
      chartId: chartResult.chartId,
      position: position
    })

    // Show success message BEFORE closing modal
    const toast = useToast()
    toast.add({
      title: 'Chart Saved Successfully',
      description: successMessage,
      color: 'green'
    })

    // Close modal after showing toast
    openSelectBoard.value = false

  } catch (error) {
    console.error('Failed to save chart to dashboard:', error)
    const toast = useToast()
    toast.add({
      title: 'Save Failed',
      description: 'Failed to save chart to dashboard. Please try again.',
      color: 'red'
    })
    
    // Close modal even on error
    openSelectBoard.value = false
  } finally {
    loading.value = false
  }
}

async function onRunSql(preserveChartType = false) {
  loading.value = true
  try {
    const res = await runSql(
      sqlText.value,
      undefined,
      selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId()
    )
    rows.value = res.rows
    columns.value = res.columns
    if (!preserveChartType) {
      chartType.value = 'table'
    }
    serverError.value = (res.meta as any)?.error || null
  } finally {
    loading.value = false
  }
}

// Wrapper for template usage
function onRunSqlClick() {
  onRunSql(false)
}

// Expose methods for parent component (AI integration)
function applySqlAndChartType(sql: string, type: string) {
  // Enable SQL mode and override
  useSql.value = true
  overrideSql.value = true
  sqlText.value = sql

  // Set chart type if valid
  const validTypes = ['table', 'bar', 'line', 'area', 'pie', 'donut', 'funnel', 'gauge', 'map', 'scatter', 'treemap', 'sankey']
  if (validTypes.includes(type)) {
    chartType.value = type as any
  }

  // Execute the SQL, preserving the chart type set by AI
  nextTick(() => {
    onRunSql(true)
  })
}

function getCurrentState() {
  return {
    sql: sqlTextComputed.value,
    chartType: chartType.value,
    appearance: appearance.value
  }
}

defineExpose({
  applySqlAndChartType,
  getCurrentState
})

</script>

<style scoped>
</style>


