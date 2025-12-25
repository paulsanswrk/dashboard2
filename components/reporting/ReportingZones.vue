<template>
  <div class="space-y-2 relative">
    <!-- Join Path Edit Icon -->
    <div v-if="hasMultipleTables" class="flex items-center justify-end mb-1">
      <button
          class="flex items-center gap-1 px-2 py-1 text-xs text-primary-400 hover:text-primary-300 hover:bg-dark-lighter rounded cursor-pointer transition-colors"
          title="Click here to modify the join type and path for this query, and to remove unintended duplication of data"
          @click="$emit('open-join-path-modal')"
      >
        <Icon name="i-heroicons-link" class="w-4 h-4"/>
        <span>Edit Joins</span>
      </button>
    </div>

    <!-- X Dimensions Zone -->
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
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative cursor-pointer hover:border-primary-400 transition-colors"
            draggable="true"
            @dragstart="onDragItemStart('x', i)"
            @dragover.prevent
            @drop="onDragItemDrop('x', i)"
            @click="openPopup('x', i, $event)"
            data-zone-item="x"
          >
            <div class="pr-6">
              <div class="text-sm">{{ d.label || d.name }}</div>
              <div class="text-xs text-neutral-300">
                <template v-if="d.table">{{ d.table }}</template>
                <template v-if="d.dateInterval"><span v-if="d.table"> • </span>{{ d.dateInterval }}</template>
                <template v-if="d.sort"><span v-if="d.table || d.dateInterval"> • </span>{{ d.sort }}</template>
              </div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400 cursor-pointer" @click.stop="remove('x', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <!-- Y Metrics Zone -->
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
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative cursor-pointer hover:border-primary-400 transition-colors"
            draggable="true"
            @dragstart="onDragItemStart('y', i)"
            @dragover.prevent
            @drop="onDragItemDrop('y', i)"
            @click="openPopup('y', i, $event)"
            data-zone-item="y"
          >
            <div class="pr-6">
              <div class="text-sm">{{ m.label || m.name }}</div>
              <div class="text-xs text-neutral-300">
                <template v-if="m.table">{{ m.table }}</template>
                <template v-if="m.aggregation"><span v-if="m.table"> • </span>{{ formatAggregation(m.aggregation) }}</template>
              </div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400 cursor-pointer" @click.stop="remove('y', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <!-- Breakdowns Zone -->
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
            class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative cursor-pointer hover:border-primary-400 transition-colors"
            draggable="true"
            @dragstart="onDragItemStart('breakdowns', i)"
            @dragover.prevent
            @drop="onDragItemDrop('breakdowns', i)"
            @click="openPopup('breakdowns', i, $event)"
            data-zone-item="breakdowns"
          >
            <div class="pr-6">
              <div class="text-sm">{{ b.label || b.name }}</div>
              <div class="text-xs text-neutral-300">
                <template v-if="b.table">{{ b.table }}</template>
                <template v-if="b.dateInterval"><span v-if="b.table"> • </span>{{ b.dateInterval }}</template>
                <template v-if="b.sort"><span v-if="b.table || b.dateInterval"> • </span>{{ b.sort }}</template>
              </div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400 cursor-pointer" @click.stop="remove('breakdowns', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <!-- Filters Zone -->
    <div class="p-3 border border-dark-lighter rounded bg-dark-light text-white" @dragover.prevent @drop="onDrop('filters')">
      <div class="flex items-center justify-between mb-1">
        <span class="font-medium flex items-center gap-2">
          <Icon name="i-heroicons-funnel" class="w-4 h-4 text-neutral-300"/>
          Filter By
        </span>
      </div>
      <template v-if="filters.length">
        <ul class="space-y-1" @dragover.prevent @drop="onListDrop('filters')">
          <li
              v-for="(f, i) in filters"
              :key="f.fieldId + '-' + i"
              class="px-2 py-1 bg-dark-lighter border border-dark rounded flex items-start justify-between text-white relative cursor-pointer hover:border-primary-400 transition-colors"
              draggable="true"
              @dragstart="onDragItemStart('filters', i)"
              @dragover.prevent
              @drop="onDragItemDrop('filters', i)"
              @click="openFilterPopup(i, $event)"
              data-zone-item="filters"
          >
            <div class="pr-6">
              <div class="text-sm">{{ f.label || f.name }}</div>
              <div class="text-xs text-neutral-300">
                <template v-if="f.table">{{ f.table }} •</template>
                <span class="text-primary-400">{{ formatOperator(f.operator) }}</span>
                <template v-if="f.values?.length"> {{ f.values.slice(0, 2).join(', ') }}<span v-if="f.values.length > 2">...</span></template>
                <template v-else-if="f.value"> {{ f.value }}
                  <template v-if="f.valueTo"> - {{ f.valueTo }}</template>
                </template>
              </div>
            </div>
            <button class="absolute top-1 right-1 text-neutral-400 hover:text-red-400 cursor-pointer" @click.stop="remove('filters', i)" aria-label="Remove" data-remove>
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="text-neutral-400 text-sm">Drag a field here</div>
      </template>
    </div>

    <!-- Field Options Popup (for X, Y, Breakdowns) -->
    <ReportingFieldOptionsPopup
        :visible="popupVisible && activeZone !== 'filters'"
        :field="activeField"
        :zone="activeZone"
        :position="popupPosition"
        :connection-id="connectionId"
        @apply="onPopupApply"
        @cancel="closePopup"
    />

    <!-- Filter Options Popup (for Filters zone) -->
    <ReportingFilterOptionsPopup
        :visible="filterPopupVisible"
        :filter="activeFilter"
        :position="popupPosition"
        :connection-id="connectionId"
        @apply="onFilterPopupApply"
        @cancel="closeFilterPopup"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {type DimensionRef, type FilterCondition, type MetricRef, type ReportField, useReportState} from '../../composables/useReportState'
import ReportingFieldOptionsPopup from './ReportingFieldOptionsPopup.vue'
import ReportingFilterOptionsPopup from './ReportingFilterOptionsPopup.vue'

type ZoneConfig = {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
}

type ZoneType = 'x' | 'y' | 'breakdowns' | 'filters'

const props = defineProps<{
  zoneConfig?: ZoneConfig
  connectionId?: number | null
}>()

const emit = defineEmits<{
  (e: 'field-updated'): void
  (e: 'open-join-path-modal'): void
}>()

const {xDimensions, yMetrics, breakdowns, filters, addToZone, removeFromZone, moveInZone, updateFieldInZone, syncUrlNow} = useReportState()

// Check if we have fields from multiple tables (for showing join edit icon)
const hasMultipleTables = computed(() => {
  const tables = new Set<string>()
  ;[...xDimensions.value, ...yMetrics.value, ...breakdowns.value].forEach((f) => {
    if (f?.table) tables.add(f.table)
  })
  return tables.size > 1
})

// Default zone config if none provided
const zoneConfig = computed(() => props.zoneConfig || {
  showXDimensions: true,
  showYMetrics: true,
  showBreakdowns: true,
  xLabel: 'X (Dimensions)',
  yLabel: 'Y (Metrics)',
  breakdownLabel: 'Breakdown'
})

// Drag state
const dragging = ref<{ zone: ZoneType; from: number } | null>(null)

// Popup state
const popupVisible = ref(false)
const activeField = ref<ReportField | MetricRef | DimensionRef | null>(null)
const activeZone = ref<ZoneType>('x')
const activeIndex = ref(0)
const popupPosition = ref({x: 0, y: 0})

// Filter popup state (separate from dimension/metric popup)
const filterPopupVisible = ref(false)
const activeFilter = ref<FilterCondition | null>(null)
const activeFilterIndex = ref(0)

function openPopup(zone: ZoneType, index: number, event: MouseEvent) {
  // Get the clicked element's position relative to viewport
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // Position popup below the field chip, aligned to left edge
  // Use fixed positioning relative to viewport
  popupPosition.value = {
    x: rect.left,
    y: rect.bottom + 4
  }

  // Set active field based on zone
  if (zone === 'x') {
    activeField.value = xDimensions.value[index] ?? null
  } else if (zone === 'y') {
    activeField.value = yMetrics.value[index] ?? null
  } else {
    activeField.value = breakdowns.value[index] ?? null
  }

  activeZone.value = zone
  activeIndex.value = index
  popupVisible.value = true
}

function closePopup() {
  popupVisible.value = false
  activeField.value = null
}

function onPopupApply(updates: Partial<MetricRef & DimensionRef>) {
  updateFieldInZone(activeZone.value, activeIndex.value, updates)
  syncUrlNow()
  closePopup()
  // Emit event so parent can trigger refresh
  emit('field-updated')
}

// Filter popup handlers
function openFilterPopup(index: number, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  popupPosition.value = {
    x: rect.left,
    y: rect.bottom + 4
  }
  activeFilter.value = filters.value[index] ?? null
  activeFilterIndex.value = index
  filterPopupVisible.value = true
}

function closeFilterPopup() {
  filterPopupVisible.value = false
  activeFilter.value = null
}

function onFilterPopupApply(updates: Partial<FilterCondition>) {
  updateFieldInZone('filters', activeFilterIndex.value, updates)
  syncUrlNow()
  closeFilterPopup()
  emit('field-updated')
}

function formatAggregation(agg: string | undefined): string {
  if (!agg) return ''
  const map: Record<string, string> = {
    'SUM': 'sum',
    'COUNT': 'count',
    'AVG': 'avg',
    'MIN': 'min',
    'MAX': 'max',
    'MEDIAN': 'median',
    'VARIANCE': 'variance',
    'DIST_COUNT': 'distinct'
  }
  return map[agg] || agg.toLowerCase()
}

function formatOperator(op: string | undefined): string {
  if (!op) return ''
  const map: Record<string, string> = {
    'equals': '=',
    'not_equals': '≠',
    'contains': 'contains',
    'not_contains': 'not contains',
    'starts_with': 'starts with',
    'ends_with': 'ends with',
    'greater_than': '>',
    'less_than': '<',
    'greater_or_equal': '≥',
    'less_or_equal': '≤',
    'between': 'between',
    'is_null': 'is null',
    'is_not_null': 'is not null'
  }
  return map[op] || op
}

function onDrop(zone: ZoneType) {
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

function remove(zone: ZoneType, index: number) {
  removeFromZone(zone, index)
  syncUrlNow()
}

function onDragItemStart(zone: ZoneType, index: number) {
  dragging.value = { zone, from: index }
}

function onDragItemDrop(zone: ZoneType, to: number) {
  const d = dragging.value
  if (!d) return
  if (d.zone !== zone) return
  if (d.from === to) { dragging.value = null; return }
  moveInZone(zone, d.from, to)
  dragging.value = null
  syncUrlNow()
}

function onListDrop(zone: ZoneType) {
  const d = dragging.value
  if (!d) return
  if (d.zone !== zone) return
  let len = 0
  if (zone === 'x') len = xDimensions.value.length
  else if (zone === 'y') len = yMetrics.value.length
  else if (zone === 'breakdowns') len = breakdowns.value.length
  else if (zone === 'filters') len = filters.value.length
  const to = Math.max(0, len - 1)
  moveInZone(zone, d.from, to)
  dragging.value = null
  syncUrlNow()
}

// Close popup when clicking outside
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (popupVisible.value || filterPopupVisible.value) {
      const target = e.target as HTMLElement
      if (!target.closest('.field-options-popup') && !target.closest('.filter-options-popup') && !target.closest('[data-zone-item]')) {
        closePopup()
        closeFilterPopup()
      }
    }
  })
}
</script>

<style scoped>
</style>



