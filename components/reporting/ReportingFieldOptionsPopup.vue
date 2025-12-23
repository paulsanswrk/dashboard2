<template>
  <div
      v-if="visible"
      class="field-options-popup fixed z-50 bg-white dark:bg-dark-light border border-neutral-300 dark:border-dark-lighter rounded shadow-2xl min-w-[280px] max-w-[320px] overflow-hidden transition-all duration-200"
      :style="popupStyle"
      @click.stop
  >
    <!-- Header (Compact Style) -->
    <div class="flex items-center justify-between px-3 py-2 bg-primary-600 rounded-t-lg h-9">
      <div class="flex items-center gap-2 flex-1 min-w-0 mr-2 h-full">
        <!-- View State -->
        <div v-if="!isEditingLabel" @click="startEditingLabel" class="flex items-center gap-2 cursor-pointer group flex-1">
          <span class="text-white font-medium text-sm truncate">{{ localLabel || field?.label || field?.name }}</span>
          <Icon name="i-heroicons-pencil" class="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors flex-shrink-0"/>
        </div>

        <!-- Edit State -->
        <div v-else class="flex items-center gap-2 flex-1 h-full">
          <input
              ref="labelInput"
              v-model="localLabel"
              class="bg-transparent border-0 border-b border-primary-400 text-white font-medium text-sm focus:ring-0 focus:border-white px-0 py-0.5 w-full placeholder-primary-300"
              spellcheck="false"
              @keyup.enter="stopEditingLabel"
              @keyup.esc="cancelEditingLabel"
              @blur="handleLabelBlur"
          />
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0 h-full">
        <!-- Edit Mode Actions -->
        <template v-if="isEditingLabel">
          <button @click="cancelEditingLabel" class="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer" title="Cancel Rename">
            <Icon name="i-heroicons-x-mark" class="w-5 h-5 text-red-100"/>
          </button>
          <button @click="stopEditingLabel" class="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer" title="Save Rename">
            <Icon name="i-heroicons-check" class="w-5 h-5 text-green-100"/>
          </button>
        </template>

        <!-- No Actions in View Mode (actions moved to footer) -->
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 space-y-4">
      <!-- Aggregation Options (for Y metrics only) -->
      <div v-if="zone === 'y' && isNumericField">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Aggregation Type</label>
        <div class="grid grid-cols-4 gap-0 border border-neutral-200 dark:border-dark-lighter rounded overflow-hidden">
          <button
              v-for="agg in primaryAggregations"
              :key="agg.value"
              @click="localAggregation = agg.value"
              class="px-2 py-2 text-[10px] font-bold transition-colors border-r last:border-r-0 border-neutral-200 dark:border-dark-lighter cursor-pointer"
              :class="localAggregation === agg.value
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter hover:text-neutral-900 dark:hover:text-white'"
          >
            {{ agg.label }}
          </button>
        </div>

        <!-- More Aggregation Options -->
        <button
            @click="showMoreAggregations = !showMoreAggregations"
            class="flex items-center gap-1 mt-3 text-[10px] font-bold text-neutral-500 hover:text-primary-400 transition-colors uppercase tracking-widest cursor-pointer"
        >
          <Icon :name="showMoreAggregations ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-3 h-3"/>
          Additional Methods
        </button>
        <div v-if="showMoreAggregations" class="grid grid-cols-4 gap-0 mt-2 border border-neutral-200 dark:border-dark-lighter rounded overflow-hidden">
          <button
              v-for="agg in secondaryAggregations"
              :key="agg.value"
              @click="localAggregation = agg.value"
              class="px-2 py-2 text-[10px] font-bold transition-colors border-r last:border-r-0 border-neutral-200 dark:border-dark-lighter"
              :class="localAggregation === agg.value
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter hover:text-neutral-900 dark:hover:text-white'"
          >
            {{ agg.label }}
          </button>
        </div>
      </div>

      <!-- Aggregation for TEXT fields in Y metrics -->
      <div v-if="zone === 'y' && isTextField">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Aggregation Type</label>
        <div class="grid grid-cols-2 gap-0 border border-neutral-200 dark:border-dark-lighter rounded overflow-hidden">
          <button
              v-for="agg in textAggregations"
              :key="agg.value"
              @click="localAggregation = agg.value"
              class="px-3 py-2 text-[10px] font-bold transition-colors border-r last:border-r-0 border-neutral-200 dark:border-dark-lighter"
              :class="localAggregation === agg.value
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter hover:text-neutral-900 dark:hover:text-white'"
          >
            {{ agg.label }}
          </button>
        </div>
      </div>

      <!-- Date Interval (for date fields in X or breakdowns) -->
      <div v-if="isDateField && (zone === 'x' || zone === 'breakdowns')">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Group By Interval</label>
        <select
            v-model="localDateInterval"
            class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-dark border border-neutral-200 dark:border-dark-lighter rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
        >
          <option v-for="interval in dateIntervals" :key="interval.value" :value="interval.value">
            {{ interval.label }}
          </option>
        </select>

        <!-- More Date Options -->
        <button
            @click="showMoreDateOptions = !showMoreDateOptions"
            class="flex items-center gap-1 mt-4 text-[10px] font-bold text-neutral-500 hover:text-primary-400 transition-colors uppercase tracking-widest cursor-pointer"
        >
          <Icon :name="showMoreDateOptions ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-3 h-3"/>
          Additional Settings
        </button>
        <div v-if="showMoreDateOptions" class="mt-2 pl-2 space-y-2 border-l border-neutral-100 dark:border-dark-lighter">
          <label class="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors">
            <input type="checkbox" v-model="localExcludeFuture" class="w-3.5 h-3.5 rounded bg-white dark:bg-dark border-neutral-300 dark:border-dark-lighter text-primary-600 focus:ring-primary-500"/>
            Exclude future dates
          </label>
          <label class="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors">
            <input type="checkbox" v-model="localExcludeCurrent" class="w-3.5 h-3.5 rounded bg-white dark:bg-dark border-neutral-300 dark:border-dark-lighter text-primary-600 focus:ring-primary-500"/>
            Exclude current interval
          </label>
        </div>
      </div>

      <!-- Sort Order (for dimensions: X and breakdowns) -->
      <div v-if="zone === 'x' || zone === 'breakdowns'">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Sort Order</label>
        <div class="grid grid-cols-3 gap-0 border border-neutral-200 dark:border-dark-lighter rounded overflow-hidden">
          <button
              @click="localSort = undefined"
              class="px-2 py-2 text-[10px] font-bold transition-colors border-r border-neutral-200 dark:border-dark-lighter"
              :class="localSort === undefined
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter'"
          >
            None
          </button>
          <button
              @click="localSort = 'asc'"
              class="px-2 py-2 text-[10px] font-bold transition-colors border-r border-neutral-200 dark:border-dark-lighter"
              :class="localSort === 'asc'
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter'"
          >
            Asc
          </button>
          <button
              @click="localSort = 'desc'"
              class="px-2 py-2 text-[10px] font-bold transition-colors"
              :class="localSort === 'desc'
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter'"
          >
            Desc
          </button>
        </div>
      </div>

      <!-- Filter Values (for dimensions: X and breakdowns) -->
      <div v-if="(zone === 'x' || zone === 'breakdowns') && !isDateField">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Filter Values</label>

        <!-- Search Input with Select All -->
        <div class="flex items-center gap-2 mb-3">
          <div class="flex-shrink-0">
            <input
                type="checkbox"
                :checked="allValuesSelected"
                @change="toggleAllValues"
                class="w-4 h-4 rounded bg-white dark:bg-dark border-neutral-300 dark:border-dark-lighter text-primary-600 focus:ring-primary-400"
            />
          </div>
          <div class="relative flex-1">
            <input
                v-model="filterSearch"
                type="text"
                placeholder="Start typing to search"
                class="w-full px-3 py-1.5 text-sm bg-neutral-50 dark:bg-dark border border-neutral-200 dark:border-dark-lighter rounded text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loadingValues" class="flex items-center justify-center py-4 text-neutral-400 text-sm">
          <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2"/>
          Loading values...
        </div>

        <!-- Values List -->
        <div v-else class="max-h-[180px] overflow-y-auto border border-neutral-200 dark:border-dark-lighter rounded bg-white dark:bg-dark">
          <label
              v-for="val in filteredDistinctValues"
              :key="val"
              class="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-dark-lighter cursor-pointer text-sm text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-dark-lighter last:border-b-0"
          >
            <input
                type="checkbox"
                :checked="localFilterValues.includes(val)"
                @change="toggleValueSelection(val)"
                class="w-4 h-4 rounded bg-white dark:bg-dark border-neutral-300 dark:border-dark-lighter text-primary-600 focus:ring-primary-400"
            />
            <span class="truncate">{{ val }}</span>
          </label>
          <div v-if="!filteredDistinctValues.length && !loadingValues" class="px-3 py-3 text-neutral-400 text-sm text-center italic">
            {{ distinctValues.length ? 'No matching values' : 'No values found' }}
          </div>
        </div>

        <!-- Exclude Toggle -->
        <label class="flex items-center gap-2 mt-3 text-[10px] font-bold cursor-pointer py-1 px-2.5 bg-neutral-100 dark:bg-dark-lighter rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark hover:text-neutral-900 dark:hover:text-white transition-colors inline-flex uppercase tracking-wider">
          <input
              type="checkbox"
              v-model="localExcludeMode"
              class="w-3.5 h-3.5 rounded bg-white dark:bg-dark border-neutral-300 dark:border-dark-lighter text-primary-600 focus:ring-primary-500"
          />
          Exclude selected values
        </label>
      </div>

      <!-- Date Range Filter (for date fields in dimensions) -->
      <div v-if="isDateField && (zone === 'x' || zone === 'breakdowns')">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Date Range</label>
        <div class="grid grid-cols-2 gap-0 border border-neutral-200 dark:border-dark-lighter rounded overflow-hidden mb-3">
          <button
              @click="localDateRangeType = 'dynamic'"
              class="px-2 py-2 text-[10px] font-bold transition-colors border-r border-neutral-200 dark:border-dark-lighter"
              :class="localDateRangeType === 'dynamic'
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter'"
          >
            Dynamic
          </button>
          <button
              @click="localDateRangeType = 'static'"
              class="px-2 py-2 text-[10px] font-bold transition-colors"
              :class="localDateRangeType === 'static'
              ? 'bg-[#a6ce39] text-white' 
              : 'bg-white dark:bg-dark text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-lighter'"
          >
            Static
          </button>
        </div>

        <!-- Dynamic Range Selector -->
        <div v-if="localDateRangeType === 'dynamic'">
          <select
              v-model="localDynamicRange"
              class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-dark border border-neutral-200 dark:border-dark-lighter rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option v-for="range in dynamicRanges" :key="range.value" :value="range.value">
              {{ range.label }}
            </option>
          </select>
        </div>

        <!-- Static Range Inputs -->
        <div v-else class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[9px] font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">Start Date</label>
              <input
                  v-model="localDateRangeStart"
                  type="date"
                  class="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-dark border border-neutral-200 dark:border-dark-lighter rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <div>
              <label class="block text-[9px] font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">End Date</label>
              <input
                  v-model="localDateRangeEnd"
                  type="date"
                  class="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-dark border border-neutral-200 dark:border-dark-lighter rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 px-3 py-2 border-t border-neutral-200 dark:border-dark-lighter bg-neutral-50 dark:bg-dark-light">
      <button
          @click="cancel"
          class="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
          @click="apply"
          class="px-4 py-1.5 text-xs font-bold bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
      >
        Apply
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import type {DimensionRef, MetricRef, ReportField} from '../../composables/useReportState'

type ZoneType = 'x' | 'y' | 'breakdowns'

const props = defineProps<{
  visible: boolean
  field: ReportField | MetricRef | DimensionRef | null
  zone: ZoneType
  position: { x: number; y: number }
  connectionId?: number | null
}>()

const emit = defineEmits<{
  (e: 'apply', updates: Partial<MetricRef & DimensionRef>): void
  (e: 'cancel'): void
}>()

// Local state for editing
const localLabel = ref('')
const localAggregation = ref<string | undefined>(undefined)
const localSort = ref<'asc' | 'desc' | undefined>(undefined)
const localDateInterval = ref<string | undefined>(undefined)
const localExcludeFuture = ref(false)
const localExcludeCurrent = ref(false)

// Label editing state
const isEditingLabel = ref(false)
const labelInput = ref<HTMLInputElement | null>(null)
const originalLabel = ref('')

function startEditingLabel() {
  originalLabel.value = localLabel.value
  isEditingLabel.value = true
  nextTick(() => {
    labelInput.value?.focus()
    labelInput.value?.select()
  })
}

function stopEditingLabel() {
  isEditingLabel.value = false
}

function cancelEditingLabel() {
  localLabel.value = originalLabel.value
  isEditingLabel.value = false
}

function handleLabelBlur() {
  // We keep the new value on blur, but stop editing mode
  isEditingLabel.value = false
}

// Filter values state
const localFilterValues = ref<string[]>([])
const localFilterMode = ref<'include' | 'exclude'>('include')
const filterValuesInput = ref('')
const localExcludeMode = ref(false)

// Distinct values for searchable list
const distinctValues = ref<string[]>([])
const loadingValues = ref(false)
const filterSearch = ref('')

// Date range filter state
const localDateRangeType = ref<'static' | 'dynamic'>('dynamic')
const localDynamicRange = ref<string | undefined>('last_30_days')
const localDateRangeStart = ref('')
const localDateRangeEnd = ref('')

// UI state
const showMoreAggregations = ref(false)
const showMoreDateOptions = ref(false)

// Aggregation options
const primaryAggregations = [
  {label: 'SUM', value: 'SUM'},
  {label: 'COUNT', value: 'COUNT'},
  {label: 'AVG', value: 'AVG'},
  {label: 'DIST', value: 'DIST_COUNT'}
]

const secondaryAggregations = [
  {label: 'MIN', value: 'MIN'},
  {label: 'MAX', value: 'MAX'},
  {label: 'MED', value: 'MEDIAN'},
  {label: 'VAR', value: 'VARIANCE'}
]

const textAggregations = [
  {label: 'COUNT', value: 'COUNT'},
  {label: 'DISTINCT COUNT', value: 'DIST_COUNT'}
]

// Date interval options
const dateIntervals = [
  {label: 'Minutes', value: 'minutes'},
  {label: 'Hours', value: 'hours'},
  {label: 'Days', value: 'days'},
  {label: 'Weeks', value: 'weeks'},
  {label: 'Months', value: 'months'},
  {label: 'Quarters', value: 'quarters'},
  {label: 'Years', value: 'years'},
  {label: 'Day of Week', value: 'day_of_week'},
  {label: 'Month of Year', value: 'month_of_year'}
]

// Dynamic date range options
const dynamicRanges = [
  {label: 'Last 7 Days', value: 'last_7_days'},
  {label: 'Last 30 Days', value: 'last_30_days'},
  {label: 'Last 90 Days', value: 'last_90_days'},
  {label: 'This Month', value: 'this_month'},
  {label: 'This Quarter', value: 'this_quarter'},
  {label: 'This Year', value: 'this_year'}
]

// Helper function to remove filter value tag
function removeFilterValue(index: number) {
  localFilterValues.value.splice(index, 1)
}

// Watch filterValuesInput to parse and add values
watch(filterValuesInput, (val) => {
  if (val.includes(',')) {
    const parts = val.split(',').map(v => v.trim()).filter(Boolean)
    if (parts.length > 1) {
      // Add all but last (which may be incomplete)
      localFilterValues.value.push(...parts.slice(0, -1))
      filterValuesInput.value = parts[parts.length - 1] ?? ''
    }
  }
})

// Field type detection
const numericTypes = ['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'numeric', 'smallint', 'tinyint', 'mediumint', 'real', 'number']
const textTypes = ['varchar', 'char', 'text', 'string', 'nvarchar', 'nchar', 'longtext', 'mediumtext', 'tinytext', 'enum', 'set']
const dateTypes = ['date', 'datetime', 'timestamp', 'time', 'year', 'timestamptz', 'timetz']

const fieldType = computed(() => props.field?.type?.toLowerCase() || '')

const isNumericField = computed(() => numericTypes.some(t => fieldType.value.includes(t)))
const isTextField = computed(() => textTypes.some(t => fieldType.value.includes(t)))
const isDateField = computed(() => dateTypes.some(t => fieldType.value.includes(t)))

const filteredDistinctValues = computed(() => {
  if (!filterSearch.value) return distinctValues.value
  const search = filterSearch.value.toLowerCase()
  return distinctValues.value.filter(v => v.toLowerCase().includes(search))
})

const allValuesSelected = computed(() => {
  if (distinctValues.value.length === 0) return false
  return distinctValues.value.every(v => localFilterValues.value.includes(v))
})

function toggleValueSelection(val: string) {
  const index = localFilterValues.value.indexOf(val)
  if (index === -1) {
    localFilterValues.value.push(val)
  } else {
    localFilterValues.value.splice(index, 1)
  }
}

function toggleAllValues() {
  if (allValuesSelected.value) {
    localFilterValues.value = []
  } else {
    localFilterValues.value = [...distinctValues.value]
  }
}

async function fetchDistinctValues() {
  if (!props.field || !props.connectionId || isDateField.value) return

  loadingValues.value = true
  try {
    const {values} = await $fetch('/api/reporting/distinct-values', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        tableName: props.field.table,
        columnName: props.field.name || props.field.fieldId
      }
    })
    distinctValues.value = values || []
  } catch (e) {
    console.error('Failed to fetch distinct values:', e)
  } finally {
    loadingValues.value = false
  }
}

const fieldTypeIcon = computed(() => {
  if (isNumericField.value) return 'i-heroicons-hashtag'
  if (isDateField.value) return 'i-heroicons-clock'
  if (isTextField.value) return 'i-heroicons-document-text'
  return 'i-heroicons-variable'
})

// Popup positioning
const popupStyle = computed(() => ({
  top: `${props.position.y}px`,
  left: `${props.position.x}px`
}))

// Sync local state when field changes
watch(() => props.field, (newField) => {
  if (newField) {
    localAggregation.value = (newField as MetricRef).aggregation
    localSort.value = (newField as DimensionRef).sort
    localDateInterval.value = (newField as DimensionRef).dateInterval || 'days'
    localLabel.value = newField.label || newField.name || ''

    // Sync filter values
    const dim = newField as DimensionRef
    localFilterValues.value = [...(dim.filterValues || [])]
    localExcludeMode.value = dim.filterMode === 'exclude'
    filterSearch.value = ''

    // Sync date range
    localDateRangeType.value = dim.dateRangeType || 'dynamic'
    localDynamicRange.value = dim.dynamicRange || 'last_30_days'
    localDateRangeStart.value = dim.dateRangeStart || ''
    localDateRangeEnd.value = dim.dateRangeEnd || ''

    // Reset lists/searches
    distinctValues.value = []

    // Fetch values if it's a dimension
    if (props.visible && (props.zone === 'x' || props.zone === 'breakdowns')) {
      fetchDistinctValues()
    }

    // Reset expanded sections
    showMoreAggregations.value = false
    showMoreDateOptions.value = false
    isEditingLabel.value = false
  }
}, {immediate: true})

// Also fetch when becoming visible if we have a field
watch(() => props.visible, (newVisible) => {
  if (newVisible && (props.zone === 'x' || props.zone === 'breakdowns')) {
    fetchDistinctValues()
  }
})

function apply() {
  const updates: Partial<MetricRef & DimensionRef> = {
    label: localLabel.value || undefined
  }

  if (props.zone === 'y') {
    updates.aggregation = localAggregation.value
  }

  if (props.zone === 'x' || props.zone === 'breakdowns') {
    updates.sort = localSort.value

    if (isDateField.value) {
      updates.dateInterval = localDateInterval.value as DimensionRef['dateInterval']
      updates.dateRangeType = localDateRangeType.value
      if (localDateRangeType.value === 'dynamic') {
        updates.dynamicRange = localDynamicRange.value as DimensionRef['dynamicRange']
        updates.dateRangeStart = undefined
        updates.dateRangeEnd = undefined
      } else {
        updates.dateRangeStart = localDateRangeStart.value || undefined
        updates.dateRangeEnd = localDateRangeEnd.value || undefined
        updates.dynamicRange = undefined
      }
    } else {
      // Filter values for non-date fields
      if (localFilterValues.value.length > 0) {
        updates.filterValues = [...localFilterValues.value]
        updates.filterMode = localExcludeMode.value ? 'exclude' : 'include'
      } else {
        updates.filterValues = undefined
        updates.filterMode = undefined
      }
    }
  }

  emit('apply', updates)
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.field-options-popup {
  animation: popupFadeIn 0.15s ease-out;
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
