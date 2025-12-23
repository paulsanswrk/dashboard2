<template>
  <div v-if="open" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div class="bg-white rounded shadow w-full max-w-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium">Saved Charts</h3>
        <UButton variant="link" size="xs" @click="$emit('close')">Close</UButton>
      </div>
      <div class="mb-3 flex items-center gap-2">
        <input v-model="newName" class="border rounded px-2 py-1 flex-1" placeholder="Chart name" />
        <UButton variant="outline" size="xs" @click="saveCurrent" :disabled="!newName">Save</UButton>
      </div>
      <div class="max-h-80 overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b">
              <th class="py-2">Name</th>
              <th class="py-2">Updated</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in charts" :key="r.id" class="border-b">
              <td class="py-2">{{ r.name }}</td>
              <td class="py-2">{{ r.updatedAt }}</td>
              <td class="py-2 text-right space-x-2">
                <button class="text-blue-600 underline cursor-pointer hover:text-blue-700 transition-colors" @click="load(r.id)">Load</button>
                <button class="text-red-600 underline cursor-pointer hover:text-red-700 transition-colors" @click="remove(r.id)">Delete</button>
              </td>
            </tr>
            <tr v-if="!charts.length">
              <td colspan="3" class="py-4 text-center text-gray-500">No saved charts yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue'
import {useChartsService} from '@/composables/useChartsService'
import {useReportState} from '@/composables/useReportState'

const props = defineProps<{
  open: boolean
  dataConnectionId: number | null
  useSql: boolean
  overrideSql: boolean
  sqlText: string
  actualExecutedSql: string
  chartType: string
  captureChartMeta?: () => Promise<{ width?: number | null; height?: number | null; thumbnailBase64?: string | null }>
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'load-chart', state: {
    dataConnectionId: number | null
    useSql: boolean
    overrideSql: boolean
    sqlText: string
    actualExecutedSql: string
    chartType: string
  }): void
}>()

const { listCharts, getChart, createChart, deleteChart } = useChartsService()
const {selectedDatasetId, xDimensions, yMetrics, breakdowns, excludeNullsInDimensions, appearance, syncUrlNow} = useReportState()

const charts = ref<Array<{ id: number; name: string; updatedAt?: string }>>([])
const newName = ref('')

onMounted(() => { if (props.open) refresh() })
watch(() => props.open, (val) => { if (val) refresh() })

async function refresh() {
  charts.value = await listCharts()
}

async function saveCurrent() {
  const state = {
    selectedDatasetId: selectedDatasetId.value,
    dataConnectionId: props.dataConnectionId,
    xDimensions: xDimensions.value,
    yMetrics: yMetrics.value,
    breakdowns: breakdowns.value,
    excludeNullsInDimensions: excludeNullsInDimensions.value,
    appearance: appearance.value,
    // SQL configuration
    useSql: props.useSql,
    overrideSql: props.overrideSql,
    sqlText: props.sqlText,
    actualExecutedSql: props.actualExecutedSql,
    // Chart configuration
    chartType: props.chartType
  }
  const chartMeta = props.captureChartMeta ? await props.captureChartMeta() : {}
  await createChart({
    name: newName.value,
    state,
    width: chartMeta.width,
    height: chartMeta.height,
    thumbnailBase64: chartMeta.thumbnailBase64
  })
  newName.value = ''
  await refresh()
}

async function load(id: number) {
  const r = await getChart(id)
  if (!r?.state) return
  // Apply snapshot into state
  const s = r.state
  selectedDatasetId.value = s.selectedDatasetId || null
  xDimensions.value = s.xDimensions || []
  yMetrics.value = s.yMetrics || []
  breakdowns.value = s.breakdowns || []
  excludeNullsInDimensions.value = !!s.excludeNullsInDimensions
  appearance.value = s.appearance || {}

  // Emit SQL and chart state for ReportingBuilder to handle
  emit('load-chart', {
    dataConnectionId: s.dataConnectionId || null,
    useSql: s.useSql || false,
    overrideSql: s.overrideSql || false,
    sqlText: s.sqlText || '',
    actualExecutedSql: s.actualExecutedSql || '',
    chartType: s.chartType || 'table'
  })

  syncUrlNow()
  emit('close')
}

async function remove(id: number) {
  await deleteChart(id)
  await refresh()
}
</script>

<style scoped>
</style>
