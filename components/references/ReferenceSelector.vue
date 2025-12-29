<template>
  <div class="border rounded-md dark:border-gray-700 h-full flex flex-col">
    <div class="px-3 py-2 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between border-b dark:border-gray-700">
      <span>{{ title }}</span>
    </div>

    <!-- Search -->
    <div class="p-2 border-b dark:border-gray-700">
      <div class="relative">
        <UInput v-model="searchQuery" placeholder="Search" class="w-full pr-8"/>
        <button
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hover:text-gray-700"
            @click="searchQuery = ''"
        >
          <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
        </button>
      </div>
    </div>

    <!-- Tables List -->
    <div class="flex-1 overflow-auto p-2">
      <div v-if="filteredTables.length === 0" class="text-center text-gray-400 py-4 text-sm">
        No tables found
      </div>
      <ul class="space-y-1">
        <li v-for="table in filteredTables" :key="table.tableId">
          <!-- Table Header -->
          <button
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': expandedTable === table.tableId }"
              @click="toggleTable(table.tableId)"
          >
            <Icon
                :name="expandedTable === table.tableId ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-4 h-4 text-gray-500"
            />
            <span class="flex-1 text-left text-sm truncate">{{ table.tableName }}</span>
          </button>

          <!-- Columns (Expanded) -->
          <ul v-if="expandedTable === table.tableId" class="ml-6 mt-1 space-y-1">
            <li
                v-for="column in table.columns"
                :key="column.fieldId"
                class="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                :class="{ 'bg-primary-100 dark:bg-primary-800/30 ring-1 ring-primary-400': isSelected(table.tableId, column.fieldId) }"
                @click="selectColumn(table, column)"
            >
              <!-- Type Icon -->
              <span
                  class="w-5 h-5 flex items-center justify-center text-xs font-medium rounded"
                  :class="getTypeIconClass(column)"
              >
                {{ getTypeIcon(column) }}
              </span>
              <span class="flex-1 truncate">{{ column.name }}</span>
              <UBadge size="xs" variant="soft" color="neutral" class="text-[10px]">{{ column.type }}</UBadge>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  fieldId: string
  name: string
  type: string
  isNumeric?: boolean
  isDate?: boolean
  isString?: boolean
}

interface Table {
  tableId: string
  tableName: string
  columns: Column[]
}

const props = defineProps<{
  title: string
  tables: Table[]
  selectedTable?: string | null
  selectedColumn?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', payload: { table: Table; column: Column }): void
}>()

const searchQuery = ref('')
const expandedTable = ref<string | null>(null)

const filteredTables = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.tables
  return props.tables.filter(t =>
      t.tableName.toLowerCase().includes(q) ||
      t.columns.some(c => c.name.toLowerCase().includes(q))
  )
})

function toggleTable(tableId: string) {
  expandedTable.value = expandedTable.value === tableId ? null : tableId
}

function selectColumn(table: Table, column: Column) {
  emit('select', {table, column})
}

function isSelected(tableId: string, columnId: string): boolean {
  return props.selectedTable === tableId && props.selectedColumn === columnId
}

function getTypeIcon(column: Column): string {
  if (column.isNumeric || ['int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'double', 'float'].includes(column.type.toLowerCase())) {
    return '#'
  }
  if (column.isDate || ['date', 'datetime', 'timestamp', 'time'].includes(column.type.toLowerCase())) {
    return '⏱'
  }
  return 'A'
}

function getTypeIconClass(column: Column): string {
  if (column.isNumeric || ['int', 'integer', 'bigint', 'smallint', 'decimal', 'numeric', 'double', 'float'].includes(column.type.toLowerCase())) {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  }
  if (column.isDate || ['date', 'datetime', 'timestamp', 'time'].includes(column.type.toLowerCase())) {
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  }
  return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
}

// Auto-expand first table
watch(() => props.tables, (tables) => {
  if (tables.length > 0 && !expandedTable.value) {
    expandedTable.value = tables[0].tableId
  }
}, {immediate: true})
</script>
