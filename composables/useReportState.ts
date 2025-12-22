import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from '#imports'

export type ReportField = {
  fieldId: string
  name?: string
  label?: string
  type?: string
  table?: string
}

export type MetricRef = ReportField & {
  aggregation?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'MEDIAN' | 'VARIANCE' | 'DIST_COUNT' | string
  isNumeric?: boolean
}
export type DimensionRef = ReportField & {
  sort?: 'asc' | 'desc'
  dateInterval?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'quarters' | 'years' | 'day_of_week' | 'month_of_year'
  // Filter values for text/numeric fields
  filterValues?: string[]
  filterMode?: 'include' | 'exclude'
  // Date range filter for date fields
  dateRangeStart?: string
  dateRangeEnd?: string
  dateRangeType?: 'static' | 'dynamic'
  dynamicRange?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'this_quarter' | 'this_year'
}
export type JoinRef = {
  constraintName: string
  sourceTable: string
  targetTable: string
  joinType: 'inner' | 'left'
  columnPairs: Array<{ position: number; sourceColumn: string; targetColumn: string }>
}

type ReportState = {
  selectedDatasetId: string | null
  xDimensions: DimensionRef[]
  yMetrics: MetricRef[]
  breakdowns: DimensionRef[]
  excludeNullsInDimensions?: boolean
  appearance?: {
    // General
    fontFamily?: string
    chartTitle?: string

    // Labels
    showLabels?: boolean
    showLabelsPercent?: boolean
    labelsInside?: boolean
    labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }

    // Legend
    showLegend?: boolean
    legendPosition?: 'top' | 'bottom' | 'left' | 'right'
    legendTitle?: string
    legendFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }

    // Background
    backgroundColor?: string
    backgroundTransparent?: boolean

    // X Axis
    xAxis?: {
      showTitle?: boolean
      title?: string
      titleFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      showLabels?: boolean
      labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      allowTextWrap?: boolean
      showLine?: boolean
      lineColor?: string
      lineWidth?: number
    }
    xAxisLabel?: string  // Legacy - kept for backwards compatibility

    // Y Axis
    yAxis?: {
      showTitle?: boolean
      title?: string
      titleFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      showLabels?: boolean
      labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      numberFormat?: {
        type?: 'auto' | 'number' | 'percentage' | 'currency' | 'custom'
        prefix?: string
        suffix?: string
        separator?: 'comma' | 'space' | 'none'
        decimalPlaces?: number | 'auto'
      }
      scale?: {
        min?: number | null
        max?: number | null
        interval?: number | null
      }
    }
    yAxisLabel?: string  // Legacy - kept for backwards compatibility

    // Pie/Donut specific
    showAsDonut?: boolean

    // Table specific
    table?: {
      textAlign?: 'left' | 'center' | 'right' | 'justify'
      oddRowColor?: string
      evenRowColor?: string
      borderStyle?: 'all' | 'vertical' | 'horizontal' | 'none'
      borderType?: 'solid' | 'dashed'
      borderColor?: string
      borderWidth?: number
      rowHeight?: number
      allowTextWrap?: boolean
      switchRowColumn?: boolean
      showHeader?: boolean
      headerFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      headerBgColor?: string
      showTotal?: boolean
      totalFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      totalBgColor?: string
    }

    // Existing (kept for backwards compatibility)
    numberFormat?: {
      decimalPlaces?: number
      thousandsSeparator?: boolean
    }
    dateFormat?: string
    palette?: string[]
    stacked?: boolean
  }
  joins?: JoinRef[]
}

function encodeState(state: ReportState): string {
  try {
    const json = JSON.stringify(state)
    if (typeof window !== 'undefined') {
      return btoa(unescape(encodeURIComponent(json)))
    }
    // Server-side
    return Buffer.from(json, 'utf8').toString('base64')
  } catch {
    return ''
  }
}

function decodeState(encoded: string | null): ReportState | null {
  if (!encoded) return null
  try {
    if (typeof window !== 'undefined') {
      const json = decodeURIComponent(escape(atob(encoded)))
      return JSON.parse(json)
    }
    // Server-side
    const json = Buffer.from(encoded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

const selectedDatasetIdRef = ref<string | null>(null)
const xDimensionsRef = ref<DimensionRef[]>([])
const yMetricsRef = ref<MetricRef[]>([])
const breakdownsRef = ref<DimensionRef[]>([])
const excludeNullsInDimensionsRef = ref<boolean>(false)
const appearanceRef = ref<ReportState['appearance']>({
  chartTitle: '',
  xAxisLabel: '',
  yAxisLabel: '',
  legendTitle: '',
  numberFormat: { decimalPlaces: 0, thousandsSeparator: true },
  dateFormat: '',
  palette: [],
  stacked: false,
  legendPosition: 'top'
})
const joinsRef = ref<JoinRef[]>([])

// History stack
type Snapshot = ReportState
const historyStack: Snapshot[] = []
let historyIndex = -1
const HISTORY_LIMIT = 50
let lastPushTs = 0
const COALESCE_MS = 300
let isNavigatingHistory = false

function snapshot(): Snapshot {
  return JSON.parse(JSON.stringify({
    selectedDatasetId: selectedDatasetIdRef.value,
    xDimensions: xDimensionsRef.value,
    yMetrics: yMetricsRef.value,
    breakdowns: breakdownsRef.value,
    excludeNullsInDimensions: excludeNullsInDimensionsRef.value,
    appearance: appearanceRef.value,
    joins: joinsRef.value
  }))
}

function pushHistory(coalesce = true) {
  const now = Date.now()
  if (coalesce && historyIndex >= 0 && now - lastPushTs < COALESCE_MS) {
    historyStack[historyIndex] = snapshot()
    lastPushTs = now
    return
  }
  // Trim redo branch
  historyStack.splice(historyIndex + 1)
  // Push
  historyStack.push(snapshot())
  if (historyStack.length > HISTORY_LIMIT) historyStack.shift()
  historyIndex = historyStack.length - 1
  lastPushTs = now
}

function canUndo() { return historyIndex > 0 }
function canRedo() { return historyIndex >= 0 && historyIndex < historyStack.length - 1 }

function applySnapshot(s: Snapshot) {
  selectedDatasetIdRef.value = s.selectedDatasetId
  xDimensionsRef.value = s.xDimensions || []
  yMetricsRef.value = s.yMetrics || []
  breakdownsRef.value = s.breakdowns || []
  excludeNullsInDimensionsRef.value = !!s.excludeNullsInDimensions
  appearanceRef.value = s.appearance || {}
  joinsRef.value = s.joins || []
}

function undo() {
  if (!canUndo()) return
  historyIndex -= 1
  isNavigatingHistory = true
  const s = historyStack[historyIndex]
  if (s) applySnapshot(s)
  isNavigatingHistory = false
}

function redo() {
  if (!canRedo()) return
  historyIndex += 1
  isNavigatingHistory = true
  const s = historyStack[historyIndex]
  if (s) applySnapshot(s)
  isNavigatingHistory = false
}

export function useReportState() {
  const route = useRoute()
  const router = useRouter()

  // Initialize from URL if available
  const initial = decodeState((route.query.r as string) || null)
  if (initial) {
    selectedDatasetIdRef.value = initial.selectedDatasetId
    xDimensionsRef.value = initial.xDimensions || []
    yMetricsRef.value = initial.yMetrics || []
    pushHistory(false)
  }

  const state = computed<ReportState>(() => ({
    selectedDatasetId: selectedDatasetIdRef.value,
    xDimensions: xDimensionsRef.value,
    yMetrics: yMetricsRef.value,
    breakdowns: breakdownsRef.value,
    excludeNullsInDimensions: excludeNullsInDimensionsRef.value,
    appearance: appearanceRef.value,
    joins: joinsRef.value
  }))

  // Sync to URL on client only (avoid SSR hydration mismatches)
  if (process.client) {
    watch(state, (s) => {
      if (!isNavigatingHistory) {
        pushHistory()
      }
      const encoded = encodeState(s)
      try {
        const url = new URL(window.location.href)
        if (encoded) {
          url.searchParams.set('r', encoded)
        } else {
          url.searchParams.delete('r')
        }
        window.history.replaceState({}, '', url.toString())
      } catch {
        router.replace({ query: { ...route.query, r: encoded || undefined } })
      }
    }, { deep: true })
  }

  function syncUrlNow() {
    if (!process.client) return
    const encoded = encodeState(state.value)
    try {
      const url = new URL(window.location.href)
      if (encoded) {
        url.searchParams.set('r', encoded)
      } else {
        url.searchParams.delete('r')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      router.replace({ query: { ...route.query, r: encoded || undefined } })
    }
  }

  function setSelectedDatasetId(id: string | null) {
    selectedDatasetIdRef.value = id
  }

  function addToZone(zone: 'x' | 'y' | 'breakdowns', item: ReportField) {
    if (zone === 'x') xDimensionsRef.value.push({ ...item })
    else if (zone === 'y') yMetricsRef.value.push({ ...item })
    else if (zone === 'breakdowns') breakdownsRef.value.push({ ...item })
  }

  function removeFromZone(zone: 'x' | 'y' | 'breakdowns', index: number) {
    if (zone === 'x') xDimensionsRef.value.splice(index, 1)
    else if (zone === 'y') yMetricsRef.value.splice(index, 1)
    else if (zone === 'breakdowns') breakdownsRef.value.splice(index, 1)
  }

  function moveInZone(zone: 'x' | 'y' | 'breakdowns', from: number, to: number) {
    if (zone === 'x') {
      const arr = xDimensionsRef.value
      const [it] = arr.splice(from, 1)
      if (it) arr.splice(to, 0, it)
    } else if (zone === 'y') {
      const arr = yMetricsRef.value
      const [it] = arr.splice(from, 1)
      if (it) arr.splice(to, 0, it)
    } else if (zone === 'breakdowns') {
      const arr = breakdownsRef.value
      const [it] = arr.splice(from, 1)
      if (it) arr.splice(to, 0, it)
    }
  }

  function updateFieldInZone(zone: 'x' | 'y' | 'breakdowns', index: number, updates: Partial<MetricRef & DimensionRef>) {
    if (zone === 'x' && xDimensionsRef.value[index]) {
      xDimensionsRef.value[index] = {...xDimensionsRef.value[index], ...updates}
    } else if (zone === 'y' && yMetricsRef.value[index]) {
      yMetricsRef.value[index] = {...yMetricsRef.value[index], ...updates}
    } else if (zone === 'breakdowns' && breakdownsRef.value[index]) {
      breakdownsRef.value[index] = {...breakdownsRef.value[index], ...updates}
    }
  }

  return {
    // state
    selectedDatasetId: selectedDatasetIdRef,
    xDimensions: xDimensionsRef,
    yMetrics: yMetricsRef,
    breakdowns: breakdownsRef,
    excludeNullsInDimensions: excludeNullsInDimensionsRef,
    appearance: appearanceRef,
    joins: joinsRef,
    // actions
    setSelectedDatasetId,
    addToZone,
    removeFromZone,
    moveInZone,
    updateFieldInZone,
    syncUrlNow,
    // history
    undo,
    redo,
    canUndo: computed(() => canUndo()),
    canRedo: computed(() => canRedo()),
    // joins
    addJoin(j: JoinRef) { joinsRef.value.push(j) },
    removeJoin(index: number) { joinsRef.value.splice(index, 1) }
  }
}


