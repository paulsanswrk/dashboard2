<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <input id="excludeNulls" type="checkbox" v-model="excludeNullsInDimensions" />
      <label for="excludeNulls" class="text-sm">Exclude nulls in dimensions</label>
    </div>
    <div>
      <h3 class="font-medium mb-2">Filters</h3>
      <div v-for="(f, idx) in filters" :key="idx" class="mb-3">
        <div class="flex flex-col gap-2">
          <select v-model="filters[idx].field.fieldId" class="border rounded px-2 py-1 w-full text-gray-500">
            <option disabled value="">Field</option>
            <option v-for="fld in availableFields" :key="fld.fieldId" :value="fld.fieldId">{{ fld.label || fld.name }}</option>
          </select>
          <select v-model="filters[idx].operator" class="border rounded px-2 py-1 w-full text-gray-500" @change="onOperatorChange(idx)">
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="in">in</option>
            <option value="between">between</option>
            <option value="is_null">is null</option>
            <option value="not_null">is not null</option>
          </select>
          <input v-if="!['is_null','not_null','between','in'].includes(filters[idx].operator)" v-model="filters[idx].value" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="value" />
          <div v-if="filters[idx].operator==='between'" class="flex flex-col gap-2">
            <input v-model="filters[idx].value.start" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="start" />
            <input v-model="filters[idx].value.end" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="end" />
          </div>
          <input v-if="filters[idx].operator==='in'" v-model="filters[idx].value" class="border rounded px-2 py-1 w-full text-gray-500" placeholder="a,b,c" />
        </div>
        <div class="flex justify-end mt-1">
          <button class="text-xs text-red-600 underline" @click="remove(idx)">remove</button>
        </div>
      </div>
      <button class="text-sm underline" @click="add">+ add filter</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReportState, type ReportField } from '@/composables/useReportState'

const props = defineProps<{ schema: Array<ReportField> }>()
const { filters, excludeNullsInDimensions } = useReportState()

const availableFields = computed(() => props.schema)

function add() {
  filters.value.push({ field: { fieldId: '' }, operator: 'equals', value: '' } as any)
}
function remove(idx: number) {
  filters.value.splice(idx, 1)
}

function onOperatorChange(idx: number) {
  const op = filters.value[idx].operator
  if (op === 'between') {
    filters.value[idx].value = { start: '', end: '' }
  } else if (op === 'in') {
    filters.value[idx].value = ''
  } else if (op === 'is_null' || op === 'not_null') {
    filters.value[idx].value = undefined
  } else {
    filters.value[idx].value = ''
  }
}
</script>

<style scoped>
</style>


