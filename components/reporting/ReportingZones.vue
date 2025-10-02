<template>
  <div class="space-y-2">
    <div class="p-3 border rounded bg-gray-50" @dragover.prevent @drop="onDrop('x')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium">X (Dimensions)</span>
      </div>
      <template v-if="xDimensions.length">
        <ul class="space-y-1">
          <li v-for="(d, i) in xDimensions" :key="d.fieldId" class="px-2 py-1 bg-white border rounded flex items-center justify-between">
            <span>{{ d.label || d.name }}</span>
            <div class="space-x-1">
              <button class="text-xs underline" @click="move('x', i, i-1)" :disabled="i===0">up</button>
              <button class="text-xs underline" @click="move('x', i, i+1)" :disabled="i===xDimensions.length-1">down</button>
              <button class="text-xs text-red-600 underline" @click="remove('x', i)">remove</button>
            </div>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-gray-500 text-sm">Drag a field here</div>
      </template>
    </div>

    <div class="p-3 border rounded bg-gray-50" @dragover.prevent @drop="onDrop('y')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium">Y (Metrics)</span>
      </div>
      <template v-if="yMetrics.length">
        <ul class="space-y-1">
          <li v-for="(m, i) in yMetrics" :key="m.fieldId" class="px-2 py-1 bg-white border rounded flex items-center justify-between">
            <span>{{ m.label || m.name }}</span>
            <div class="space-x-1">
              <button class="text-xs underline" @click="move('y', i, i-1)" :disabled="i===0">up</button>
              <button class="text-xs underline" @click="move('y', i, i+1)" :disabled="i===yMetrics.length-1">down</button>
              <button class="text-xs text-red-600 underline" @click="remove('y', i)">remove</button>
            </div>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-gray-500 text-sm">Drag a field here</div>
      </template>
    </div>

    <div class="p-3 border rounded bg-gray-50" @dragover.prevent @drop="onDrop('breakdowns')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium">Breakdown</span>
      </div>
      <template v-if="breakdowns.length">
        <ul class="space-y-1">
          <li v-for="(b, i) in breakdowns" :key="b.fieldId" class="px-2 py-1 bg-white border rounded flex items-center justify-between">
            <span>{{ b.label || b.name }}</span>
            <div class="space-x-1">
              <button class="text-xs underline" @click="move('breakdowns', i, i-1)" :disabled="i===0">up</button>
              <button class="text-xs underline" @click="move('breakdowns', i, i+1)" :disabled="i===breakdowns.length-1">down</button>
              <button class="text-xs text-red-600 underline" @click="remove('breakdowns', i)">remove</button>
            </div>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-gray-500 text-sm">Drag a field here</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReportState, type ReportField } from '@/composables/useReportState'

const { xDimensions, yMetrics, breakdowns, addToZone, removeFromZone, moveInZone, syncUrlNow } = useReportState()

function onDrop(zone: 'x' | 'y' | 'breakdowns') {
  const dt = (event as DragEvent).dataTransfer
  if (!dt) return
  const str = dt.getData('application/json')
  if (!str) return
  try {
    const parsed = JSON.parse(str)
    if (parsed?.type === 'field') {
      const field = parsed.field as ReportField
      addToZone(zone, field)
      // ensure URL reflects new state immediately
      syncUrlNow()
    }
  } catch {}
}

function remove(zone: 'x' | 'y' | 'breakdowns', index: number) {
  removeFromZone(zone, index)
  syncUrlNow()
}

function move(zone: 'x' | 'y' | 'breakdowns', from: number, to: number) {
  moveInZone(zone, from, to)
  syncUrlNow()
}
</script>

<style scoped>
</style>


