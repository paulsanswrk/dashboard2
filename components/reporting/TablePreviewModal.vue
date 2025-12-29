<template>
  <UModal v-model:open="isOpen" size="5xl" class="w-full max-w-6xl mx-4" :ui="{ header: 'p-0', body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between w-full px-4 py-3">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Table Preview - {{ tableName }}</h3>
        <button 
          @click="isOpen = false" 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <Icon name="i-heroicons-x-mark" class="w-5 h-5"/>
        </button>
      </div>
    </template>
    
    <template #body>
      <div class="p-0">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-primary-600"/>
          <span class="ml-2 text-gray-600 dark:text-gray-300">Loading table data...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6 text-center">
          <Icon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500 mx-auto mb-3"/>
          <p class="text-red-600 dark:text-red-400">{{ error }}</p>
          <UButton class="mt-4 cursor-pointer" @click="fetchPreview">Retry</UButton>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-auto max-h-[70vh]">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th 
                  v-for="col in columns" 
                  :key="col.key"
                  class="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                >
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(row, idx) in rows" 
                :key="idx"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td 
                  v-for="col in columns" 
                  :key="col.key"
                  class="px-3 py-2 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap"
                  :class="{ 'text-right': isNumeric(row[col.key]) }"
                >
                  {{ formatValue(row[col.key]) }}
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td :colspan="columns.length" class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  No data found in this table
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer with row count -->
        <div v-if="!loading && !error && rows.length > 0" class="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
          Showing {{ rows.length }} row(s)
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  tableName: string
  connectionId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const loading = ref(false)
const error = ref<string | null>(null)
const columns = ref<Array<{ key: string; label: string; type?: number }>>([])
const rows = ref<any[]>([])

async function fetchPreview() {
  if (!props.connectionId || !props.tableName) {
    error.value = 'Missing connection or table name'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{
      columns: Array<{ key: string; label: string; type?: number }>
      rows: any[]
      meta: { error?: string }
    }>('/api/reporting/table-preview', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        tableName: props.tableName,
        limit: 100
      }
    })

    if (response.meta?.error) {
      error.value = response.meta.error
    } else {
      columns.value = response.columns || []
      rows.value = response.rows || []
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load table preview'
  } finally {
    loading.value = false
  }
}

function isNumeric(value: any): boolean {
  return typeof value === 'number' && !isNaN(value)
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '(null)'
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// Fetch data when modal opens
watch(() => props.open, (newVal) => {
  if (newVal) {
    fetchPreview()
  } else {
    // Reset state when closing
    columns.value = []
    rows.value = []
    error.value = null
  }
})
</script>

<style scoped>
/* Ensure table header stays sticky during scroll */
thead th {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
