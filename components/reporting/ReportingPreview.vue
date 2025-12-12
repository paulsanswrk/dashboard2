<template>
  <div ref="previewRef">
    <div v-if="loading" class="text-gray-500">Loading preview...</div>
    <div v-else>
      <div v-if="!rows.length" class="text-gray-500">No data</div>
      <div v-else class="overflow-auto border rounded text-black">
        <table class="min-w-full">
          <thead :style="headerStyle" :class="{'font-semibold': headerBold}">
            <tr>
              <th
                  v-for="col in columns"
                  :key="col.key"
                  :class="headerCellClass"
                  :style="cellStyle"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
          <tr
              v-for="(row, idx) in rows"
              :key="idx"
              :class="rowClass(idx)"
          >
            <td
                v-for="col in columns"
                :key="col.key"
                :class="cellClass"
                :style="cellStyle"
            >
                {{ row[col.key] }}
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

const appearance = computed(() => props.appearance || {})
const headerBg = computed(() => appearance.value.tableHeaderBg || '#f8fafc')
const headerBold = computed(() => appearance.value.tableHeaderBold ?? true)
const striped = computed(() => appearance.value.tableStriped ?? true)
const bordered = computed(() => appearance.value.tableBordered ?? true)
const compact = computed(() => appearance.value.tableCompact ?? false)
const rowPadding = computed(() => {
  const pad = appearance.value.tableRowPadding
  if (typeof pad === 'number' && pad > 0) return `${pad}px`
  return compact.value ? '8px' : '12px'
})

const headerStyle = computed(() => ({
  backgroundColor: headerBg.value
}))

const cellStyle = computed(() => ({
  padding: `0 ${rowPadding.value}`,
  height: `calc(${rowPadding.value} * 2)`
}))

const cellClass = computed(() => ({
  'border-b': bordered.value,
  'border-gray-200': bordered.value
}))

const headerCellClass = computed(() => ({
  ...cellClass.value,
  'text-left': true
}))

function rowClass(idx: number) {
  if (!striped.value) return {}
  return idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
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


