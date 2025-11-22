<template>
  <div class="space-y-2">
    <div v-if="zoneConfig.showXDimensions" class="p-3 border border-dark-lighter rounded bg-dark-light text-white" @dragover.prevent @drop="onDrop('x')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium flex items-center gap-2">
          <Icon name="i-heroicons-rectangle-group" class="w-4 h-4 text-neutral-300"/>
          {{ zoneConfig.xLabel || 'X (Dimensions)' }}
        </span>
      </div>
      <template v-if="xDimensions.length">
        <ul class="space-y-1" @dragover.prevent @drop="onListDrop('x')">
          <li
            v-for="(d, i) in xDimensions"
            :key="d.fieldId"
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative"
            draggable="true"
            @dragstart="onDragItemStart('x', i)"
            @dragover.prevent
            @drop="onDragItemDrop('x', i)"
            data-zone-item="x"
          >
            <div class="pr-6">
              <div class="text-sm">{{ d.label || d.name }}</div>
              <div v-if="d.table" class="text-xs text-neutral-300">{{ d.table }}</div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400" @click="remove('x', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <div v-if="zoneConfig.showYMetrics" class="p-3 border border-dark-lighter rounded bg-dark-light text-white" @dragover.prevent @drop="onDrop('y')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium flex items-center gap-2">
          <Icon name="i-heroicons-squares-2x2" class="w-4 h-4 text-neutral-300"/>
          {{ zoneConfig.yLabel || 'Y (Metrics)' }}
        </span>
      </div>
      <template v-if="yMetrics.length">
        <ul class="space-y-1" @dragover.prevent @drop="onListDrop('y')">
          <li
            v-for="(m, i) in yMetrics"
            :key="m.fieldId"
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative"
            draggable="true"
            @dragstart="onDragItemStart('y', i)"
            @dragover.prevent
            @drop="onDragItemDrop('y', i)"
            data-zone-item="y"
          >
            <div class="pr-6">
              <div class="text-sm">{{ m.label || m.name }}</div>
              <div class="text-xs text-neutral-300">
                <template v-if="m.table">{{ m.table }}</template>
                <template v-if="m.aggregation"> <span v-if="m.table"> • </span>{{ (m.aggregation || '').toLowerCase() }}</template>
              </div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400" @click="remove('y', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <div v-if="zoneConfig.showBreakdowns" class="p-3 border border-dark-lighter rounded bg-dark-light text-white" @dragover.prevent @drop="onDrop('breakdowns')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium flex items-center gap-2">
          <Icon name="i-heroicons-chart-bar" class="w-4 h-4 text-neutral-300"/>
          {{ zoneConfig.breakdownLabel || 'Breakdown' }}
        </span>
      </div>
      <template v-if="breakdowns.length">
        <ul class="space-y-1" @dragover.prevent @drop="onListDrop('breakdowns')">
          <li
            v-for="(b, i) in breakdowns"
            :key="b.fieldId"
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative"
            draggable="true"
            @dragstart="onDragItemStart('breakdowns', i)"
            @dragover.prevent
            @drop="onDragItemDrop('breakdowns', i)"
            data-zone-item="breakdowns"
          >
            <div class="pr-6">
              <div class="text-sm">{{ b.label || b.name }}</div>
              <div v-if="b.table" class="text-xs text-neutral-300">{{ b.table }}</div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400" @click="remove('breakdowns', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReportState, type ReportField } from '../../composables/useReportState'

type ZoneConfig = {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
}

const props = defineProps<{
  zoneConfig?: ZoneConfig
}>()

const { xDimensions, yMetrics, breakdowns, addToZone, removeFromZone, moveInZone, syncUrlNow } = useReportState()

// Default zone config if none provided
const zoneConfig = computed(() => props.zoneConfig || {
  showXDimensions: true,
  showYMetrics: true,
  showBreakdowns: true,
  xLabel: 'X (Dimensions)',
  yLabel: 'Y (Metrics)',
  breakdownLabel: 'Breakdown'
})

const dragging = ref<{ zone: 'x' | 'y' | 'breakdowns'; from: number } | null>(null)

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

function onDragItemStart(zone: 'x' | 'y' | 'breakdowns', index: number) {
  dragging.value = { zone, from: index }
}

function onDragItemDrop(zone: 'x' | 'y' | 'breakdowns', to: number) {
  const d = dragging.value
  if (!d) return
  if (d.zone !== zone) return
  if (d.from === to) { dragging.value = null; return }
  moveInZone(zone, d.from, to)
  dragging.value = null
  syncUrlNow()
}

function onListDrop(zone: 'x' | 'y' | 'breakdowns') {
  const d = dragging.value
  if (!d) return
  if (d.zone !== zone) return
  const len = zone === 'x' ? xDimensions.value.length : zone === 'y' ? yMetrics.value.length : breakdowns.value.length
  const to = Math.max(0, len - 1)
  moveInZone(zone, d.from, to)
  dragging.value = null
  syncUrlNow()
}
</script>

<style scoped>
</style>


