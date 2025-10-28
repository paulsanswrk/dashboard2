<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <input id="excludeNulls" type="checkbox" v-model="excludeNullsInDimensions" :disabled="props.disabled" />
      <label for="excludeNulls" class="text-sm" :class="{ 'text-gray-400': props.disabled }">Exclude nulls in dimensions</label>
    </div>
    <div>
      <h3 class="font-medium mb-2">Filters</h3>
      <div v-if="props.disabled" class="text-sm text-gray-500 mb-3 p-2 bg-gray-50 rounded border">
        Select a dataset to add filters
      </div>
      <div v-for="(f, idx) in filters" :key="idx" class="mb-3">
        <div class="flex flex-col gap-2">
          <select :value="filters[idx].field.fieldId" @input="onFieldChange(idx, $event.target.value)" class="border rounded px-2 py-1 w-full text-gray-500" :disabled="props.disabled">
            <option disabled value="">Field</option>
            <option v-for="fld in availableFields" :key="fld.fieldId" :value="fld.fieldId">{{ fld.table ? `${fld.table}.` : '' }}{{ fld.name || fld.label || fld.fieldId }}</option>
          </select>
          <select :value="filters[idx].operator" @input="onOperatorChange(idx, $event.target.value)" class="border rounded px-2 py-1 w-full text-gray-500" :disabled="props.disabled">
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="in">in</option>
            <option value="between">between</option>
            <option value="is_null">is null</option>
            <option value="not_null">is not null</option>
          </select>
          <input v-if="!['is_null','not_null','between','in'].includes(filters[idx].operator)" :value="filters[idx].value" @input="updateFilterValue(idx, $event.target.value)" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="value" :disabled="props.disabled" />
          <div v-if="filters[idx].operator==='between'" class="flex flex-col gap-2">
            <input :value="filters[idx].value?.start || ''" @input="updateFilterValue(idx, { ...filters[idx].value, start: $event.target.value })" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="start" :disabled="props.disabled" />
            <input :value="filters[idx].value?.end || ''" @input="updateFilterValue(idx, { ...filters[idx].value, end: $event.target.value })" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="end" :disabled="props.disabled" />
          </div>
          <input v-if="filters[idx].operator==='in'" :value="filters[idx].value" @input="updateFilterValue(idx, $event.target.value)" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="a,b,c" :disabled="props.disabled" />
        </div>
        <div class="flex justify-end mt-1">
          <button class="text-xs text-red-600 underline" @click="remove(idx)" :disabled="props.disabled">remove</button>
        </div>
      </div>
      <button class="text-sm underline" @click="add" :disabled="props.disabled" :class="{ 'opacity-50 cursor-not-allowed': props.disabled }">+ add filter</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useReportState, type ReportField } from '@/composables/useReportState'

const props = defineProps<{
  schema: Array<ReportField>
  disabled?: boolean
}>()
const { filters, excludeNullsInDimensions, xDimensions, yMetrics, breakdowns } = useReportState()

// Fallback fields from Zones when schema is not available yet
const zoneFields = computed<ReportField[]>(() => {
  const byId: Record<string, ReportField> = {}
  for (const f of [...xDimensions.value, ...yMetrics.value, ...breakdowns.value]) {
    const key = f.fieldId || `${f.table || ''}.${f.name || ''}`
    if (!key) continue
    if (!byId[key]) byId[key] = { fieldId: f.fieldId || key, name: f.name, label: f.label, type: f.type, table: f.table }
  }
  return Object.values(byId)
})

const availableFields = computed(() => {
  const tables = new Set<string>(
    [...xDimensions.value, ...yMetrics.value, ...breakdowns.value]
      .map(f => f.table)
      .filter((t): t is string => !!t)
  )
  // If schema is empty, use fields already present in Zones
  if (!props.schema?.length) return zoneFields.value
  if (!tables.size) return []
  // If schema fields carry table info, filter by it
  /*const schemaHasTables = props.schema.some(f => !!(f as any).table)
  if (schemaHasTables) {
    return props.schema.filter(f => (f as any).table && tables.has((f as any).table as string))
  }*/
  // Otherwise, infer table for fields: if only one table is present in Zones, assign it for later tracking
  const onlyTable = tables.size === 1 ? Array.from(tables)[0] : null
  return props.schema.map(f => (onlyTable ? { ...f, table: onlyTable } : f))
})

// Remove filters whose table is no longer present in any Zone
watch([xDimensions, yMetrics, breakdowns], () => {
  const tables = new Set<string>(
    [...xDimensions.value, ...yMetrics.value, ...breakdowns.value]
      .map(f => f.table)
      .filter((t): t is string => !!t)
  )
  if (!tables.size) {
    // No zones populated => clear all filters
    filters.value = []
    return
  }
  // Keep filters that either belong to a remaining table or don't specify a table (avoid false removals)
  filters.value = filters.value.filter(f => !f?.field?.table || tables.has(f.field.table))
}, { deep: true })

function add() {
  if (props.disabled) return
  const newFilter = {
    field: { fieldId: '', name: '', label: '', type: '' },
    operator: 'equals',
    value: ''
  }
  filters.value.push(newFilter as any)
}
function remove(idx: number) {
  if (props.disabled) return
  filters.value.splice(idx, 1)
}

function onFieldChange(idx: number, fieldId: string) {
  const selectedField = availableFields.value.find(f => f.fieldId === fieldId)
  if (selectedField) {
    filters.value[idx] = { ...filters.value[idx], field: { ...selectedField } }
  }
}

function onOperatorChange(idx: number, operator: string) {
  const filter = filters.value[idx]
  let newValue: any = ''
  if (operator === 'between') {
    newValue = { start: '', end: '' }
  } else if (operator === 'in') {
    newValue = ''
  } else if (operator === 'is_null' || operator === 'not_null') {
    newValue = undefined
  }
  filters.value[idx] = { ...filter, operator, value: newValue }
}

function updateFilterValue(idx: number, value: any) {
  filters.value[idx] = { ...filters.value[idx], value }
}
</script>

<style scoped>
</style>


