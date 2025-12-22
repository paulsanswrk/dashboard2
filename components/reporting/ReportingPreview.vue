<template>
  <div ref="previewRef">
    <div v-if="loading" class="text-gray-500">Loading preview...</div>
    <div v-else>
      <div v-if="!rows.length" class="text-gray-500">No data</div>
      <div v-else class="overflow-auto border rounded text-black" :style="containerStyle">
        <table class="min-w-full" :style="tableStyle">
          <thead v-if="showHeader" :style="headerStyle">
            <tr>
              <th
                  v-for="col in displayColumns"
                  :key="col.key"
                  :class="headerCellClass"
                  :style="headerCellStyle"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
          <tr
              v-for="(row, idx) in displayRows"
              :key="idx"
              :style="rowStyle(idx)"
          >
            <td
                v-for="col in displayColumns"
                :key="col.key"
                :class="cellClass"
                :style="cellStyle"
            >
              {{ formatCellValue(row[col.key]) }}
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
}>()

// Get the table settings from the nested appearance.table object
const tableConfig = computed(() => props.appearance?.table || {})
const numberFormat = computed(() => props.appearance?.yAxis?.numberFormat || {})

// Table settings with defaults
const showHeader = computed(() => tableConfig.value.showHeader ?? true)
const showTotal = computed(() => tableConfig.value.showTotal ?? false)
const textAlign = computed(() => tableConfig.value.textAlign || 'left')
const allowTextWrap = computed(() => tableConfig.value.allowTextWrap ?? false)
const switchRowColumn = computed(() => tableConfig.value.switchRowColumn ?? false)
const rowHeight = computed(() => tableConfig.value.rowHeight || 32)

// Colors
const oddRowColor = computed(() => tableConfig.value.oddRowColor || '#ffffff')
const evenRowColor = computed(() => tableConfig.value.evenRowColor || '#f9fafb')
const headerBgColor = computed(() => tableConfig.value.headerBgColor || '#f8fafc')
const totalBgColor = computed(() => tableConfig.value.totalBgColor || '#f3f4f6')

// Border settings
const borderStyle = computed(() => tableConfig.value.borderStyle || 'all')
const borderType = computed(() => tableConfig.value.borderType || 'solid')
const borderColor = computed(() => tableConfig.value.borderColor || '#e5e7eb')
const borderWidth = computed(() => tableConfig.value.borderWidth || 1)

// Font settings
const fontFamily = computed(() => props.appearance?.fontFamily || 'inherit')
const headerFont = computed(() => tableConfig.value.headerFont || {})
const totalFont = computed(() => tableConfig.value.totalFont || {})

// Computed columns/rows for switchRowColumn feature
const displayColumns = computed(() => {
  if (!switchRowColumn.value) return props.columns
  // When switched, first column of data becomes headers
  if (!props.rows.length) return props.columns
  return props.rows.map((row, idx) => ({
    key: `row_${idx}`,
    label: String(row[props.columns[0]?.key] || `Row ${idx + 1}`)
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

// Styles
const containerStyle = computed(() => ({
  fontFamily: fontFamily.value
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
  ...getBorderStyle()
}))

const cellStyle = computed(() => ({
  textAlign: textAlign.value,
  padding: `${rowHeight.value / 4}px ${rowHeight.value / 2}px`,
  height: `${rowHeight.value}px`,
  whiteSpace: allowTextWrap.value ? 'normal' : 'nowrap',
  ...getBorderStyle()
}))

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
  return {
    backgroundColor: idx % 2 === 0 ? oddRowColor.value : evenRowColor.value
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    let formatted = value
    const decimals = numberFormat.value.decimalPlaces
    // Handle decimal places - 'auto' means don't modify
    if (typeof decimals === 'number') {
      formatted = Number(value.toFixed(decimals))
    }
    let str = String(formatted)

    // Handle separator: 'comma', 'space', or 'none'
    const separator = numberFormat.value.separator || 'comma'
    if (separator !== 'none') {
      const parts = str.split('.')
      const sepChar = separator === 'space' ? ' ' : ','
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sepChar)
      // For 'space' separator, use comma as decimal separator (European format)
      str = separator === 'space' ? parts.join(',') : parts.join('.')
    }

    if (numberFormat.value.prefix) str = numberFormat.value.prefix + str
    if (numberFormat.value.suffix) str = str + numberFormat.value.suffix
    return str
  }
  return String(value)
}

function calculateTotal(colKey: string): string {
  const values = props.rows.map(row => row[colKey]).filter(v => typeof v === 'number') as number[]
  if (!values.length) return ''
  const sum = values.reduce((acc, val) => acc + val, 0)
  return formatCellValue(sum)
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
</style>
