<template>
  <UModal v-model:open="internalOpen" size="xl">
    <template #header>
      <h3 class="text-lg font-semibold">{{ isEditMode ? 'Edit Filter' : 'Create Filter' }}</h3>
    </template>
    <template #body>
      <div class="grid grid-cols-2 gap-4 min-h-[400px]">
        <!-- Left pane: Data source and field selection -->
        <div class="border rounded-md dark:border-gray-700 overflow-hidden flex flex-col">
          <div class="px-3 py-2 font-medium bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
            Select Field
          </div>

          <!-- Connection selector -->
          <div class="p-2 border-b dark:border-gray-700">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data Source</label>
            <select
                v-model="selectedConnectionId"
                class="w-full px-2 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                @change="onConnectionChange"
            >
              <option :value="null" disabled>Select a data source...</option>
              <option v-for="conn in connections" :key="conn.id" :value="conn.id">
                {{ conn.internalName }}
              </option>
            </select>
          </div>

          <!-- Table/Field tree -->
          <div class="flex-1 overflow-auto p-2">
            <div v-if="loadingSchema" class="flex items-center justify-center py-8 text-gray-400">
              <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin mr-2"/>
              Loading schema...
            </div>
            <div v-else-if="!selectedConnectionId" class="text-center py-8 text-gray-400 text-sm">
              Select a data source to view fields
            </div>
            <div v-else>
              <!-- Search -->
              <div class="relative mb-2">
                <UInput v-model="fieldSearch" placeholder="Search tables/fields..." size="sm" class="w-full"/>
                <button v-if="fieldSearch" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" @click="fieldSearch = ''">
                  <Icon name="i-heroicons-x-mark" class="w-3 h-3"/>
                </button>
              </div>

              <!-- Tables and fields -->
              <div class="space-y-1">
                <div v-for="table in filteredTables" :key="table.id">
                  <button
                      class="w-full flex items-center gap-2 px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      @click="toggleTableExpand(table.id)"
                  >
                    <Icon :name="expandedTables[table.id] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-3 h-3"/>
                    <Icon name="i-heroicons-table-cells" class="w-4 h-4 text-gray-500"/>
                    <span class="truncate">{{ table.name }}</span>
                  </button>

                  <div v-if="expandedTables[table.id]" class="ml-6 space-y-0.5">
                    <button
                        v-for="col in getFilteredColumns(table.id)"
                        :key="col.fieldId"
                        class="w-full flex items-center gap-2 px-2 py-1 text-left text-sm rounded cursor-pointer transition-colors"
                        :class="isFieldSelected(table.id, col.fieldId) ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700'"
                        @click="selectField(table, col)"
                    >
                      <Icon :name="getTypeIcon(col.type)" class="w-4 h-4" :class="getTypeIconColor(col.type)"/>
                      <span class="truncate flex-1">{{ col.name }}</span>
                      <span class="text-xs text-gray-400">{{ col.type }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right pane: Filter configuration -->
        <div class="border rounded-md dark:border-gray-700 overflow-hidden flex flex-col">
          <div class="px-3 py-2 font-medium bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
            Configure Filter
          </div>

          <div v-if="!selectedField" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a field to configure the filter
          </div>

          <div v-else class="flex-1 overflow-auto p-3 space-y-4">
            <!-- Filter visibility toggle -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium">Filter Visibility</label>
              <USwitch v-model="filterVisible"/>
            </div>

            <!-- Filter name -->
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filter Name</label>
              <UInput v-model="filterName" placeholder="Enter filter name..."/>
            </div>

            <!-- Filter mode tabs based on field type -->
            <div>
              <div class="flex border-b dark:border-gray-700">
                <button
                    v-for="mode in availableModes"
                    :key="mode.value"
                    class="px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                    :class="filterMode === mode.value ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                    @click="filterMode = mode.value"
                >
                  {{ mode.label }}
                </button>
              </div>

              <!-- VALUES mode -->
              <div v-if="filterMode === 'values'" class="pt-3 space-y-3">
                <div class="flex items-center gap-2">
                  <UCheckbox v-model="selectAllValues" @change="toggleSelectAll"/>
                  <div class="relative flex-1">
                    <UInput v-model="valueSearch" placeholder="Search values..." size="sm"/>
                  </div>
                </div>

                <div v-if="loadingValues" class="flex items-center justify-center py-4 text-gray-400 text-sm">
                  <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2"/>
                  Loading values...
                </div>
                <div v-else class="max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md">
                  <label
                      v-for="val in filteredValues"
                      :key="val"
                      class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm border-b dark:border-gray-700 last:border-b-0"
                  >
                    <UCheckbox :model-value="selectedValues.includes(val)" @update:model-value="toggleValue(val)"/>
                    <span class="truncate">{{ val ?? '(null)' }}</span>
                  </label>
                  <div v-if="filteredValues.length === 0" class="px-3 py-4 text-center text-gray-400 text-sm">
                    No values found
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <UCheckbox v-model="appendNull"/>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Append NULL</span>
                </div>
                <div class="flex items-center gap-2">
                  <UCheckbox v-model="singleSelect"/>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Single-select filter</span>
                </div>
              </div>

              <!-- TEXT RULE mode -->
              <div v-if="filterMode === 'text_rule'" class="pt-3 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Values that</label>
                  <select v-model="textRuleOperator" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="start_with">start with</option>
                    <option value="end_with">end with</option>
                    <option value="contain">contain</option>
                    <option value="equal">are equal to</option>
                    <option value="not_start_with">don't start with</option>
                    <option value="not_end_with">don't end with</option>
                    <option value="not_contain">don't contain</option>
                    <option value="not_equal">are not equal to</option>
                  </select>
                </div>
                <UInput v-model="textRuleValue" placeholder="Enter expression..."/>
              </div>

              <!-- CONSTRAINT mode (numeric) -->
              <div v-if="filterMode === 'constraint'" class="pt-3 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Values</label>
                  <select v-model="constraintOperator" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="equal">equal to</option>
                    <option value="not_equal">not equal to</option>
                    <option value="lt">less than</option>
                    <option value="lte">less than or equal to</option>
                    <option value="gt">greater than</option>
                    <option value="gte">greater than or equal to</option>
                    <option value="between">between</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <UInput v-model.number="constraintValue" type="number" placeholder="Value" class="flex-1"/>
                  <template v-if="constraintOperator === 'between'">
                    <span class="text-gray-400">and</span>
                    <UInput v-model.number="constraintValueTo" type="number" placeholder="Value" class="flex-1"/>
                  </template>
                </div>
              </div>

              <!-- DYNAMIC RANGE mode (date) -->
              <div v-if="filterMode === 'dynamic_range'" class="pt-3 space-y-3">
                <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Visible Ranges</div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <label v-for="range in dynamicRangeOptions" :key="range.value" class="flex items-center gap-2 cursor-pointer">
                    <UCheckbox :model-value="selectedDynamicRanges.includes(range.value)" @update:model-value="toggleDynamicRange(range.value)"/>
                    <span>{{ range.label }}</span>
                  </label>
                </div>
                <div class="flex items-center gap-2 pt-2">
                  <UCheckbox v-model="showCalendar"/>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Show Calendar</span>
                </div>
              </div>

              <!-- STATIC PERIOD mode (date) -->
              <div v-if="filterMode === 'static_period'" class="pt-3 space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Interval</label>
                  <select v-model="staticInterval" class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="quarters">Quarters</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <UCheckbox v-model="staticSingleSelect"/>
                  <span class="text-sm text-gray-600 dark:text-gray-400">Single Select</span>
                </div>
                <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Quick Select</div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <label v-for="period in staticPeriodOptions" :key="period.value" class="flex items-center gap-2 cursor-pointer">
                    <UCheckbox :model-value="selectedStaticPeriods.includes(period.value)" @update:model-value="toggleStaticPeriod(period.value)"/>
                    <span>{{ period.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="cancel" class="cursor-pointer">Cancel</UButton>
        <UButton color="primary" :disabled="!canApply" :loading="saving" @click="apply" class="cursor-pointer">Apply</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

interface Connection {
  id: number
  internalName: string
}

interface TableRow {
  id: string
  name: string
}

interface ColumnRow {
  fieldId: string
  name: string
  type: string
}

interface EditingFilter {
  id: string
  connectionId: number | null
  fieldId: string
  fieldTable: string
  fieldType: string
  filterName: string
  isVisible: boolean
  filterMode: string
  config: Record<string, any>
  currentValue: any
}

const props = defineProps<{
  open: boolean
  dashboardId: string
  connections: Connection[]
  editingFilter?: EditingFilter | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'created', filter: any): void
  (e: 'updated', filter: any): void
}>()

const isEditMode = computed(() => !!props.editingFilter)

const internalOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

// Connection and schema
const selectedConnectionId = ref<number | null>(null)
const loadingSchema = ref(false)
const tables = ref<TableRow[]>([])
const columnsByTable = ref<Record<string, ColumnRow[]>>({})
const expandedTables = ref<Record<string, boolean>>({})
const fieldSearch = ref('')

// Selected field
const selectedField = ref<{ table: TableRow; column: ColumnRow } | null>(null)

// Filter configuration
const filterVisible = ref(true)
const filterName = ref('')
const filterMode = ref<'values' | 'text_rule' | 'constraint' | 'dynamic_range' | 'static_period'>('values')

// Values mode
const loadingValues = ref(false)
const distinctValues = ref<string[]>([])
const selectedValues = ref<string[]>([])
const valueSearch = ref('')
const selectAllValues = ref(false)
const appendNull = ref(false)
const singleSelect = ref(false)

// Text rule mode
const textRuleOperator = ref('contain')
const textRuleValue = ref('')

// Constraint mode (numeric)
const constraintOperator = ref('equal')
const constraintValue = ref<number | null>(null)
const constraintValueTo = ref<number | null>(null)

// Dynamic range mode (date)
const selectedDynamicRanges = ref<string[]>(['today', 'yesterday', 'last_7_days'])
const showCalendar = ref(true)

// Static period mode (date)
const staticInterval = ref('months')
const staticSingleSelect = ref(false)
const selectedStaticPeriods = ref<string[]>(['last_month', 'this_month', 'ytd'])

const saving = ref(false)

// Options
const dynamicRangeOptions = [
  {value: 'today', label: 'Today'},
  {value: 'yesterday', label: 'Yesterday'},
  {value: 'tomorrow', label: 'Tomorrow'},
  {value: 'last_7_days', label: 'Last 7 days'},
  {value: 'last_30_days', label: 'Last 30 days'},
  {value: 'this_week', label: 'This week'},
  {value: 'last_week', label: 'Last week'},
  {value: 'this_month', label: 'This month'},
  {value: 'last_month', label: 'Last month'},
]

const staticPeriodOptions = [
  {value: 'last_year', label: 'Last year'},
  {value: 'last_month', label: 'Last month'},
  {value: 'this_month', label: 'This month'},
  {value: 'this_quarter', label: 'This quarter'},
  {value: 'ytd', label: 'Year-to-date'},
]

// Computed
const filteredTables = computed(() => {
  const q = fieldSearch.value.toLowerCase()
  return tables.value.filter(t => t.name.toLowerCase().includes(q))
})

const filteredValues = computed(() => {
  const q = valueSearch.value.toLowerCase()
  return distinctValues.value.filter(v => (v ?? '').toLowerCase().includes(q))
})

const fieldType = computed(() => {
  if (!selectedField.value) return null
  const type = selectedField.value.column.type.toLowerCase()
  if (['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'numeric', 'smallint', 'real', 'number'].some(t => type.includes(t))) {
    return 'numeric'
  }
  if (['date', 'datetime', 'timestamp', 'time'].some(t => type.includes(t))) {
    return 'date'
  }
  return 'text'
})

const availableModes = computed(() => {
  if (fieldType.value === 'numeric') {
    return [
      {value: 'values', label: 'VALUES'},
      {value: 'constraint', label: 'CONSTRAINT'},
    ]
  }
  if (fieldType.value === 'date') {
    return [
      {value: 'dynamic_range', label: 'DYNAMIC RANGE'},
      {value: 'static_period', label: 'STATIC PERIOD'},
    ]
  }
  return [
    {value: 'values', label: 'VALUES'},
    {value: 'text_rule', label: 'TEXT RULE'},
  ]
})

const canApply = computed(() => {
  return selectedField.value && filterName.value.trim()
})

// Methods
function getTypeIcon(type: string) {
  const t = type.toLowerCase()
  if (['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'numeric', 'smallint', 'real', 'number'].some(n => t.includes(n))) {
    return 'i-heroicons-hashtag'
  }
  if (['date', 'datetime', 'timestamp', 'time'].some(n => t.includes(n))) {
    return 'i-heroicons-calendar'
  }
  return 'i-heroicons-document-text'
}

function getTypeIconColor(type: string) {
  const t = type.toLowerCase()
  if (['int', 'integer', 'bigint', 'decimal', 'float', 'double', 'numeric', 'smallint', 'real', 'number'].some(n => t.includes(n))) {
    return 'text-blue-500'
  }
  if (['date', 'datetime', 'timestamp', 'time'].some(n => t.includes(n))) {
    return 'text-green-500'
  }
  return 'text-gray-500'
}

function toggleTableExpand(tableId: string) {
  expandedTables.value[tableId] = !expandedTables.value[tableId]
}

function getFilteredColumns(tableId: string) {
  const cols = columnsByTable.value[tableId] || []
  const q = fieldSearch.value.toLowerCase()
  if (!q) return cols
  return cols.filter(c => c.name.toLowerCase().includes(q))
}

function isFieldSelected(tableId: string, fieldId: string) {
  return selectedField.value?.table.id === tableId && selectedField.value?.column.fieldId === fieldId
}

async function selectField(table: TableRow, column: ColumnRow) {
  selectedField.value = {table, column}
  filterName.value = column.name

  // Set default mode based on type
  const type = column.type.toLowerCase()
  if (['date', 'datetime', 'timestamp', 'time'].some(t => type.includes(t))) {
    filterMode.value = 'dynamic_range'
  } else {
    filterMode.value = 'values'
    // Load distinct values for VALUES mode
    await loadDistinctValues()
  }
}

async function onConnectionChange() {
  if (!selectedConnectionId.value) return

  loadingSchema.value = true
  tables.value = []
  columnsByTable.value = {}
  selectedField.value = null

  try {
    const res = await $fetch<{ tables: TableRow[]; columnsByTable: Record<string, ColumnRow[]> }>('/api/schema/tables-and-columns', {
      method: 'POST',
      body: {connectionId: selectedConnectionId.value}
    })
    tables.value = res.tables
    columnsByTable.value = res.columnsByTable

    // Auto-expand first table
    if (tables.value.length > 0) {
      expandedTables.value[tables.value[0].id] = true
    }
  } catch (err) {
    console.error('Failed to load schema:', err)
  } finally {
    loadingSchema.value = false
  }
}

async function loadDistinctValues() {
  if (!selectedField.value || !selectedConnectionId.value) return

  loadingValues.value = true
  distinctValues.value = []
  selectedValues.value = []

  try {
    const res = await $fetch<{ values: string[] }>('/api/reporting/distinct-values', {
      method: 'POST',
      body: {
        connectionId: selectedConnectionId.value,
        tableName: selectedField.value.table.name,
        columnName: selectedField.value.column.name
      }
    })
    distinctValues.value = res.values || []
  } catch (err) {
    console.error('Failed to load distinct values:', err)
  } finally {
    loadingValues.value = false
  }
}

function toggleValue(val: string) {
  const idx = selectedValues.value.indexOf(val)
  if (idx >= 0) {
    selectedValues.value.splice(idx, 1)
  } else {
    selectedValues.value.push(val)
  }
  updateSelectAllState()
}

function toggleSelectAll() {
  if (selectAllValues.value) {
    selectedValues.value = [...distinctValues.value]
  } else {
    selectedValues.value = []
  }
}

function updateSelectAllState() {
  selectAllValues.value = distinctValues.value.length > 0 && selectedValues.value.length === distinctValues.value.length
}

function toggleDynamicRange(value: string) {
  const idx = selectedDynamicRanges.value.indexOf(value)
  if (idx >= 0) {
    selectedDynamicRanges.value.splice(idx, 1)
  } else {
    selectedDynamicRanges.value.push(value)
  }
}

function toggleStaticPeriod(value: string) {
  const idx = selectedStaticPeriods.value.indexOf(value)
  if (idx >= 0) {
    selectedStaticPeriods.value.splice(idx, 1)
  } else {
    selectedStaticPeriods.value.push(value)
  }
}

function cancel() {
  internalOpen.value = false
}

async function apply() {
  if (!selectedField.value || !selectedConnectionId.value) return

  saving.value = true

  // Build config based on mode
  const config: Record<string, any> = {}

  if (filterMode.value === 'values') {
    config.selectedValues = selectedValues.value
    config.appendNull = appendNull.value
    config.singleSelect = singleSelect.value
  } else if (filterMode.value === 'text_rule') {
    config.operator = textRuleOperator.value
    config.value = textRuleValue.value
  } else if (filterMode.value === 'constraint') {
    config.operator = constraintOperator.value
    config.value = constraintValue.value
    if (constraintOperator.value === 'between') {
      config.valueTo = constraintValueTo.value
    }
  } else if (filterMode.value === 'dynamic_range') {
    config.ranges = selectedDynamicRanges.value
    config.showCalendar = showCalendar.value
  } else if (filterMode.value === 'static_period') {
    config.interval = staticInterval.value
    config.singleSelect = staticSingleSelect.value
    config.periods = selectedStaticPeriods.value
  }

  try {
    if (isEditMode.value && props.editingFilter) {
      // Update existing filter
      const res = await $fetch<{ filter: any }>(`/api/dashboards/${props.dashboardId}/filters/${props.editingFilter.id}`, {
        method: 'PUT',
        body: {
          filterName: filterName.value,
          isVisible: filterVisible.value,
          filterMode: filterMode.value,
          config
        }
      })
      emit('updated', res.filter)
    } else {
      // Create new filter
      const res = await $fetch<{ filter: any }>(`/api/dashboards/${props.dashboardId}/filters`, {
        method: 'POST',
        body: {
          connectionId: selectedConnectionId.value,
          fieldId: selectedField.value.column.name,
          fieldTable: selectedField.value.table.name,
          fieldType: fieldType.value,
          filterName: filterName.value,
          isVisible: filterVisible.value,
          filterMode: filterMode.value,
          config
        }
      })
      emit('created', res.filter)
    }
    internalOpen.value = false
  } catch (err) {
    console.error('Failed to save filter:', err)
  } finally {
    saving.value = false
  }
}

// Watch for mode changes to load values when switching to VALUES mode
watch(filterMode, async (mode) => {
  if (mode === 'values' && selectedField.value && distinctValues.value.length === 0) {
    await loadDistinctValues()
  }
})

// Reset state when modal closes
watch(internalOpen, (open) => {
  if (!open) {
    selectedField.value = null
    filterName.value = ''
    filterMode.value = 'values'
    selectedValues.value = []
    distinctValues.value = []
  }
})

// Populate form when editing
watch(() => props.editingFilter, async (filter) => {
  if (filter && props.open) {
    // Set connection and load schema
    selectedConnectionId.value = filter.connectionId
    if (filter.connectionId) {
      await onConnectionChange()
    }

    // Find and select the field
    const table = tables.value.find(t => t.name === filter.fieldTable)
    const column = columnsByTable.value[table?.id || '']?.find(c => c.name === filter.fieldId)
    if (table && column) {
      expandedTables.value[table.id] = true
      selectedField.value = { table, column }
    }

    // Set filter properties
    filterName.value = filter.filterName
    filterVisible.value = filter.isVisible
    filterMode.value = filter.filterMode as any

    // Restore config values based on mode
    const config = filter.config || {}
    if (filter.filterMode === 'values') {
      await loadDistinctValues()
      selectedValues.value = config.selectedValues || []
      appendNull.value = config.appendNull || false
      singleSelect.value = config.singleSelect || false
    } else if (filter.filterMode === 'text_rule') {
      textRuleOperator.value = config.operator || 'contain'
      textRuleValue.value = config.value || ''
    } else if (filter.filterMode === 'constraint') {
      constraintOperator.value = config.operator || 'equal'
      constraintValue.value = config.value ?? null
      constraintValueTo.value = config.valueTo ?? null
    } else if (filter.filterMode === 'dynamic_range') {
      selectedDynamicRanges.value = config.ranges || ['today', 'yesterday', 'last_7_days']
      showCalendar.value = config.showCalendar ?? true
    } else if (filter.filterMode === 'static_period') {
      staticInterval.value = config.interval || 'months'
      staticSingleSelect.value = config.singleSelect || false
      selectedStaticPeriods.value = config.periods || ['last_month', 'this_month', 'ytd']
    }
  }
}, { immediate: true })
</script>
