<template>
  <div
      v-if="visible"
      class="filter-options-popup fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded shadow-2xl min-w-[300px] max-w-[360px] overflow-hidden transition-all duration-200"
      :style="popupStyle"
      @click.stop
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-primary-600 rounded-t-lg h-9">
      <div class="flex items-center gap-2 flex-1 min-w-0 mr-2 h-full">
        <Icon name="i-heroicons-funnel" class="w-4 h-4 text-white/70"/>
        <span class="text-white font-medium text-sm truncate">{{ filter?.label || filter?.name }}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 space-y-4">
      <!-- Operator Selection -->
      <div>
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Condition</label>
        <select
            v-model="localOperator"
            class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
        >
          <optgroup v-if="isTextField" label="Text Operators">
            <option value="equals">Equals</option>
            <option value="not_equals">Does not equal</option>
            <option value="contains">Contains</option>
            <option value="not_contains">Does not contain</option>
            <option value="starts_with">Starts with</option>
            <option value="ends_with">Ends with</option>
          </optgroup>
          <optgroup v-if="isNumericField" label="Numeric Operators">
            <option value="equals">Equals</option>
            <option value="not_equals">Does not equal</option>
            <option value="greater_than">Greater than</option>
            <option value="less_than">Less than</option>
            <option value="greater_or_equal">Greater or equal</option>
            <option value="less_or_equal">Less or equal</option>
            <option value="between">Between</option>
          </optgroup>
          <optgroup v-if="isDateField" label="Date Operators">
            <option value="equals">Equals</option>
            <option value="not_equals">Does not equal</option>
            <option value="greater_than">After</option>
            <option value="less_than">Before</option>
            <option value="between">Between</option>
          </optgroup>
          <optgroup label="Null Checks">
            <option value="is_null">Is empty/null</option>
            <option value="is_not_null">Is not empty/null</option>
          </optgroup>
        </select>
      </div>

      <!-- Value Input (Single value operators) -->
      <div v-if="showSingleValueInput">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Value</label>

        <!-- Date input for date fields -->
        <input
            v-if="isDateField"
            v-model="localValue"
            type="date"
            class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
        />

        <!-- Number input for numeric fields -->
        <input
            v-else-if="isNumericField"
            v-model="localValue"
            type="number"
            step="any"
            placeholder="Enter a number"
            class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />

        <!-- Text input for text fields -->
        <input
            v-else
            v-model="localValue"
            type="text"
            placeholder="Enter a value"
            class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      <!-- Between Range Input -->
      <div v-if="localOperator === 'between'" class="space-y-3">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Range</label>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[9px] font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">From</label>
            <input
                v-model="localValue"
                :type="isDateField ? 'date' : isNumericField ? 'number' : 'text'"
                :step="isNumericField ? 'any' : undefined"
                class="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <div>
            <label class="block text-[9px] font-bold text-neutral-500 dark:text-neutral-400 mb-1 uppercase">To</label>
            <input
                v-model="localValueTo"
                :type="isDateField ? 'date' : isNumericField ? 'number' : 'text'"
                :step="isNumericField ? 'any' : undefined"
                class="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>
      </div>

      <!-- Multi-value selection for equals/not_equals on text fields -->
      <div v-if="showMultiValueInput">
        <label class="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">Select Values</label>

        <!-- Search Input -->
        <div class="flex items-center gap-2 mb-3">
          <div class="flex-shrink-0">
            <input
                type="checkbox"
                :checked="allValuesSelected"
                @change="toggleAllValues"
                class="w-4 h-4 rounded bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-400 cursor-pointer"
            />
          </div>
          <div class="relative flex-1">
            <input
                v-model="filterSearch"
                type="text"
                placeholder="Search values..."
                class="w-full px-3 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loadingValues" class="flex items-center justify-center py-4 text-neutral-400 text-sm">
          <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2"/>
          Loading values...
        </div>

        <!-- Values List -->
        <div v-else class="max-h-[180px] overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700">
          <label
              v-for="val in filteredDistinctValues"
              :key="val"
              class="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer text-sm text-neutral-700 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
          >
            <input
                type="checkbox"
                :checked="localValues.includes(val)"
                @change="toggleValueSelection(val)"
                class="w-4 h-4 rounded bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-400 cursor-pointer"
            />
            <span class="truncate">{{ val }}</span>
          </label>
          <div v-if="!filteredDistinctValues.length && !loadingValues" class="px-3 py-3 text-neutral-400 text-sm text-center italic">
            {{ distinctValues.length ? 'No matching values' : 'No values found' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 px-3 py-2 border-t border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800">
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
import {computed, ref, watch} from 'vue'
import type {FilterCondition} from '../../composables/useReportState'

const props = defineProps<{
  visible: boolean
  filter: FilterCondition | null
  position: { x: number; y: number }
  connectionId?: number | null
}>()

const emit = defineEmits<{
  (e: 'apply', updates: Partial<FilterCondition>): void
  (e: 'cancel'): void
}>()

// Local state
const localOperator = ref<FilterCondition['operator']>('equals')
const localValue = ref('')
const localValueTo = ref('')
const localValues = ref<string[]>([])

// Distinct values for multi-select
const distinctValues = ref<string[]>([])
const loadingValues = ref(false)
const filterSearch = ref('')

// Field type detection
const numericTypes = ['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'numeric', 'smallint', 'tinyint', 'mediumint', 'real', 'number']
const textTypes = ['varchar', 'char', 'text', 'string', 'nvarchar', 'nchar', 'longtext', 'mediumtext', 'tinytext', 'enum', 'set']
const dateTypes = ['date', 'datetime', 'timestamp', 'time', 'year', 'timestamptz', 'timetz']

const fieldType = computed(() => props.filter?.type?.toLowerCase() || '')

const isNumericField = computed(() => numericTypes.some(t => fieldType.value.includes(t)))
const isTextField = computed(() => textTypes.some(t => fieldType.value.includes(t)) || (!isNumericField.value && !isDateField.value))
const isDateField = computed(() => dateTypes.some(t => fieldType.value.includes(t)))

// Computed for showing value inputs
const showSingleValueInput = computed(() => {
  const singleValueOps = ['greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'contains', 'not_contains', 'starts_with', 'ends_with']
  if (singleValueOps.includes(localOperator.value)) return true
  // For equals/not_equals on date/numeric fields, show single input
  if ((localOperator.value === 'equals' || localOperator.value === 'not_equals') && (isDateField.value || isNumericField.value)) return true
  return false
})

const showMultiValueInput = computed(() => {
  // Multi-select only for equals/not_equals on text fields
  return (localOperator.value === 'equals' || localOperator.value === 'not_equals') && isTextField.value && !isDateField.value
})

const filteredDistinctValues = computed(() => {
  if (!filterSearch.value) return distinctValues.value
  const search = filterSearch.value.toLowerCase()
  return distinctValues.value.filter(v => v.toLowerCase().includes(search))
})

const allValuesSelected = computed(() => {
  if (distinctValues.value.length === 0) return false
  return distinctValues.value.every(v => localValues.value.includes(v))
})

// Popup positioning
const popupStyle = computed(() => ({
  top: `${props.position.y}px`,
  left: `${props.position.x}px`
}))

function toggleValueSelection(val: string) {
  const index = localValues.value.indexOf(val)
  if (index === -1) {
    localValues.value.push(val)
  } else {
    localValues.value.splice(index, 1)
  }
}

function toggleAllValues() {
  if (allValuesSelected.value) {
    localValues.value = []
  } else {
    localValues.value = [...distinctValues.value]
  }
}

async function fetchDistinctValues() {
  if (!props.filter || !props.connectionId || isDateField.value || isNumericField.value) return

  loadingValues.value = true
  try {
    const {values} = await $fetch('/api/reporting/distinct-values', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        tableName: props.filter.table,
        columnName: props.filter.name || props.filter.fieldId
      }
    })
    distinctValues.value = values || []
  } catch (e) {
    console.error('Failed to fetch distinct values:', e)
  } finally {
    loadingValues.value = false
  }
}

// Sync local state when filter changes
watch(() => props.filter, (newFilter) => {
  if (newFilter) {
    localOperator.value = newFilter.operator || 'equals'
    localValue.value = newFilter.value || ''
    localValueTo.value = newFilter.valueTo || ''
    localValues.value = [...(newFilter.values || [])]
    filterSearch.value = ''
    distinctValues.value = []

    // Fetch values for text fields
    if (props.visible && isTextField.value) {
      fetchDistinctValues()
    }
  }
}, {immediate: true})

// Also fetch when becoming visible
watch(() => props.visible, (newVisible) => {
  if (newVisible && isTextField.value) {
    fetchDistinctValues()
  }
})

function apply() {
  const updates: Partial<FilterCondition> = {
    operator: localOperator.value
  }

  // Clear values based on operator type
  if (localOperator.value === 'is_null' || localOperator.value === 'is_not_null') {
    updates.value = undefined
    updates.valueTo = undefined
    updates.values = undefined
  } else if (localOperator.value === 'between') {
    updates.value = localValue.value || undefined
    updates.valueTo = localValueTo.value || undefined
    updates.values = undefined
  } else if (showMultiValueInput.value) {
    updates.values = localValues.value.length > 0 ? [...localValues.value] : undefined
    updates.value = undefined
    updates.valueTo = undefined
  } else {
    updates.value = localValue.value || undefined
    updates.valueTo = undefined
    updates.values = undefined
  }

  emit('apply', updates)
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.filter-options-popup {
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
