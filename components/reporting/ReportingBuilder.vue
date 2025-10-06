<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Reporting Builder</h2>
      <div class="space-x-2">
        <button class="px-3 py-2 border rounded" @click="onTestPreview" :disabled="!selectedDatasetId">Refresh</button>
        <button v-if="false" class="px-3 py-2 border rounded" @click="onUndo" :disabled="!canUndo">Undo</button>
        <button v-if="false" class="px-3 py-2 border rounded" @click="onRedo" :disabled="!canRedo">Redo</button>
        <button class="px-3 py-2 border rounded" @click="openReports = true">Save / Load</button>
      </div>
    </div>

    <div class="">

      <div>
        <h3 class="font-medium mb-2">Preview</h3>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <button v-for="t in chartTypes" :key="t.value" @click="chartType = t.value as any"
                    class="flex flex-col items-center justify-center w-16 h-16 rounded border"
                    :class="chartType === t.value ? 'border-primary bg-primary-50' : 'border-neutral-300 bg-white'">
              <Icon :name="t.icon" class="w-6 h-6" />
              <span class="text-xs mt-1">{{ t.label }}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm">Show SQL</label>
            <input type="checkbox" v-model="useSql" />
          </div>
        </div>
        <div v-if="useSql" class="mb-3">
          <div class="flex items-center gap-3 mb-1">
            <label class="text-sm">Override SQL</label>
            <input type="checkbox" v-model="overrideSql" />
          </div>
          <textarea :readonly="!overrideSql" v-model="sqlTextComputed" class="w-full h-32 border rounded p-2 font-mono text-xs" placeholder="SELECT * FROM your_table LIMIT 100"></textarea>
          <div class="mt-2 space-x-2">
            <button class="px-3 py-1 border rounded" @click="onRunSql" :disabled="!overrideSql">Run SQL</button>
            <span class="text-xs text-gray-500">Only SELECT queries allowed; LIMIT enforced.</span>
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

const { runPreview, runSql, selectedDatasetId, selectedConnectionId } = useReportingService()
const { xDimensions, yMetrics, filters, breakdowns, appearance, joins, undo, redo, canUndo, canRedo } = useReportState()
const loading = ref(false)
const rows = ref<Array<Record<string, unknown>>>([])
const columns = ref<Array<{ key: string; label: string }>>([])
const serverError = ref<string | null>(null)
const serverWarnings = ref<string[]>([])
const chartType = ref<'table' | 'bar' | 'line' | 'pie' | 'donut' | 'kpi'>('table')
const chartComponent = computed(() => chartType.value === 'table' ? ReportingPreview : ReportingChart)
const openReports = ref(false)
const useSql = ref(false)
const overrideSql = ref(false)
const sqlText = ref('')

const chartTypes = [
  { value: 'table', label: 'Table', icon: 'heroicons:table-cells' },
  { value: 'bar', label: 'Bar', icon: 'heroicons:chart-bar' },
  { value: 'line', label: 'Line', icon: 'heroicons:chart-bar' },
  { value: 'pie', label: 'Pie', icon: 'heroicons:chart-pie' },
  { value: 'donut', label: 'Donut', icon: 'heroicons:circle-stack' },
  // { value: 'kpi', label: 'KPI', icon: 'heroicons:bolt' }
]

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
  get: () => (overrideSql.value ? sqlText.value : sqlGenerated.value),
  set: (v: string) => { sqlText.value = v }
})

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
      joins: joins.value as any,
      limit: 100,
      connectionId: selectedConnectionId.value as any
    })
    rows.value = res.rows
    columns.value = res.columns
    serverError.value = (res.meta as any)?.error || null
    serverWarnings.value = ((res.meta as any)?.warnings as string[]) || []
  } finally {
    loading.value = false
  }
}

// Auto preview on state change (debounced by Vue batching)
const canAutoPreview = computed(() => !!selectedDatasetId.value)
watch([selectedDatasetId, xDimensions, yMetrics, filters, breakdowns, joins], async () => {
  if (!canAutoPreview.value) return
  if (useSql.value) return
  await onTestPreview()
}, { deep: true })

function onUndo() { undo() }
function onRedo() { redo() }

async function onRunSql() {
  loading.value = true
  try {
    const res = await runSql(sqlText.value)
    rows.value = res.rows
    columns.value = res.columns
    chartType.value = 'table'
    serverError.value = (res.meta as any)?.error || null
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
</style>


