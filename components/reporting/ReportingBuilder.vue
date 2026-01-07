<template>
  <div class="p-4">
    <!-- Chart Types Row at the top -->
    <div class="flex items-center justify-between mb-4">
      <!-- Left Arrow -->
      <button
          @click="scrollChartTypes('left')"
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          :disabled="!canScrollLeft"
      >
        <Icon name="i-heroicons-chevron-left" class="w-5 h-5"/>
      </button>

      <!-- Scrollable Chart Types Container -->
      <div
          ref="chartTypesContainerRef"
          class="flex-1 mx-2 overflow-x-auto scrollbar-hide"
          @scroll="updateScrollState"
      >
        <div class="flex items-center gap-2">
          <button v-for="t in chartTypes" :key="t.value" @click="chartType = t.value as any"
                  :disabled="loading"
                  class="flex flex-col items-center justify-center w-20 h-20 flex-shrink-0 rounded border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  :class="chartType === t.value ? 'border-primary bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'">
            <Icon :name="t.icon" class="w-10 h-10"/>
            <span class="text-xs mt-1">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Right Arrow -->
      <button
          @click="scrollChartTypes('right')"
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          :disabled="!canScrollRight"
      >
        <Icon name="i-heroicons-chevron-right" class="w-5 h-5"/>
      </button>
    </div>

    <!-- Action Buttons Row - compactly placed to the right -->
    <div class="flex items-center justify-between mb-4">
      <!-- Title Input -->
      <input
          v-model="chartTitle"
          type="text"
          placeholder="Enter title for your visualization"
          class="input-borderless flex-1 max-w-2xl px-1 py-2 text-lg font-medium bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none"
      />

      <!-- Action Buttons grouped on the right -->
      <div class="flex items-center gap-2">
        <UButton
            v-if="isDebug"
            variant="outline"
            color="gray"
            class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            @click="useSql = !useSql"
            :disabled="loading"
        >
          <Icon name="i-heroicons-code-bracket" class="w-4 h-4"/>
          {{ useSql ? 'Hide SQL' : 'Show SQL' }}
        </UButton>
        <UButton
            variant="outline"
            color="gray"
            class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            @click="onClearAll"
            :disabled="loading"
        >
          <Icon name="i-heroicons-trash" class="w-4 h-4"/>
          Clear
        </UButton>
        <UButton
            variant="outline"
            @click="onTestPreview"
            :disabled="!canAutoPreview || loading"
        >
          <Icon v-if="loading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
          <Icon v-else name="i-heroicons-arrow-path" class="w-4 h-4"/>
          Refresh
        </UButton>
        <UButton
            v-if="!sidebarVisible"
            variant="outline"
            @click="$emit('toggle-sidebar')"
        >
          <Icon name="i-heroicons-cog-6-tooth" class="w-4 h-4"/>
        </UButton>
        <template v-if="fromDashboard">
          <UButton
              variant="outline"
              color="gray"
              class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              @click="discardAndReturn"
              :disabled="loading"
          >
            <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            Discard
          </UButton>
          <UButton
              color="orange"
              class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              @click="doneAndReturn"
              :loading="loading"
          >
            <Icon name="i-heroicons-check" class="w-4 h-4"/>
            Done
          </UButton>
        </template>
        <template v-else>
          <UButton
              v-if="props.dashboardId"
              color="gray"
              class="hover:bg-gray-700 hover:text-white cursor-pointer"
              @click="backToDashboard"
          >
            <Icon name="i-heroicons-arrow-left" class="w-4 h-4"/>
            Back
          </UButton>
          <UButton
              color="blue"
              class="hover:bg-blue-700 hover:text-white cursor-pointer"
              @click="props.editingChartId ? saveExistingChart() : openSelectBoard = true"
              :disabled="loading"
          >
            <Icon name="i-heroicons-square-3-stack-3d" class="w-4 h-4"/>
            {{ props.editingChartId ? 'Save' : 'Save to Dashboard' }}
          </UButton>
        </template>
      </div>
    </div>

    <!-- SQL Panel (hidden by default, toggle removed from UI) -->
    <div v-if="useSql && isDebug" class="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div class="flex items-center gap-3 mb-3">
        <label class="text-sm font-medium">Override SQL</label>
        <input type="checkbox" v-model="overrideSql" :disabled="loading" />
      </div>
      <textarea :readonly="!overrideSql || loading" v-model="displaySql" class="w-full h-32 border rounded p-2 font-mono text-xs disabled:opacity-50" placeholder="SELECT * FROM your_table LIMIT 100"></textarea>
      <div class="mt-2 space-x-2">
        <UButton variant="outline" size="xs" @click="onRunSqlClick" :disabled="!overrideSql || loading">Run SQL</UButton>
        <span class="text-xs text-gray-500">Only SELECT queries allowed; LIMIT enforced.</span>
      </div>
    </div>

    <!-- Debug JSON Config Panel (dev mode only) -->
    <ClientOnly>
      <div v-if="isDebug" class="mb-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
        <button
          @click="debugPanelOpen = !debugPanelOpen"
          class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer rounded-t-lg"
        >
          <div class="flex items-center gap-2">
            <Icon name="i-heroicons-beaker" class="w-4 h-4 text-amber-600 dark:text-amber-400"/>
            <span class="font-medium text-sm text-amber-800 dark:text-amber-200">Debug: JSON Chart Config</span>
          </div>
          <Icon :name="debugPanelOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-amber-600 dark:text-amber-400"/>
        </button>
        
        <div v-if="debugPanelOpen" class="px-4 pb-4 space-y-3">
          <p class="text-xs text-amber-700 dark:text-amber-300">
            Paste a JSON chart configuration to test the chart builder. This will override current settings.
          </p>
          <textarea
            v-model="debugJsonConfig"
            rows="12"
            class="w-full border border-amber-300 dark:border-amber-600 rounded-lg p-3 font-mono text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            placeholder='{"chartType": "column", "xDimensions": [...], "yMetrics": [...], ...}'
          ></textarea>
          <div class="flex flex-wrap items-center gap-3">
            <UButton
              color="amber"
              class="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
              @click="applyDebugConfig"
              :disabled="loading || !debugJsonConfig.trim()"
            >
              <Icon name="i-heroicons-play" class="w-4 h-4"/>
              Apply Builder State
            </UButton>
            <UButton
              color="blue"
              class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              @click="applyAiChartConfig"
              :disabled="loading || !debugJsonConfig.trim()"
            >
              <Icon name="i-heroicons-sparkles" class="w-4 h-4"/>
              Apply AI chartConfig
            </UButton>
            <UButton
              variant="outline"
              color="amber"
              class="border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer"
              @click="exportCurrentConfig"
            >
              <Icon name="i-heroicons-arrow-down-tray" class="w-4 h-4"/>
              Export Current
            </UButton>
            <span v-if="debugConfigError" class="text-xs text-red-600 dark:text-red-400">{{ debugConfigError }}</span>
            <span v-if="debugConfigSuccess" class="text-xs text-green-600 dark:text-green-400">{{ debugConfigSuccess }}</span>
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Chart Preview Area -->
    <div>
      <div v-if="serverError" class="mb-3 p-2 border border-red-300 bg-red-50 text-red-700 text-sm rounded">
        {{ serverError }}
      </div>
      <div v-if="serverWarnings.length" class="mb-3 p-2 border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded">
        <div v-for="(w, i) in serverWarnings" :key="i">{{ w }}</div>
      </div>
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500 mb-3"/>
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading chart data...</p>
      </div>
      <!-- Onboarding guide (shown when no data is loaded) -->
      <div v-else-if="showOnboardingGuide" class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
        <ReportingOnboardingGuide :chart-type="chartType"/>
      </div>
      <!-- Chart component -->
      <div v-else ref="previewAreaRef">
        <component :is="chartComponent" :key="chartType"
                   ref="chartComponentRef"
                   :columns="columns" :rows="rows"
                   :x-dimensions="xDimensions" :breakdowns="breakdowns" :y-metrics="yMetrics"
                   :chart-type="chartType" :appearance="appearance" :loading="loading"/>
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
      :capture-chart-meta="captureChartMeta"
      @close="openReports=false"
      @load-chart="handleLoadChart"
    />
    <SelectBoardModal
        v-model:open="openSelectBoard"
      @save="handleSaveToDashboard"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {navigateTo} from '#imports'
import {format} from 'sql-formatter'
import ReportingChart from './ReportingChart.vue'
import ChartsModal from './ChartsModal.vue'
import ReportingPreview from './ReportingPreview.vue'
import ReportingOnboardingGuide from './ReportingOnboardingGuide.vue'
import SelectBoardModal from '../SelectBoardModal.vue'
import {useReportingService} from '../../composables/useReportingService'
import {useReportState} from '../../composables/useReportState'
import {useChartsService} from '../../composables/useChartsService'
import {useDashboardsService} from '../../composables/useDashboardsService'

// Props
const props = defineProps<{
  sidebarVisible?: boolean
  connectionId?: number | null
  editingChartId?: number | null
  dashboardId?: string | null
}>()

const fromDashboard = computed(() => !!props.dashboardId)

// Emits
const emit = defineEmits<{
  'toggle-sidebar': []
  'preview-meta': [{ error: string | null; warnings: string[] }]
  'chart-type-change': [chartType: string]
}>()

const { runPreview, runSql, selectedDatasetId, selectedConnectionId, setSelectedConnectionId, setSelectedDatasetId } = useReportingService()
const {xDimensions, yMetrics, breakdowns, filters, appearance, joins, undo, redo, canUndo, canRedo, excludeNullsInDimensions} = useReportState()
const { createChart } = useChartsService()
const { createDashboard, createDashboardReport } = useDashboardsService()
const nuxtApp = useNuxtApp()
const isDebug = computed(() => nuxtApp.static.isDev ?? import.meta.dev)
const toast = useToast()
const loading = ref(false)
const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const serverError = ref<string | null>(null)
const serverWarnings = ref<string[]>([])
const chartType = ref<'table' | 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey' | 'kpi' | 'pivot' | 'stacked' | 'radar' | 'boxplot' | 'bubble' | 'waterfall' | 'number' | 'wordcloud'>('column')
const chartComponent = computed(() => chartType.value === 'table' ? ReportingPreview : ReportingChart)

// Show onboarding guide when no data is loaded and no zones are populated
const showOnboardingGuide = computed(() => {
  // Don't show if we have rows
  if (rows.value.length > 0) return false
  // Don't show if loading
  if (loading.value) return false
  // Show if no zones are populated
  const hasZoneData = xDimensions.value.length > 0 || yMetrics.value.length > 0 || breakdowns.value.length > 0
  return !hasZoneData
})
const openReports = ref(false)
const openSelectBoard = ref(false)
const useSql = ref(false)
const overrideSql = ref(false)
const sqlText = ref('')
const actualExecutedSql = ref('')
const chartTitle = ref('')

// Debug panel state
const debugPanelOpen = ref(false)
const debugJsonConfig = ref('')
const debugConfigError = ref('')
const debugConfigSuccess = ref('')

const chartTypes = [
  {value: 'table', label: 'Table', icon: 'i-heroicons-table-cells'},
  {value: 'number', label: 'Number', icon: 'i-heroicons-hashtag'},
  {value: 'column', label: 'Column', icon: 'i-heroicons-chart-bar'},
  {value: 'bar', label: 'Bar', icon: 'i-heroicons-chart-bar'},
  {value: 'stacked', label: 'Stacked', icon: 'i-heroicons-chart-bar-square'},
  {value: 'line', label: 'Line', icon: 'i-heroicons-chart-bar'},
  {value: 'area', label: 'Area', icon: 'i-heroicons-chart-bar'},
  {value: 'pie', label: 'Pie', icon: 'i-heroicons-chart-pie'},
  {value: 'donut', label: 'Donut', icon: 'i-heroicons-circle-stack'},
  {value: 'funnel', label: 'Funnel', icon: 'i-heroicons-rectangle-stack'},
  {value: 'gauge', label: 'Gauge', icon: 'i-heroicons-clock'},
  {value: 'kpi', label: 'KPI', icon: 'i-heroicons-presentation-chart-bar'},
  {value: 'radar', label: 'Radar', icon: 'i-heroicons-globe-alt'},
  {value: 'scatter', label: 'Scatter', icon: 'i-heroicons-squares-2x2'},
  {value: 'bubble', label: 'Bubble', icon: 'i-heroicons-ellipsis-horizontal-circle'},
  {value: 'boxplot', label: 'Box Plot', icon: 'i-heroicons-bars-3'},
  {value: 'waterfall', label: 'Waterfall', icon: 'i-heroicons-bars-arrow-down'},
  {value: 'treemap', label: 'Treemap', icon: 'i-heroicons-squares-plus'},
  {value: 'sankey', label: 'Sankey', icon: 'i-heroicons-arrows-right-left'},
  {value: 'pivot', label: 'Pivot', icon: 'i-heroicons-view-columns'},
  {value: 'wordcloud', label: 'Word Cloud', icon: 'i-heroicons-cloud'}
]

const chartComponentRef = ref<any>(null)
const previewAreaRef = ref<HTMLElement | null>(null)
const chartTypesContainerRef = ref<HTMLElement | null>(null)

// Chart types scroller state
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

const updateScrollState = () => {
  const container = chartTypesContainerRef.value
  if (!container) return
  canScrollLeft.value = container.scrollLeft > 0
  canScrollRight.value = container.scrollLeft < container.scrollWidth - container.clientWidth - 1
}

const scrollChartTypes = (direction: 'left' | 'right') => {
  const container = chartTypesContainerRef.value
  if (!container) return
  const scrollAmount = 200 // Scroll by 3 chart type buttons approximately
  container.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
  // Update state after scroll animation
  setTimeout(updateScrollState, 300)
}

// Initialize scroll state on mount
onMounted(() => {
  setTimeout(updateScrollState, 100)
})

// Zone configuration for different chart types
type ZoneConfig = {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  showTargetValue: boolean    // For number, gauge
  showLocation: boolean       // For map
  showCrossTab: boolean       // For table, pivot
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
  targetValueLabel?: string
  locationLabel?: string
  crossTabLabel?: string
}

const zoneConfig = computed((): ZoneConfig => {
  // Default config with all zones hidden
  const defaultConfig: ZoneConfig = {
    showXDimensions: true,
    showYMetrics: true,
    showBreakdowns: true,
    showTargetValue: false,
    showLocation: false,
    showCrossTab: false,
    xLabel: 'X-Axis',
    yLabel: 'Y-Axis',
    breakdownLabel: 'Break Down By'
  }

  switch (chartType.value) {
      // Single value charts - matching original app naming
    case 'number':
      return {
        ...defaultConfig,
        showXDimensions: false,
        showBreakdowns: false,
        showTargetValue: true,
        yLabel: 'Measure',
        targetValueLabel: 'Target Value'
      }
    case 'gauge':
      return {
        ...defaultConfig,
        showXDimensions: false,
        showBreakdowns: false,
        showTargetValue: true,
        yLabel: 'Measure',
        targetValueLabel: 'Target Value'
      }
    case 'kpi':
      return {
        ...defaultConfig,
        showXDimensions: false,
        showBreakdowns: false,
        showTargetValue: true,
        yLabel: 'Measure',
        targetValueLabel: 'Target Value'
      }

      // Table charts - matching original app with cross-tab
    case 'table':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        showCrossTab: true,
        xLabel: 'Columns (Text)',
        yLabel: 'Columns (Aggregated)',
        crossTabLabel: 'Cross Tab Dimension'
      }
    case 'pivot':
      return {
        ...defaultConfig,
        showCrossTab: true,
        xLabel: 'Columns',
        yLabel: 'Values',
        breakdownLabel: 'Rows',
        crossTabLabel: 'Cross Tab Dimension'
      }

      // Pie/Donut - matching original app naming
    case 'pie':
    case 'donut':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'Divide By',
        yLabel: 'Measure'
      }

      // Funnel
    case 'funnel':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'Stages',
        yLabel: 'Measure'
      }

      // Map - with location zone
    case 'map':
      return {
        ...defaultConfig,
        showXDimensions: false,
        showLocation: true,
        yLabel: 'Measure',
        locationLabel: 'Location',
        breakdownLabel: 'Break Down By'
      }

      // Cartesian charts - matching original app naming
    case 'column':
    case 'bar':
    case 'stacked':
      return {
        ...defaultConfig,
        xLabel: 'X-Axis',
        yLabel: 'Y-Axis',
        breakdownLabel: 'Break Down By'
      }
    case 'line':
    case 'area':
      return {
        ...defaultConfig,
        xLabel: 'X-Axis',
        yLabel: 'Y-Axis',
        breakdownLabel: 'Break Down By'
      }
    case 'boxplot':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'X-Axis',
        yLabel: 'Y-Axis'
      }

      // Scatter/Bubble
    case 'scatter':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'X-Axis',
        yLabel: 'Y-Axis'
      }
    case 'bubble':
      return {
        ...defaultConfig,
        xLabel: 'X-Axis',
        yLabel: 'Y-Axis',
        breakdownLabel: 'Size'
      }

      // Treemap
    case 'treemap':
      return {
        ...defaultConfig,
        showYMetrics: false,
        xLabel: 'Hierarchy',
        breakdownLabel: 'Size Values'
      }

      // Sankey
    case 'sankey':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'Source',
        yLabel: 'Target'
      }

      // Radar
    case 'radar':
      return {
        ...defaultConfig,
        xLabel: 'Dimensions',
        yLabel: 'Values',
        breakdownLabel: 'Series'
      }

      // Waterfall
    case 'waterfall':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'Categories',
        yLabel: 'Values'
      }

      // Word Cloud
    case 'wordcloud':
      return {
        ...defaultConfig,
        showBreakdowns: false,
        xLabel: 'Words',
        yLabel: 'Size Values'
      }

    default:
      return defaultConfig
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

      // WHERE from dimension/metric filters
  ;[...xDimensions.value, ...breakdowns.value].forEach((d: any) => {
    const fieldExpr = qualify(d)
    if (!fieldExpr) return

    // Value list filters
    if (d.filterValues && d.filterValues.length > 0) {
      const mode = d.filterMode === 'exclude' ? 'NOT IN' : 'IN'
      addWhere(`${fieldExpr} ${mode} (${d.filterValues.map(() => '?').join(',')})`)
    }

    // Date range filters
    if (d.dateRangeType === 'static') {
      if (d.dateRangeStart) addWhere(`${fieldExpr} >= ?`)
      if (d.dateRangeEnd) addWhere(`${fieldExpr} <= ?`)
    } else if (d.dateRangeType === 'dynamic' && d.dynamicRange) {
      // Dynamic range logic would go here if we were generating it client-side as well
    }
  })

  // Exclude nulls logic
  if (excludeNullsInDimensions.value) {
    ;[...xDimensions.value, ...breakdowns.value].forEach((d: any) => {
      const fieldExpr = qualify(d)
      if (fieldExpr) addWhere(`${fieldExpr} IS NOT NULL`)
    })
  }

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

const displaySql = computed({
  get: () => {
    // Always format the SQL for display, regardless of override state
    try {
      const sql = sqlTextComputed.value
      if (!sql) return ''
      return format(sql, {
        language: 'mysql', // Default to MySQL, can be made configurable later
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 1
      })
    } catch (error) {
      // If formatting fails, return the original SQL
      console.warn('SQL formatting failed:', error)
      return sqlTextComputed.value
    }
  },
  set: (value: string) => {
    if (overrideSql.value) {
      sqlTextComputed.value = value
    }
  }
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
      breakdowns: breakdowns.value,
      filters: filters.value,
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
watch([xDimensions, yMetrics, breakdowns, filters, joins], async () => {
  if (!canAutoPreview.value) return
  if (useSql.value) return
  await onTestPreview()
}, { deep: true })

// Emit chartType changes for parent components
watch(chartType, (newType) => {
  emit('chart-type-change', newType)
}, {immediate: true})

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

function onClearAll() {
  // Clear all zones and reset chart state
  xDimensions.value = []
  yMetrics.value = []
  breakdowns.value = []
  filters.value = []
  joins.value = []
  rows.value = []
  columns.value = []
  serverError.value = null
  serverWarnings.value = []
  useSql.value = false
  overrideSql.value = false
  sqlText.value = ''
  actualExecutedSql.value = ''
  chartTitle.value = ''
}

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

function handleLoadChartState(state: {
  dataConnectionId: number | null
  useSql: boolean
  overrideSql: boolean
  sqlText: string
  actualExecutedSql: string
  selectedDatasetId: string | null
  xDimensions: any[]
  yMetrics: any[]
  breakdowns: any[]
  filters?: any[]
  excludeNullsInDimensions: boolean
  appearance: any
  chartType: string
  chartName?: string
}) {
  // Set connection ID if provided
  if (state.dataConnectionId !== null) {
    setSelectedConnectionId(state.dataConnectionId)
  }

  // Set all the state values
  useSql.value = state.useSql
  overrideSql.value = state.overrideSql
  sqlText.value = state.sqlText
  actualExecutedSql.value = state.actualExecutedSql
  chartType.value = state.chartType as typeof chartType.value

  // Set the report state values directly
  xDimensions.value = state.xDimensions || []
  yMetrics.value = state.yMetrics || []
  breakdowns.value = state.breakdowns || []
  filters.value = state.filters || []
  excludeNullsInDimensions.value = state.excludeNullsInDimensions || false
  appearance.value = state.appearance || {}

  // Set chart title if provided
  if (state.chartName) {
    chartTitle.value = state.chartName
  }

  // Auto-run the query after loading state
  nextTick(async () => {
    try {
      if (useSql.value && overrideSql.value && sqlText.value.trim()) {
        // Run SQL directly if override mode is enabled
        await onRunSql(true)
      } else if ((xDimensions.value.length > 0 || yMetrics.value.length > 0) && canAutoPreview.value) {
        // Run preview if we have data to visualize
        await onTestPreview()
      }
    } catch (error) {
      console.warn('Failed to auto-run query after loading chart state:', error)
    }
  })
}

function backToDashboard() {
  if (!props.dashboardId) return
  navigateTo(`/dashboards/${props.dashboardId}`)
}

function discardAndReturn() {
  if (!props.dashboardId) return
  navigateTo(`/dashboards/${props.dashboardId}/edit`)
}

async function captureChartMeta(): Promise<{ width?: number | null; height?: number | null; thumbnailBase64?: string | null }> {
  if (typeof window === 'undefined') return {}
  const rect = previewAreaRef.value?.getBoundingClientRect()
  let width = rect && rect.width > 0 ? Math.round(rect.width) : undefined
  let height = rect && rect.height > 0 ? Math.round(rect.height) : undefined
  let thumbnailBase64: string | null | undefined

  const component = chartComponentRef.value as any
  if (component && typeof component.captureSnapshot === 'function') {
    const snapshot = await component.captureSnapshot()
    if (snapshot?.width) width = snapshot.width
    if (snapshot?.height) height = snapshot.height
    if (snapshot?.dataUrl) thumbnailBase64 = snapshot.dataUrl
  }

  return {width: width ?? null, height: height ?? null, thumbnailBase64: thumbnailBase64 ?? null}
}

/**
 * Convert pixel dimensions to grid layout units for dashboard positioning.
 * Dashboard grid uses colNum: 12 and rowHeight: 30.
 */
function pixelDimensionsToGridUnits(width?: number | null, height?: number | null): { w: number; h: number } {
  const ROW_HEIGHT = 30
  const COL_NUM = 12
  const CONTAINER_WIDTH = 1200 // Approximate dashboard container width

  // Default fallback values (increased h from 4 to 8 for better visibility)
  const DEFAULT_W = 6
  const DEFAULT_H = 8

  // Calculate grid width (w) - map pixel width to grid columns
  let w = DEFAULT_W
  if (width && width > 0) {
    const fraction = Math.min(width / CONTAINER_WIDTH, 1)
    w = Math.max(2, Math.min(COL_NUM, Math.round(fraction * COL_NUM)))
  }

  // Calculate grid height (h) - convert pixels to row units
  let h = DEFAULT_H
  if (height && height > 0) {
    h = Math.max(4, Math.ceil(height / ROW_HEIGHT))
  }

  return { w, h }
}

async function saveExistingChart(): Promise<boolean> {
  if (!props.editingChartId) return false

  let wasSaved = false
  try {
    loading.value = true

    // Get current report state
    const reportState = {
      selectedDatasetId: selectedDatasetId.value,
      dataConnectionId: selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId(),
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      breakdowns: breakdowns.value,
      filters: filters.value,
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

    const chartMeta = await captureChartMeta()

    // Update the existing chart
    const result = await $fetch<{ success: boolean }>('/api/reporting/charts', {
      method: 'PUT',
      body: {
        id: props.editingChartId,
        name: chartTitle.value || 'Untitled Chart',
        state: reportState,
        width: chartMeta.width,
        height: chartMeta.height,
        thumbnailBase64: chartMeta.thumbnailBase64
      }
    })

    if (result.success) {
      wasSaved = true
      // Show success toast
      toast.add({
        title: 'Chart Saved Successfully',
        description: 'Your chart has been updated.',
        color: 'green'
      })
    } else {
      throw new Error('Failed to save chart')
    }
  } catch (error) {
    console.error('Failed to save chart:', error)
    toast.add({
      title: 'Save Failed',
      description: 'Failed to save chart. Please try again.',
      color: 'red'
    })
  } finally {
    loading.value = false
  }

  return wasSaved
}

async function handleSaveToDashboard(data: { saveAsName: string; selectedDestination: string; selectedDashboardId?: string; selectedTabId?: string; newDashboardName?: string }) {
  try {
    loading.value = true

    // Get current report state
    const reportState = {
      selectedDatasetId: selectedDatasetId.value,
      dataConnectionId: selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId(),
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      breakdowns: breakdowns.value,
      filters: filters.value,
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

    const chartMeta = await captureChartMeta()

    // Save the chart - prefer chartTitle if set, otherwise use modal's saveAsName
    const chartName = chartTitle.value || data.saveAsName || 'Untitled Chart'
    const chartResult = await createChart({
      name: chartName,
      state: reportState,
      width: chartMeta.width,
      height: chartMeta.height,
      thumbnailBase64: chartMeta.thumbnailBase64
    })

    if (!chartResult.success) {
      throw new Error('Failed to save chart')
    }

    let dashboardId: string
    let successMessage: string

    if (data.selectedDestination === 'new') {
      // Create the dashboard
      const dashboardResult = await createDashboard({
        name: data.newDashboardName || data.saveAsName,
        isPublic: false
      })

      if (!dashboardResult.success) {
        throw new Error('Failed to create dashboard')
      }

      dashboardId = dashboardResult.dashboardId
      successMessage = `Chart "${chartName}" has been saved to a new dashboard!`
    } else if (data.selectedDestination === 'existing' && data.selectedDashboardId) {
      // Use existing dashboard
      dashboardId = data.selectedDashboardId
      successMessage = `Chart "${chartName}" has been saved to the existing dashboard!`
    } else {
      throw new Error('Invalid destination or missing dashboard ID')
    }

    // Create the dashboard-report relationship with position based on chart dimensions
    const { w, h } = pixelDimensionsToGridUnits(chartMeta.width, chartMeta.height)
    const position = {
      x: 0,
      y: 0,
      w,
      h,
      i: chartResult.chartId.toString()
    }

    await createDashboardReport({
      dashboardId: dashboardId,
      chartId: chartResult.chartId,
      position: position,
      tabId: data.selectedTabId
    })

    // Show success message BEFORE closing modal
    toast.add({
      title: 'Chart Saved Successfully',
      description: successMessage,
      color: 'green'
    })

    // Close modal after showing toast
    openSelectBoard.value = false

  } catch (error) {
    console.error('Failed to save chart to dashboard:', error)
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

async function saveNewChartDirectlyToDashboard(): Promise<boolean> {
  if (!props.dashboardId) return false
  try {
    loading.value = true

    const reportState = {
      selectedDatasetId: selectedDatasetId.value,
      dataConnectionId: selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId(),
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
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

    const chartMeta = await captureChartMeta()

    // Save the chart
    const chartResult = await createChart({
      name: chartTitle.value || 'Untitled Chart',
      state: reportState,
      width: chartMeta.width,
      height: chartMeta.height,
      thumbnailBase64: chartMeta.thumbnailBase64
    })

    if (!chartResult.success) {
      throw new Error('Failed to save chart')
    }

    // Calculate grid position from captured chart dimensions
    const { w, h } = pixelDimensionsToGridUnits(chartMeta.width, chartMeta.height)
    const position = {
      x: 0,
      y: 0,
      w,
      h,
      i: chartResult.chartId.toString()
    }

    await createDashboardReport({
      dashboardId: props.dashboardId,
      chartId: chartResult.chartId,
      position
    })

    toast.add({
      title: 'Chart Saved Successfully',
      description: 'Your chart has been added to the dashboard.',
      color: 'green'
    })

    return true
  } catch (error) {
    console.error('Failed to save chart to dashboard:', error)
    toast.add({
      title: 'Save Failed',
      description: 'Failed to save chart to dashboard. Please try again.',
      color: 'red'
    })
    return false
  } finally {
    loading.value = false
  }
}

async function doneAndReturn() {
  if (!props.dashboardId) return
  const target = `/dashboards/${props.dashboardId}/edit`

  if (props.editingChartId) {
    const saved = await saveExistingChart()
    if (saved) {
      await navigateTo(target)
    }
    return
  }

  const savedNew = await saveNewChartDirectlyToDashboard()
  if (savedNew) {
    await navigateTo(target)
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
    // When SQL override is used, actualExecutedSql should contain the overridden SQL that was executed
    if (overrideSql.value) {
      actualExecutedSql.value = sqlText.value
    }
  } finally {
    loading.value = false
  }
}

// Wrapper for template usage
function onRunSqlClick() {
  onRunSql(false)
}

// Helper to set chart title from parent (e.g. AI assistant)
function setTitle(title: string) {
  chartTitle.value = title
  const newAppearance = { ...appearance.value }
  newAppearance.chartTitle = title
  appearance.value = newAppearance
}

// Watcher to sync chartTitle input to appearance
watch(chartTitle, (newVal) => {
  if (appearance.value.chartTitle !== newVal) {
    const newAppearance = { ...appearance.value }
    newAppearance.chartTitle = newVal
    appearance.value = newAppearance
  }
})

// Apply SQL and chart type from AI or template
function applySqlAndChartType(sql: string, type: string, chartConfig?: any) {
  // Enable SQL mode and override
  useSql.value = true
  overrideSql.value = true
  sqlText.value = sql
  chartType.value = type as any
  
  if (chartConfig) {
    // Map AI chartConfig to our appearance model
    const newAppearance = { ...appearance.value }
    
    // Legend mapping
    if (chartConfig.legend) {
      newAppearance.showLegend = chartConfig.legend.show !== false
      if (chartConfig.legend.orient) newAppearance.legendPosition = chartConfig.legend.orient === 'vertical' ? 'right' : 'bottom'
    }

     // Title mapping
    if (chartConfig.title && chartConfig.title.text) {
      newAppearance.chartTitle = chartConfig.title.text
      chartTitle.value = chartConfig.title.text
    } else if (chartConfig.title && typeof chartConfig.title === 'string') {
        newAppearance.chartTitle = chartConfig.title
        chartTitle.value = chartConfig.title
    }
    
    // Axis mapping
    if (chartConfig.xAxis) {
      if (!newAppearance.xAxis) newAppearance.xAxis = {}
      if (chartConfig.xAxis.name) newAppearance.xAxis.title = chartConfig.xAxis.name
      newAppearance.xAxis.showTitle = !!chartConfig.xAxis.name
    }
    
    if (chartConfig.yAxis) {
      if (!newAppearance.yAxis) newAppearance.yAxis = {}
      if (chartConfig.yAxis.name) newAppearance.yAxis.title = chartConfig.yAxis.name
      newAppearance.yAxis.showTitle = !!chartConfig.yAxis.name
    }

    appearance.value = newAppearance
  }
  
  // Trigger preview
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

// Debug panel functions
function applyDebugConfig() {
  debugConfigError.value = ''
  debugConfigSuccess.value = ''
  
  try {
    const config = JSON.parse(debugJsonConfig.value)
    const changes: string[] = []
    
    // Apply chart type
    if (config.chartType) {
      const validTypes = chartTypes.map(t => t.value)
      if (validTypes.includes(config.chartType)) {
        const oldType = chartType.value
        chartType.value = config.chartType as typeof chartType.value
        if (oldType !== chartType.value) changes.push(`chartType: ${oldType} → ${chartType.value}`)
      }
    }
    
    // Apply zones - use spread to create new array references for Vue reactivity
    if (Array.isArray(config.xDimensions)) {
      const oldLen = xDimensions.value.length
      xDimensions.value = [...config.xDimensions]
      changes.push(`xDimensions: ${oldLen} → ${xDimensions.value.length} items`)
    }
    if (Array.isArray(config.yMetrics)) {
      const oldLen = yMetrics.value.length
      yMetrics.value = [...config.yMetrics]
      changes.push(`yMetrics: ${oldLen} → ${yMetrics.value.length} items`)
    }
    if (Array.isArray(config.breakdowns)) {
      const oldLen = breakdowns.value.length
      breakdowns.value = [...config.breakdowns]
      changes.push(`breakdowns: ${oldLen} → ${breakdowns.value.length} items`)
    }
    if (Array.isArray(config.filters)) {
      const oldLen = filters.value.length
      filters.value = [...config.filters]
      changes.push(`filters: ${oldLen} → ${filters.value.length} items`)
    }
    if (Array.isArray(config.joins)) {
      const oldLen = joins.value.length
      joins.value = [...config.joins]
      changes.push(`joins: ${oldLen} → ${joins.value.length} items`)
    }
    
    // Determine the correct datasetId from config fields
    // This prevents CROSS JOIN issues when config tables differ from UI-selected dataset
    const configTables = new Set<string>()
    const addTable = (field: any) => {
      if (field?.table && typeof field.table === 'string') {
        configTables.add(field.table)
      }
    }
    ;(config.xDimensions || []).forEach(addTable)
    ;(config.yMetrics || []).forEach(addTable)
    ;(config.breakdowns || []).forEach(addTable)
    ;(config.filters || []).forEach(addTable)
    
    if (configTables.size > 0) {
      // Use the first table from xDimensions, or yMetrics as the base dataset
      const primaryTable = config.xDimensions?.[0]?.table 
        || config.yMetrics?.[0]?.table 
        || Array.from(configTables)[0]
      
      if (primaryTable && primaryTable !== selectedDatasetId.value) {
        const oldDatasetId = selectedDatasetId.value
        setSelectedDatasetId(primaryTable)
        changes.push(`datasetId: ${oldDatasetId ?? 'null'} → ${primaryTable}`)
        console.log('[Debug Config] Updated selectedDatasetId to match config tables:', primaryTable)
      }
    }
    
    // Apply appearance
    if (config.appearance && typeof config.appearance === 'object') {
      appearance.value = { ...appearance.value, ...config.appearance }
      changes.push('appearance updated')
    }
    
    // Apply SQL settings
    if (typeof config.useSql === 'boolean') {
      useSql.value = config.useSql
      changes.push(`useSql: ${config.useSql}`)
    }
    if (typeof config.overrideSql === 'boolean') {
      overrideSql.value = config.overrideSql
    }
    if (typeof config.sqlText === 'string') {
      sqlText.value = config.sqlText
      if (config.sqlText) changes.push('sqlText set')
    }
    
    // Apply chart title
    if (typeof config.chartTitle === 'string') {
      chartTitle.value = config.chartTitle
      if (config.chartTitle) changes.push(`title: ${config.chartTitle}`)
    }
    
    // Apply excludeNullsInDimensions
    if (typeof config.excludeNullsInDimensions === 'boolean') {
      excludeNullsInDimensions.value = config.excludeNullsInDimensions
    }
    
    // Build success message with debug info
    const connectionId = selectedConnectionId.value ?? props.connectionId ?? getUrlConnectionId()
    const previewInfo = canAutoPreview.value 
      ? `Preview will run (connectionId: ${connectionId})` 
      : `No auto-preview (canAutoPreview: false, hasData: ${xDimensions.value.length > 0 || yMetrics.value.length > 0})`
    
    debugConfigSuccess.value = `Applied: ${changes.join(', ')}. ${previewInfo}`
    console.log('[Debug Config] Applied config:', { config, changes, canAutoPreview: canAutoPreview.value, connectionId })
    
    // Auto-run preview/SQL after applying config
    nextTick(async () => {
      if (useSql.value && overrideSql.value && sqlText.value.trim()) {
        await onRunSql(true)
      } else if (canAutoPreview.value) {
        console.log('[Debug Config] Running preview...')
        await onTestPreview()
        console.log('[Debug Config] Preview complete, rows:', rows.value.length)
      } else {
        console.log('[Debug Config] Skipping preview - canAutoPreview is false')
      }
    })
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      debugConfigSuccess.value = ''
    }, 3000)
    
  } catch (e: any) {
    debugConfigError.value = `Invalid JSON: ${e.message}`
  }
}

// Apply AI-returned ECharts chartConfig (different format than builder state)
function applyAiChartConfig() {
  debugConfigError.value = ''
  debugConfigSuccess.value = ''
  
  try {
    const config = JSON.parse(debugJsonConfig.value)
    const changes: string[] = []
    
    // Infer chart type from series if present
    if (config.series && Array.isArray(config.series) && config.series.length > 0) {
      const seriesType = config.series[0].type
      if (seriesType) {
        const mappedType = seriesType === 'doughnut' ? 'donut' : seriesType
        const validTypes = chartTypes.map(t => t.value)
        if (validTypes.includes(mappedType)) {
          const oldType = chartType.value
          chartType.value = mappedType as typeof chartType.value
          if (oldType !== mappedType) changes.push(`chartType: ${oldType} → ${mappedType}`)
        }
      }
    }
    
    // Extract title if present
    if (config.title?.text && typeof config.title.text === 'string') {
      chartTitle.value = config.title.text
      changes.push(`title: ${config.title.text}`)
    }
    
    // Store the ECharts config in appearance for the chart component to use
    // The chart component can read this and apply it directly
    const echartsAppearance: Record<string, any> = {}
    
    // Copy relevant ECharts options to appearance
    if (config.legend) echartsAppearance.legend = config.legend
    if (config.tooltip) echartsAppearance.tooltip = config.tooltip
    if (config.xAxis) echartsAppearance.xAxis = config.xAxis
    if (config.yAxis) echartsAppearance.yAxis = config.yAxis
    if (config.grid) echartsAppearance.grid = config.grid
    if (config.color) echartsAppearance.color = config.color
    if (config.series) echartsAppearance.series = config.series
    
    if (Object.keys(echartsAppearance).length > 0) {
      appearance.value = { ...appearance.value, echartsOverride: echartsAppearance }
      changes.push('ECharts options stored in appearance.echartsOverride')
    }
    
    debugConfigSuccess.value = `Applied AI config: ${changes.join(', ')}`
    console.log('[AI Chart Config] Applied:', { config, changes })
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      debugConfigSuccess.value = ''
    }, 3000)
    
  } catch (e: any) {
    debugConfigError.value = `Invalid JSON: ${e.message}`
  }
}

function exportCurrentConfig() {
  const config = {
    chartType: chartType.value,
    chartTitle: chartTitle.value,
    xDimensions: xDimensions.value,
    yMetrics: yMetrics.value,
    breakdowns: breakdowns.value,
    filters: filters.value,
    joins: joins.value,
    appearance: appearance.value,
    excludeNullsInDimensions: excludeNullsInDimensions.value,
    useSql: useSql.value,
    overrideSql: overrideSql.value,
    sqlText: sqlText.value
  }
  
  debugJsonConfig.value = JSON.stringify(config, null, 2)
  debugConfigSuccess.value = 'Current config exported to textarea'
  
  // Clear success message after 3 seconds
  setTimeout(() => {
    debugConfigSuccess.value = ''
  }, 3000)
}

// Set debug JSON config from outside (e.g., AI response)
function setDebugJsonConfig(config: any) {
  debugJsonConfig.value = typeof config === 'string' ? config : JSON.stringify(config, null, 2)
  debugPanelOpen.value = true  // Auto-open the panel so user can see it
}

defineExpose({
  applySqlAndChartType,
  setTitle,
  getCurrentState,
  handleLoadChartState,
  onTestPreview,
  setDebugJsonConfig
})


</script>

<style scoped>
</style>


