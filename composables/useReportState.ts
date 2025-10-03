import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from '#imports'

export type ReportField = {
  fieldId: string
  name?: string
  label?: string
  type?: string
}

export type MetricRef = ReportField & { aggregation?: string }
export type DimensionRef = ReportField & { sort?: 'asc' | 'desc' }
export type FilterRef = { field: ReportField; operator: string; value: any }

type ReportState = {
  selectedDatasetId: string | null
  xDimensions: DimensionRef[]
  yMetrics: MetricRef[]
  filters: FilterRef[]
  breakdowns: DimensionRef[]
  excludeNullsInDimensions?: boolean
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
const filtersRef = ref<FilterRef[]>([])
const breakdownsRef = ref<DimensionRef[]>([])
const excludeNullsInDimensionsRef = ref<boolean>(false)

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
    filters: filtersRef.value,
    breakdowns: breakdownsRef.value,
    excludeNullsInDimensions: excludeNullsInDimensionsRef.value
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
  filtersRef.value = s.filters || []
  breakdownsRef.value = s.breakdowns || []
  excludeNullsInDimensionsRef.value = !!s.excludeNullsInDimensions
}

function undo() {
  if (!canUndo()) return
  historyIndex -= 1
  isNavigatingHistory = true
  applySnapshot(historyStack[historyIndex])
  isNavigatingHistory = false
}

function redo() {
  if (!canRedo()) return
  historyIndex += 1
  isNavigatingHistory = true
  applySnapshot(historyStack[historyIndex])
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
    filtersRef.value = initial.filters || []
    breakdownsRef.value = initial.breakdowns || []
    excludeNullsInDimensionsRef.value = !!initial.excludeNullsInDimensions
    pushHistory(false)
  }

  const state = computed<ReportState>(() => ({
    selectedDatasetId: selectedDatasetIdRef.value,
    xDimensions: xDimensionsRef.value,
    yMetrics: yMetricsRef.value,
    filters: filtersRef.value,
    breakdowns: breakdownsRef.value,
    excludeNullsInDimensions: excludeNullsInDimensionsRef.value
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

  function addToZone(zone: 'x' | 'y' | 'filters' | 'breakdowns', item: ReportField) {
    if (zone === 'x') xDimensionsRef.value.push({ ...item })
    else if (zone === 'y') yMetricsRef.value.push({ ...item })
    else if (zone === 'breakdowns') breakdownsRef.value.push({ ...item })
  }

  function removeFromZone(zone: 'x' | 'y' | 'filters' | 'breakdowns', index: number) {
    if (zone === 'x') xDimensionsRef.value.splice(index, 1)
    else if (zone === 'y') yMetricsRef.value.splice(index, 1)
    else if (zone === 'breakdowns') breakdownsRef.value.splice(index, 1)
  }

  function moveInZone(zone: 'x' | 'y' | 'filters' | 'breakdowns', from: number, to: number) {
    const arr = zone === 'x' ? xDimensionsRef.value : zone === 'y' ? yMetricsRef.value : breakdownsRef.value
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
    const [it] = arr.splice(from, 1)
    arr.splice(to, 0, it)
  }

  return {
    // state
    selectedDatasetId: selectedDatasetIdRef,
    xDimensions: xDimensionsRef,
    yMetrics: yMetricsRef,
    filters: filtersRef,
    breakdowns: breakdownsRef,
    excludeNullsInDimensions: excludeNullsInDimensionsRef,
    // actions
    setSelectedDatasetId,
    addToZone,
    removeFromZone,
    moveInZone,
    syncUrlNow,
    // history
    undo,
    redo,
    canUndo: computed(() => canUndo()),
    canRedo: computed(() => canRedo())
  }
}


