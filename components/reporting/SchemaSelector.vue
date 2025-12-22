<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border rounded-md">
        <div class="px-3 py-2 font-medium dark:bg-dark-light text-gray-900 dark:text-white flex items-center justify-between">
          <span>List of tables</span>
          <div class="flex items-center gap-2 text-sm">
            <UCheckbox :model-value="allSelected" @update:model-value="toggleAll" />
            <span class="text-gray-700 dark:text-gray-200">{{ allSelected ? 'Deselect all' : 'Select all' }}</span>
          </div>
        </div>
        <div class="p-2 max-h-72 overflow-auto">
          <div class="mb-2 relative">
            <UInput v-model="tablesQuery" placeholder="Search" class="w-full pr-8" />
            <button v-if="tablesQuery" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" @click="tablesQuery = ''">
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </div>
          <ul class="space-y-1">
            <li v-for="t in filteredTables" :key="t.id" class="flex items-center gap-2">
              <UCheckbox :model-value="!!selected[t.id]" @update:model-value="(v) => toggleTable(t.id, v)" />
              <button class="text-left flex-1 truncate" @click="toggleExpand(t.id)">{{ t.label || t.name }}</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="border rounded-md">
        <div class="px-3 py-2 font-medium  text-gray-900 dark:text-white">List of fields</div>
        <div class="p-2 max-h-72 overflow-auto" v-if="expanded">
          <div class="text-sm mb-2 text-gray-600 dark:text-gray-300">{{ expanded }}</div>
          <ul class="space-y-1">
            <li v-for="c in columnsForExpanded" :key="c.fieldId" class="flex items-center gap-2">
              <UCheckbox :model-value="!!selected[expanded]?.columns?.[c.fieldId]" @update:model-value="(v) => toggleColumn(expanded, c, v)" />
              <span class="flex-1 truncate">{{ c.label || c.name }}</span>
              <UBadge size="xs" variant="soft" color="neutral">{{ c.type }}</UBadge>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <div class="text-xs text-gray-600 dark:text-gray-300">{{ selectedCount }} fields selected across {{ Object.keys(selected).length }} table(s)</div>
    </div>
  </div>
  </template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

type TableRow = { id: string; name: string; label?: string }
type ColumnRow = { fieldId: string; name: string; label?: string; type: string; isNumeric?: boolean }

const props = defineProps<{ tables: TableRow[]; columnsByTable: Record<string, ColumnRow[]>; initialSelected?: Record<string, string[]> }>()
const emit = defineEmits<{ (e: 'save', payload: any): void }>()

const selected = ref<Record<string, { columns: Record<string, ColumnRow> }>>({})
const expanded = ref<string | null>(null)
const tablesQuery = ref('')

// Initialize: select all tables and all columns by default
function initializeSelection() {
  const sel: Record<string, { columns: Record<string, ColumnRow> }> = {}
  const hasInitial = !!props.initialSelected && Object.keys(props.initialSelected || {}).length > 0
  for (const t of props.tables || []) {
    const cols = props.columnsByTable?.[t.id] || []
    const map: Record<string, ColumnRow> = {}
    if (hasInitial) {
      const allowed = new Set((props.initialSelected?.[t.id] || []).map(String))
      for (const c of cols) if (allowed.has(String(c.fieldId))) map[c.fieldId] = c
      if (Object.keys(map).length > 0) sel[t.id] = { columns: map }
    } else {
      for (const c of cols) map[c.fieldId] = c
      sel[t.id] = { columns: map }
    }
  }
  selected.value = sel
  if (!expanded.value && props.tables?.length) expanded.value = props.tables[0].id
}

watch(() => props.tables, () => initializeSelection(), { immediate: true })
watch(() => props.columnsByTable, () => initializeSelection(), { immediate: true })

const filteredTables = computed(() => {
  const q = tablesQuery.value.trim().toLowerCase()
  if (!q) return props.tables
  return (props.tables || []).filter(t => (t.label || t.name).toLowerCase().includes(q))
})

const columnsForExpanded = computed(() => {
  if (!expanded.value) return [] as ColumnRow[]
  return props.columnsByTable?.[expanded.value] || []
})

const selectedCount = computed(() => {
  return Object.values(selected.value).reduce((acc, t) => acc + Object.keys(t.columns).length, 0)
})

const allSelected = computed(() => {
  const totalTables = (props.tables || []).length
  if (!totalTables) return false
  const selectedTables = Object.keys(selected.value).length
  if (selectedTables !== totalTables) return false
  for (const t of props.tables) {
    const cols = props.columnsByTable?.[t.id] || []
    if (Object.keys(selected.value[t.id]?.columns || {}).length !== cols.length) return false
  }
  return true
})

function toggleAll(checked: boolean) {
  if (checked) {
    initializeSelection()
  } else {
    selected.value = {}
  }
}

function toggleExpand(id: string) {
  expanded.value = id
}

function toggleTable(id: string, checked: boolean) {
  if (checked) {
    const cols = props.columnsByTable?.[id] || []
    const map: Record<string, ColumnRow> = {}
    for (const c of cols) map[c.fieldId] = c
    selected.value[id] = { columns: map }
  } else {
    delete selected.value[id]
  }
}

function toggleColumn(tableId: string, col: ColumnRow, checked: boolean) {
  if (!selected.value[tableId]) selected.value[tableId] = { columns: {} }
  if (checked) selected.value[tableId].columns[col.fieldId] = col
  else delete selected.value[tableId].columns[col.fieldId]
}

function emitSave() {
  const payload = {
    tables: Object.entries(selected.value).map(([tableId, t]) => ({
      tableId,
      columns: Object.values(t.columns)
    }))
  }
  emit('save', payload)
}

// Expose the selected state for external access
defineExpose({
  selected
})
</script>


