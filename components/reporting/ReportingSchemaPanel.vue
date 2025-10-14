<template>
  <div class="rounded-md overflow-hidden">
    <!-- Dataset header -->
    <button v-if="false" class="w-full flex items-center justify-between px-3 py-2 bg-primary text-white text-sm font-medium"
            @click="expanded = !expanded">
      <span class="truncate">{{ datasetName || 'Fields' }}</span>
      <Icon :name="expanded ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" class="w-4 h-4" />
    </button>

    <div v-if="expanded" class="bg-dark text-white p-3 space-y-3">
      <!-- Search -->
      <div v-if="false" class="relative">
        <Icon name="heroicons:magnifying-glass" class="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="query" type="text" placeholder="Search" 
               class="w-full pl-7 pr-2 py-1.5 text-sm rounded bg-dark-light text-white placeholder-neutral-400 border border-dark-lighter focus:outline-none focus:ring-1 focus:ring-primary-400" />
      </div>

      <!-- Fields list -->
      <ul class="space-y-2">
        <li
          v-for="f in filteredFields"
          :key="f.fieldId"
          class="select-text"
        >
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-neutral-900 border border-neutral-200 shadow-sm">
            <div class="w-4 h-4 text-neutral-400 cursor-move" draggable="true" @dragstart="onDragStart(f)">
              <Icon name="heroicons:bars-3" class="w-4 h-4" />
            </div>
            <div class="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center text-[11px] font-semibold">
              {{ isNumeric(f.type) ? '#' : 'A' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm truncate">{{ f.label || f.name }}</div>
            </div>
            <div class="flex items-center gap-1">
              <Icon v-if="(f as any).isPrimaryKey" name="heroicons:key" class="w-4 h-4 text-amber-600" />
              <span v-if="(f as any).foreignKeyRefs?.length" class="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                FK
              </span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import type { ReportField } from '../../composables/useReportState'

const props = defineProps<{ fields: Array<ReportField>; datasetName?: string }>()

const query = ref('')
const expanded = ref(true)

const filteredFields = computed(() => {
  if (!query.value) return props.fields
  const q = query.value.toLowerCase()
  return props.fields.filter(f => (f.label || f.name || '').toLowerCase().includes(q))
})

function isNumeric(type?: string) {
  if (!type) return false
  const t = type.toLowerCase()
  return [
    'int','integer','bigint','smallint','tinyint','float','double','real','decimal','numeric'
  ].some(k => t.includes(k))
}

function onDragStart(field: ReportField) {
  const dt = (event as DragEvent).dataTransfer
  if (!dt) return
  const payload = { ...field, table: props.datasetName || field.table }
  dt.setData('application/json', JSON.stringify({ type: 'field', field: payload }))
  dt.effectAllowed = 'copyMove'
}
</script>

<style scoped>
</style>


