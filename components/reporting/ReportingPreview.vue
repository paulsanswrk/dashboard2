<template>
  <div ref="previewRef" class="h-full">
    <div v-if="loading" class="text-gray-500">Loading preview...</div>
    <div v-else class="h-full">
      <div v-if="!rows.length" class="text-gray-500">No data</div>
      <div v-else class="overflow-auto border rounded text-black reporting-preview-scroll" :style="containerStyle">
        <table class="min-w-full" :style="tableStyle">
          <thead v-if="showHeader" :style="headerStyle">
            <tr>
              <th
                  v-for="(col, colIdx) in displayColumns"
                  :key="col.key"
                  :class="headerCellClass"
                  :style="headerCellStyle"
                  @click="handleHeaderClick(colIdx, col.key)"
              >
                <span class="reporting-preview-header-content">
                  <span>{{ col.label }}</span>
                  <span v-if="sortColumn === col.key" class="reporting-preview-sort-indicator">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>
              <!-- Total Column Header -->
              <th v-if="showTotalColumn" :style="totalColumnHeaderStyle">
                {{ totalColumnAggregation === 'sum' ? 'Total' : totalColumnAggregation.charAt(0).toUpperCase() + totalColumnAggregation.slice(1) }}
              </th>
            </tr>
          </thead>
          <tbody>
          <tr
              v-for="(row, idx) in sortedRows"
              :key="idx"
              :style="rowStyle(idx)"
          >
            <td
                v-for="(col, colIdx) in displayColumns"
                :key="col.key"
                :class="cellClass"
                :style="getColumnCellStyle(col.key)"
                @click="handleCellClick(colIdx)"
            >
              {{ formatCellValue(row[col.key], col.key) }}
            </td>
            <!-- Total Column Cell -->
            <td v-if="showTotalColumn" :style="totalColumnStyle">
              {{ calculateRowTotal(row) }}
            </td>
          </tr>
          <!-- Total Row -->
          <tr v-if="showTotal" :style="totalRowStyle">
            <td
                v-for="(col, colIdx) in displayColumns"
                :key="col.key"
                :class="cellClass"
                :style="totalCellStyle"
            >
              {{ colIdx === 0 ? 'Total' : calculateTotal(col.key) }}
            </td>
            <!-- Grand Total Cell (Bottom-Right) -->
            <td v-if="showTotalColumn" :style="totalColumnStyle">
              {{ calculateGrandTotal() }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'

const previewRef = ref<HTMLElement | null>(null)

const props = defineProps<{
  loading: boolean
  rows: Array<Record<string, unknown>>
  columns: Array<{ key: string; label: string }>
  appearance?: Record<string, any>
  interactive?: boolean
}>()

const emit = defineEmits<{
  'header-click': [columnIndex: number]
  'cell-click': [columnIndex: number, columnKey: string, columnLabel: string]
}>()

// Sort state
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Get the table settings from the nested appearance.table object
const tableConfig = computed(() => props.appearance?.table || {})
const numberFormat = computed(() => props.appearance?.yAxis?.numberFormat || {})

// Table settings with defaults
const showHeader = computed(() => tableConfig.value.showHeader ?? true)
const showTotal = computed(() => tableConfig.value.showTotal ?? false)
const showTotalColumn = computed(() => tableConfig.value.showTotalColumn ?? false)
const totalColumnAggregation = computed(() => tableConfig.value.totalColumnAggregation || 'sum')
const textAlign = computed(() => tableConfig.value.textAlign || 'left')
const allowTextWrap = computed(() => tableConfig.value.allowTextWrap ?? false)
const switchRowColumn = computed(() => tableConfig.value.switchRowColumn ?? false)
const rowHeight = computed(() => tableConfig.value.rowHeight || 32)
const fontSize = computed(() => tableConfig.value.fontSize)

// Colors
const oddRowColor = computed(() => tableConfig.value.oddRowColor)
const evenRowColor = computed(() => tableConfig.value.evenRowColor)
const headerBgColor = computed(() => tableConfig.value.headerBgColor || '#f8fafc')
const totalBgColor = computed(() => tableConfig.value.totalBgColor || '#f3f4f6')
const totalColumnBgColor = computed(() => tableConfig.value.totalColumnBgColor || '#f3f4f6')

// Border settings
const borderStyle = computed(() => tableConfig.value.borderStyle || 'all')
const borderType = computed(() => tableConfig.value.borderType || 'solid')
const borderColor = computed(() => tableConfig.value.borderColor || '#e5e7eb')
const borderWidth = computed(() => tableConfig.value.borderWidth || 1)

// Font settings
const fontFamily = computed(() => props.appearance?.fontFamily || 'inherit')
const headerFont = computed(() => tableConfig.value.headerFont || {})
const totalFont = computed(() => tableConfig.value.totalFont || {})
const totalColumnFont = computed(() => tableConfig.value.totalColumnFont || {})

// Per-column configuration overrides
const columnConfigs = computed(() => tableConfig.value.columns || {})

// Computed columns/rows for switchRowColumn feature
const displayColumns = computed(() => {
  if (!switchRowColumn.value) return props.columns
  // When switched, first column of data becomes headers
  if (!props.rows.length) return props.columns
  return props.rows.map((row, idx) => ({
    key: `row_${idx}`,
    label: String((props.columns[0]?.key ? row[props.columns[0].key] : null) || `Row ${idx + 1}`)
  }))
})

const displayRows = computed(() => {
  if (!switchRowColumn.value) return props.rows
  // Transpose: each original column (except first) becomes a row
  return props.columns.slice(1).map(col => {
    const row: Record<string, unknown> = {}
    props.rows.forEach((r, idx) => {
      row[`row_${idx}`] = r[col.key]
    })
    return row
  })
})

// Sorted rows (uses displayRows as source)
const sortedRows = computed(() => {
  const rows = displayRows.value
  if (!sortColumn.value) return rows

  const col = sortColumn.value
  const dir = sortDirection.value === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const va = a[col]
    const vb = b[col]
    // Nulls/undefined go to the end
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    // Numeric comparison
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir
    }
    // String comparison
    return String(va).localeCompare(String(vb)) * dir
  })
})

// Header click handler: toggle sort + emit event
function handleHeaderClick(colIdx: number, colKey: string) {
  // Toggle sorting
  if (sortColumn.value === colKey) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      // Third click: clear sort
      sortColumn.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = colKey
    sortDirection.value = 'asc'
  }
  // Emit for dashboard sidebar switching
  if (props.interactive) {
    emit('header-click', colIdx)
  }
}

// Cell click handler: emit event
function handleCellClick(colIdx: number) {
  if (props.interactive) {
    const col = displayColumns.value[colIdx]
    emit('cell-click', colIdx, col?.key || '', col?.label || '')
  }
}

// Styles
const containerStyle = computed(() => ({
  fontFamily: fontFamily.value,
  fontSize: fontSize.value ? `${fontSize.value}px` : undefined,
  height: '100%'
}))

const tableStyle = computed(() => ({
  borderCollapse: 'collapse' as const
}))

const headerStyle = computed(() => ({
  backgroundColor: headerBgColor.value,
  color: headerFont.value.color || 'inherit',
  fontSize: headerFont.value.size ? `${headerFont.value.size}px` : 'inherit',
  fontWeight: headerFont.value.bold ? 'bold' : 'normal',
  fontStyle: headerFont.value.italic ? 'italic' : 'normal',
  textDecoration: headerFont.value.underline ? 'underline' : 'none'
}))

const headerCellStyle = computed(() => ({
  textAlign: textAlign.value,
  padding: `${rowHeight.value / 4}px ${rowHeight.value / 2}px`,
  height: `${rowHeight.value}px`,
  whiteSpace: allowTextWrap.value ? 'normal' : 'nowrap',
  cursor: 'pointer',
  userSelect: 'none' as const,
  position: 'sticky' as const,
  top: '0',
  zIndex: 10,
  backgroundColor: headerBgColor.value,
  ...getBorderStyle()
}))

const cellStyle = computed(() => ({
  textAlign: textAlign.value,
  padding: `${rowHeight.value / 4}px ${rowHeight.value / 2}px`,
  height: `${rowHeight.value}px`,
  whiteSpace: allowTextWrap.value ? 'normal' : 'nowrap',
  ...getBorderStyle()
}))

// Per-column cell style: merges table-wide cellStyle with column-specific overrides
function getColumnCellStyle(colKey: string) {
  const base = cellStyle.value
  const colConfig = columnConfigs.value[colKey]
  if (!colConfig) return base
  const font = colConfig.font || {}
  return {
    ...base,
    ...(colConfig.textAlign ? { textAlign: colConfig.textAlign } : {}),
    ...(font.color ? { color: font.color } : {}),
    ...(font.size ? { fontSize: `${font.size}px` } : {}),
    ...(font.bold ? { fontWeight: 'bold' } : {}),
    ...(font.italic ? { fontStyle: 'italic' } : {})
  }
}

const totalRowStyle = computed(() => ({
  backgroundColor: totalBgColor.value,
  color: totalFont.value.color || 'inherit',
  fontSize: totalFont.value.size ? `${totalFont.value.size}px` : 'inherit',
  fontWeight: totalFont.value.bold ? 'bold' : 'normal',
  fontStyle: totalFont.value.italic ? 'italic' : 'normal',
  textDecoration: totalFont.value.underline ? 'underline' : 'none'
}))

const totalCellStyle = computed(() => ({
  textAlign: textAlign.value,
  padding: `${rowHeight.value / 4}px ${rowHeight.value / 2}px`,
  height: `${rowHeight.value}px`,
  fontWeight: 'bold',
  ...getBorderStyle()
}))

const totalColumnStyle = computed(() => ({
  backgroundColor: totalColumnBgColor.value,
  color: totalColumnFont.value.color || 'inherit',
  fontSize: totalColumnFont.value.size ? `${totalColumnFont.value.size}px` : 'inherit',
  fontWeight: totalColumnFont.value.bold ? 'bold' : 'normal',
  fontStyle: totalColumnFont.value.italic ? 'italic' : 'normal',
  textDecoration: totalColumnFont.value.underline ? 'underline' : 'none',
  padding: `${rowHeight.value / 4}px ${rowHeight.value / 2}px`,
  height: `${rowHeight.value}px`,
  textAlign: textAlign.value, // Align same as other cells? Or fixed right? Using table align for now.
  ...getBorderStyle()
}))

const totalColumnHeaderStyle = computed(() => ({
  ...headerCellStyle.value, // Inherit base sticky header styles
  backgroundColor: totalColumnBgColor.value || headerBgColor.value, // Use total col bg if set, else header bg
  color: totalColumnFont.value.color || headerFont.value.color,
  fontWeight: totalColumnFont.value.bold ? 'bold' : headerFont.value.bold ? 'bold' : 'normal'
  // We might want to separate this completely, but reusing header style structure is safer for alignment
}))

function getBorderStyle() {
  const border = `${borderWidth.value}px ${borderType.value} ${borderColor.value}`
  switch (borderStyle.value) {
    case 'all':
      return {border}
    case 'horizontal':
      return {borderTop: border, borderBottom: border}
    case 'vertical':
      return {borderLeft: border, borderRight: border}
    case 'none':
      return {}
    default:
      return {border}
  }
}

const cellClass = computed(() => ({}))

const headerCellClass = computed(() => ({
  'text-left': textAlign.value === 'left',
  'text-center': textAlign.value === 'center',
  'text-right': textAlign.value === 'right'
}))

function rowStyle(idx: number) {
  const color = idx % 2 === 0 ? oddRowColor.value : evenRowColor.value
  return color ? { backgroundColor: color } : {}
}

function formatCellValue(value: unknown, colKey?: string): string {
  if (value === null || value === undefined) return ''

  // Determine effective number format: per-column overrides > table-wide
  const colConfig = colKey ? (columnConfigs.value[colKey] || {}) : {}
  const colNf = colConfig.numberFormat || {}
  const effectiveNf = {
    decimalPlaces: colNf.decimalPlaces ?? numberFormat.value.decimalPlaces,
    separator: colNf.separator || numberFormat.value.separator,
    prefix: colNf.prefix ?? numberFormat.value.prefix,
    suffix: colNf.suffix ?? numberFormat.value.suffix
  }
  // Per-column prefix/suffix (from column-level, distinct from number format)
  const colPrefix = colConfig.prefix || ''
  const colSuffix = colConfig.suffix || ''

  if (typeof value === 'number') {
    let formatted = value
    const decimals = effectiveNf.decimalPlaces
    // Handle decimal places - 'auto' means don't modify
    if (typeof decimals === 'number') {
      formatted = Number(value.toFixed(decimals))
    }
    let str = String(formatted)

    // Handle separator: 'comma', 'space', or 'none'
    const separator = effectiveNf.separator || 'comma'
    if (separator !== 'none') {
      const parts = str.split('.')
      const sepChar = separator === 'space' ? ' ' : ','
      if (parts[0]) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sepChar)
      // For 'space' separator, use comma as decimal separator (European format)
      str = separator === 'space' ? parts.join(',') : parts.join('.')
    }

    if (effectiveNf.prefix) str = effectiveNf.prefix + str
    if (effectiveNf.suffix) str = str + effectiveNf.suffix
    // Apply column-level prefix/suffix on top
    return colPrefix + str + colSuffix
  }
  return colPrefix + String(value) + colSuffix
}

function calculateTotal(colKey: string): string {
  const values = props.rows.map(row => row[colKey]).filter(v => typeof v === 'number') as number[]
  if (!values.length) return ''
  const sum = values.reduce((acc, val) => acc + val, 0)
  return formatCellValue(sum)
}

function calculateGrandTotal(): string {
  // We want to aggregate the row totals
  // For 'sum', it's sum of sums.
  // For 'average', it's average of row averages (or average of all values? Usually grand total in pivots is aggr of underlying data)
  // But purely visually, a column total usually aggregates the column values.
  // Let's stick to aggregating the values that are in the "Total" column.

  const rowTotals: number[] = []
  sortedRows.value.forEach(row => {
    // We need to re-calculate the numeric value of the row total to aggregate it
    // This is a bit inefficient, doing it twice, but cleaner than storing state
    const values = getRowNumericValues(row)
    if (values.length > 0) {
       // Based on aggregation type, we get a single value per row
       // But wait, if we are doing "Sum", we want Sum of Row Sums.
       // If we are doing "Average", do we want Average of Row Averages? Yes, for the column total.
       // So we first get the *result* for each row.
       const val = calculateAggregation(values, totalColumnAggregation.value)
       if (typeof val === 'number') {
         rowTotals.push(val)
       }
    }
  })

  const grandTotal = calculateAggregation(rowTotals, totalColumnAggregation.value)
  return (grandTotal !== null && grandTotal !== undefined) ? formatCellValue(grandTotal) : ''
}

function getRowNumericValues(row: Record<string, unknown>): number[] {
  const values: number[] = []
  displayColumns.value.forEach(col => {
    const val = row[col.key]
    if (typeof val === 'number') {
      values.push(val)
    }
  })
  return values
}

function calculateRowTotal(row: Record<string, unknown>): string {
  const values = getRowNumericValues(row)
  const result = calculateAggregation(values, totalColumnAggregation.value)
  return (result !== null && result !== undefined) ? formatCellValue(result) : ''
}

function calculateAggregation(values: number[], type: string): number | null {
  if (values.length === 0) return null

  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'count':
      return values.length // Count of numeric values
    case 'distinctcount':
      return new Set(values).size
    case 'minimum':
      return Math.min(...values)
    case 'maximum':
      return Math.max(...values)
    case 'median':
      values.sort((a, b) => a - b)
      const mid = Math.floor(values.length / 2)
      if (values.length === 0) return null
      // Use ! to assert non-null because logic guarantees length > 0
      return values.length % 2 !== 0 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2
    case 'stddev':
    case 'variance':
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length // Population variance
      if (type === 'variance') return avgSquaredDiff
      return Math.sqrt(avgSquaredDiff)
    default:
      return values.reduce((a, b) => a + b, 0)
  }
}

async function captureSnapshot() {
  if (typeof window === 'undefined') return null
  const rect = previewRef.value?.getBoundingClientRect()
  const baseWidth = rect?.width && rect.width > 0 ? Math.round(rect.width) : 640
  const baseHeight = rect?.height && rect.height > 0 ? Math.round(rect.height) : 360

  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(baseWidth * scale))
  canvas.height = Math.max(1, Math.round(baseHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, baseWidth, baseHeight)
  ctx.fillStyle = '#111827'
  ctx.font = '16px sans-serif'
  ctx.fillText('Table Preview', 20, 32)

  const headers = (props.columns || []).slice(0, 4)
  headers.forEach((col, idx) => {
    ctx.font = '13px sans-serif'
    ctx.fillText(col.label || col.key, 20 + idx * 150, 60)
  })

  const rowsToDraw = Math.min((props.rows || []).length, 3)
  for (let r = 0; r < rowsToDraw; r++) {
    headers.forEach((col, idx) => {
      const value = (props.rows?.[r] as any)?.[col.key]
      ctx.font = '12px sans-serif'
      ctx.fillText(String(value ?? ''), 20 + idx * 150, 90 + r * 26)
    })
  }

  const dataUrl = canvas.toDataURL('image/png')
  return {dataUrl, width: baseWidth, height: baseHeight}
}

defineExpose({
  captureSnapshot
})
</script>

<style scoped>
.reporting-preview-scroll {
  overflow-x: auto;
  overflow-y: auto;
}

.reporting-preview-header-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reporting-preview-sort-indicator {
  font-size: 0.75em;
  opacity: 0.7;
  line-height: 1;
}
</style>
