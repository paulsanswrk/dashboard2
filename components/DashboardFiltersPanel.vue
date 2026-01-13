<template>
  <div
      v-if="filters.length > 0 || editMode"
      class="bg-white dark:bg-gray-800 flex flex-col"
      :class="collapsed ? 'w-10' : ''"
  >
    <!-- Header (only shown in collapsed state for expand button) -->
    <div v-if="collapsed" class="flex items-center justify-center px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <button @click="$emit('expand')" class="text-gray-400 hover:text-gray-600 cursor-pointer" title="Expand filters">
        <Icon name="i-heroicons-funnel" class="w-4 h-4"/>
      </button>
    </div>

    <!-- Filter list -->
    <div v-if="!collapsed" class="flex-1 overflow-auto p-2 space-y-3">
      <!-- Add Filter button in edit mode -->
      <button
          v-if="editMode"
          @click="$emit('add-filter')"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-md border border-purple-200 dark:border-purple-800 transition-all duration-200 cursor-pointer"
      >
        <Icon name="i-heroicons-plus" class="w-4 h-4"/>
        Add Filter
      </button>

      <div v-if="filters.length === 0" class="text-center py-8 text-gray-400 text-sm">
        <Icon name="i-heroicons-funnel" class="w-8 h-8 mx-auto mb-2 opacity-50"/>
        <p>No filters configured</p>
      </div>

      <div
          v-for="filter in filters"
          :key="filter.id"
          class="border dark:border-gray-700 rounded-md overflow-hidden"
          :class="{'opacity-50': !filter.isVisible}"
      >
        <!-- Filter header -->
        <div class="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900">
          <span class="text-sm font-medium truncate">{{ filter.filterName }}</span>
          <div v-if="editMode" class="flex items-center gap-1">
            <button @click="$emit('edit', filter)" class="p-1 text-gray-400 hover:text-primary-500 cursor-pointer" title="Edit filter">
              <Icon name="i-heroicons-pencil" class="w-3.5 h-3.5"/>
            </button>
            <button @click="$emit('delete', filter)" class="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Delete filter">
              <Icon name="i-heroicons-trash" class="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>

        <!-- Filter control based on mode -->
        <div class="p-2">
          <!-- VALUES mode -->
          <template v-if="filter.filterMode === 'values'">
            <!-- Each value as a toggleable condition -->
            <div class="space-y-1.5">
              <label
                  v-for="val in getFilterValues(filter)"
                  :key="val"
                  class="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1.5 rounded border transition-colors"
                  :class="isValueSelected(filter, val) 
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700'"
              >
                <UCheckbox
                    :model-value="isValueSelected(filter, val)"
                    @update:model-value="(checked) => toggleFilterValue(filter, val, checked)"
                />
                <span class="font-mono text-gray-600 dark:text-gray-300">
                  {{ filter.fieldTable }}.{{ filter.fieldId }} = '{{ val ?? 'null' }}'
                </span>
              </label>
            </div>
            <div v-if="getFilterValues(filter).length === 0" class="text-xs text-gray-400 italic py-2">
              No values configured
            </div>
          </template>


          <!-- TEXT RULE mode -->
          <template v-else-if="filter.filterMode === 'text_rule'">
            <div class="text-xs text-gray-500 mb-1">
              {{ getTextRuleLabel(filter.config?.operator) }}
            </div>
            <UInput
                :model-value="getTextRuleValue(filter)"
                @update:model-value="(v) => updateTextRuleValue(filter, v)"
                placeholder="Enter value..."
                size="sm"
            />
          </template>

          <!-- CONSTRAINT mode -->
          <template v-else-if="filter.filterMode === 'constraint'">
            <div class="text-xs text-gray-500 mb-1">
              {{ getConstraintLabel(filter.config?.operator) }}
            </div>
            <div class="flex items-center gap-2">
              <UInput
                  :model-value="getConstraintValue(filter)"
                  @update:model-value="(v) => updateConstraintValue(filter, v)"
                  type="number"
                  size="sm"
                  class="flex-1"
              />
              <template v-if="filter.config?.operator === 'between'">
                <span class="text-xs text-gray-400">-</span>
                <UInput
                    :model-value="getConstraintValueTo(filter)"
                    @update:model-value="(v) => updateConstraintValueTo(filter, v)"
                    type="number"
                    size="sm"
                    class="flex-1"
                />
              </template>
            </div>
          </template>

          <!-- DYNAMIC RANGE mode -->
          <template v-else-if="filter.filterMode === 'dynamic_range'">
            <select
                :value="getSelectedRange(filter)"
                @change="(e) => updateSelectedRange(filter, (e.target as HTMLSelectElement).value)"
                class="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All time</option>
              <option v-for="range in filter.config?.ranges || []" :key="range" :value="range">
                {{ formatRangeLabel(range) }}
              </option>
            </select>
          </template>

          <!-- STATIC PERIOD mode -->
          <template v-else-if="filter.filterMode === 'static_period'">
            <select
                :value="getSelectedPeriod(filter)"
                @change="(e) => updateSelectedPeriod(filter, (e.target as HTMLSelectElement).value)"
                class="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All time</option>
              <option v-for="period in filter.config?.periods || []" :key="period" :value="period">
                {{ formatPeriodLabel(period) }}
              </option>
            </select>
          </template>
        </div>
      </div>
    </div>

    <!-- Clear all button -->
    <div v-if="!collapsed && activeFilterCount > 0" class="p-2 border-t dark:border-gray-700">
      <button
          @click="clearAllFilters"
          class="w-full px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
      >
        Clear all filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'

interface DashboardFilter {
  id: string
  dashboardId: string
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
  filters: DashboardFilter[]
  editMode: boolean
  collapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'update', filter: DashboardFilter): void
  (e: 'edit', filter: DashboardFilter): void
  (e: 'delete', filter: DashboardFilter): void
  (e: 'collapse'): void
  (e: 'expand'): void
  (e: 'clearAll'): void
  (e: 'add-filter'): void
}>()

const activeFilterCount = computed(() => {
  return props.filters.filter(f => f.currentValue != null && (
      Array.isArray(f.currentValue) ? f.currentValue.length > 0 : f.currentValue !== ''
  )).length
})

// VALUES mode helpers
function getFilterValues(filter: DashboardFilter): string[] {
  return filter.config?.selectedValues || []
}

function hasActiveValue(filter: DashboardFilter): boolean {
  const current = filter.currentValue as string[] | null
  return Array.isArray(current) && current.length > 0
}

function getActiveValueCount(filter: DashboardFilter): number {
  const current = filter.currentValue as string[] | null
  return Array.isArray(current) ? current.length : 0
}

function isValueSelected(filter: DashboardFilter, val: string): boolean {
  const current = filter.currentValue as string[] | null
  return current?.includes(val) ?? false
}


function toggleFilterValue(filter: DashboardFilter, val: string, checked: boolean) {
  const current = (filter.currentValue as string[] | null) || []
  let newValue: string[]
  if (checked) {
    newValue = [...current, val]
  } else {
    newValue = current.filter(v => v !== val)
  }
  emit('update', {...filter, currentValue: newValue.length > 0 ? newValue : null})
}

// TEXT RULE mode helpers
function getTextRuleLabel(operator: string): string {
  const labels: Record<string, string> = {
    start_with: 'Starts with',
    end_with: 'Ends with',
    contain: 'Contains',
    equal: 'Equals',
    not_start_with: 'Does not start with',
    not_end_with: 'Does not end with',
    not_contain: 'Does not contain',
    not_equal: 'Does not equal',
  }
  return labels[operator] || operator
}

function getTextRuleValue(filter: DashboardFilter): string {
  return (filter.currentValue as string) || ''
}

function updateTextRuleValue(filter: DashboardFilter, value: string) {
  emit('update', {...filter, currentValue: value || null})
}

// CONSTRAINT mode helpers
function getConstraintLabel(operator: string): string {
  const labels: Record<string, string> = {
    equal: 'Equals',
    not_equal: 'Not equal to',
    lt: 'Less than',
    lte: 'Less than or equal',
    gt: 'Greater than',
    gte: 'Greater than or equal',
    between: 'Between',
  }
  return labels[operator] || operator
}

function getConstraintValue(filter: DashboardFilter): number | null {
  const current = filter.currentValue as { value?: number; valueTo?: number } | null
  return current?.value ?? null
}

function getConstraintValueTo(filter: DashboardFilter): number | null {
  const current = filter.currentValue as { value?: number; valueTo?: number } | null
  return current?.valueTo ?? null
}

function updateConstraintValue(filter: DashboardFilter, value: string | number) {
  const current = (filter.currentValue as { value?: number; valueTo?: number } | null) || {}
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) {
    emit('update', {...filter, currentValue: null})
  } else {
    emit('update', {...filter, currentValue: {...current, value: numValue}})
  }
}

function updateConstraintValueTo(filter: DashboardFilter, value: string | number) {
  const current = (filter.currentValue as { value?: number; valueTo?: number } | null) || {}
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) {
    const {valueTo, ...rest} = current
    emit('update', {...filter, currentValue: Object.keys(rest).length > 0 ? rest : null})
  } else {
    emit('update', {...filter, currentValue: {...current, valueTo: numValue}})
  }
}

// DYNAMIC RANGE mode helpers
function getSelectedRange(filter: DashboardFilter): string {
  return (filter.currentValue as string) || ''
}

function updateSelectedRange(filter: DashboardFilter, value: string) {
  emit('update', {...filter, currentValue: value || null})
}

function formatRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    last_7_days: 'Last 7 days',
    last_30_days: 'Last 30 days',
    this_week: 'This week',
    last_week: 'Last week',
    this_month: 'This month',
    last_month: 'Last month',
  }
  return labels[range] || range
}

// STATIC PERIOD mode helpers
function getSelectedPeriod(filter: DashboardFilter): string {
  return (filter.currentValue as string) || ''
}

function updateSelectedPeriod(filter: DashboardFilter, value: string) {
  emit('update', {...filter, currentValue: value || null})
}

function formatPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    last_year: 'Last year',
    last_month: 'Last month',
    this_month: 'This month',
    this_quarter: 'This quarter',
    ytd: 'Year-to-date',
  }
  return labels[period] || period
}

function clearAllFilters() {
  emit('clearAll')
}
</script>
