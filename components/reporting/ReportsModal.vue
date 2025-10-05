<template>
  <div v-if="open" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div class="bg-white rounded shadow w-full max-w-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium">Saved Reports</h3>
        <button class="text-sm underline" @click="$emit('close')">Close</button>
      </div>
      <div class="mb-3 flex items-center gap-2">
        <input v-model="newName" class="border rounded px-2 py-1 flex-1" placeholder="Report name" />
        <button class="px-3 py-1 border rounded" @click="saveCurrent" :disabled="!newName">Save</button>
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
            <tr v-for="r in reports" :key="r.id" class="border-b">
              <td class="py-2">{{ r.name }}</td>
              <td class="py-2">{{ r.updatedAt }}</td>
              <td class="py-2 text-right space-x-2">
                <button class="text-blue-600 underline" @click="load(r.id)">Load</button>
                <button class="text-red-600 underline" @click="remove(r.id)">Delete</button>
              </td>
            </tr>
            <tr v-if="!reports.length">
              <td colspan="3" class="py-4 text-center text-gray-500">No saved reports yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useReportsService } from '@/composables/useReportsService'
import { useReportState } from '@/composables/useReportState'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { listReports, getReport, createReport, deleteReport } = useReportsService()
const { selectedDatasetId, xDimensions, yMetrics, filters, breakdowns, excludeNullsInDimensions, appearance, syncUrlNow } = useReportState()

const reports = ref<Array<{ id: number; name: string; updatedAt?: string }>>([])
const newName = ref('')

async function refresh() {
  reports.value = await listReports()
}

onMounted(() => { if (props.open) refresh() })
watch(() => props.open, (val) => { if (val) refresh() })

async function saveCurrent() {
  const state = {
    selectedDatasetId: selectedDatasetId.value,
    xDimensions: xDimensions.value,
    yMetrics: yMetrics.value,
    filters: filters.value,
    breakdowns: breakdowns.value,
    excludeNullsInDimensions: excludeNullsInDimensions.value,
    appearance: appearance.value
  }
  await createReport({ name: newName.value, state })
  newName.value = ''
  await refresh()
}

async function load(id: number) {
  const r = await getReport(id)
  if (!r?.state) return
  // Apply snapshot into state
  const s = r.state
  selectedDatasetId.value = s.selectedDatasetId || null
  xDimensions.value = s.xDimensions || []
  yMetrics.value = s.yMetrics || []
  filters.value = s.filters || []
  breakdowns.value = s.breakdowns || []
  excludeNullsInDimensions.value = !!s.excludeNullsInDimensions
  appearance.value = s.appearance || {}
  syncUrlNow()
  emit('close')
}

async function remove(id: number) {
  await deleteReport(id)
  await refresh()
}
</script>

<style scoped>
</style>


