<template>
  <UModal v-model:open="isOpen" :title="isEditing ? 'Edit Custom View' : 'Add Custom View'" class="max-w-5xl">
    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[70vh]">
        <!-- Left: SQL Editor -->
        <div class="lg:col-span-2 flex flex-col gap-4">
          <UFormField label="View Name" required>
            <UInput
                v-model="viewName"
                placeholder="e.g. Monthly Sales Summary"
                class="w-full"
            />
          </UFormField>

          <div class="flex-1 flex flex-col">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">SQL Query</label>
              <UButton
                  variant="ghost"
                  size="xs"
                  @click="formatSql"
                  class="cursor-pointer"
              >
                <Icon name="i-heroicons-code-bracket" class="w-4 h-4 mr-1"/>
                Format SQL
              </UButton>
            </div>
            <div class="flex-1 relative border rounded-md overflow-hidden dark:border-gray-700">
              <div class="absolute left-0 top-0 bottom-0 w-10 bg-gray-100 dark:bg-gray-800 flex flex-col items-end pr-2 pt-3 text-xs text-gray-400 font-mono overflow-hidden select-none">
                <span v-for="n in lineNumbers" :key="n" class="leading-6">{{ n }}</span>
              </div>
              <textarea
                  v-model="sqlQuery"
                  class="w-full h-full pl-12 pr-3 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none leading-6"
                  placeholder="SELECT column1, column2 FROM table_name WHERE ..."
                  spellcheck="false"
              />
            </div>
          </div>

          <!-- Preview Section -->
          <div v-if="previewData.length > 0 || previewLoading" class="border rounded-md dark:border-gray-700">
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Data Preview</span>
              <span v-if="previewData.length > 0" class="text-xs text-gray-500">{{ previewData.length }} rows</span>
            </div>
            <div class="max-h-48 overflow-auto">
              <div v-if="previewLoading" class="p-4 flex items-center justify-center gap-2 text-gray-500">
                <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
                <span>Loading preview...</span>
              </div>
              <table v-else class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th v-for="col in previewColumns" :key="col" class="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                    {{ col }}
                  </th>
                </tr>
                </thead>
                <tbody class="divide-y dark:divide-gray-700">
                <tr v-for="(row, idx) in previewData" :key="idx" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td v-for="col in previewColumns" :key="col" class="px-3 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                    {{ row[col] ?? '—' }}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="previewError" class="text-sm text-red-500">
            {{ previewError }}
          </div>
        </div>

        <!-- Right: Tables Sidebar -->
        <div class="border rounded-md dark:border-gray-700 flex flex-col">
          <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Available Tables</span>
          </div>
          <div class="p-2">
            <UInput v-model="tableSearch" placeholder="Search tables..." size="sm" class="w-full mb-2"/>
          </div>
          <div class="flex-1 overflow-auto px-2 pb-2">
            <ul class="space-y-1">
              <li
                  v-for="table in filteredTables"
                  :key="table.id"
                  class="px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                  @click="insertTableName(table.name)"
              >
                <Icon name="i-heroicons-table-cells" class="w-4 h-4 text-gray-400"/>
                <span class="truncate text-gray-700 dark:text-gray-300">{{ table.name }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
            variant="outline"
            :loading="previewLoading"
            @click="showPreview"
            class="cursor-pointer"
        >
          <Icon name="i-heroicons-play" class="w-4 h-4 mr-1"/>
          Show Preview
        </UButton>
        <div class="flex gap-2">
          <UButton variant="ghost" @click="close" class="cursor-pointer">Discard</UButton>
          <UButton
              color="primary"
              :disabled="!canApply"
              :loading="saving"
              @click="apply"
              class="cursor-pointer"
          >
            Apply
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

interface TableInfo {
  id: string
  name: string
}

interface CustomView {
  id: string
  name: string
  sql: string
  columns: { name: string; type: string }[]
}

const props = defineProps<{
  connectionId: number
  tables: TableInfo[]
  editView?: CustomView | null
}>()

const emit = defineEmits<{
  (e: 'saved', view: CustomView): void
  (e: 'close'): void
}>()

const isOpen = defineModel<boolean>('open', {default: false})

const viewName = ref('')
const sqlQuery = ref('')
const tableSearch = ref('')
const previewData = ref<Record<string, any>[]>([])
const previewColumns = ref<string[]>([])
const previewLoading = ref(false)
const previewError = ref('')
const saving = ref(false)

const isEditing = computed(() => !!props.editView)

// Initialize from edit view if provided
watch(() => props.editView, (view) => {
  if (view) {
    viewName.value = view.name
    sqlQuery.value = view.sql
  } else {
    viewName.value = ''
    sqlQuery.value = ''
  }
  previewData.value = []
  previewColumns.value = []
  previewError.value = ''
}, {immediate: true})

const lineNumbers = computed(() => {
  const lines = (sqlQuery.value || '').split('\n').length
  return Array.from({length: Math.max(lines, 10)}, (_, i) => i + 1)
})

const filteredTables = computed(() => {
  const search = tableSearch.value.toLowerCase().trim()
  if (!search) return props.tables
  return props.tables.filter(t => t.name.toLowerCase().includes(search))
})

const canApply = computed(() => {
  return viewName.value.trim() && sqlQuery.value.trim() && previewColumns.value.length > 0
})

function insertTableName(name: string) {
  sqlQuery.value += (sqlQuery.value ? ' ' : '') + name
}

function formatSql() {
  // Basic SQL formatting - add proper indentation
  let sql = sqlQuery.value

  // Uppercase keywords
  const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ON', 'AS', 'LIMIT', 'OFFSET', 'UNION', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'IN', 'NOT', 'NULL', 'IS', 'BETWEEN', 'LIKE', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    sql = sql.replace(regex, keyword)
  }

  // Add newlines before major clauses
  sql = sql.replace(/\s+(FROM|WHERE|AND|OR|ORDER BY|GROUP BY|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN|LIMIT)/gi, '\n$1')

  sqlQuery.value = sql.trim()
}

async function showPreview() {
  if (!sqlQuery.value.trim()) {
    previewError.value = 'Please enter a SQL query'
    return
  }

  previewLoading.value = true
  previewError.value = ''
  previewData.value = []
  previewColumns.value = []

  try {
    const result = await $fetch('/api/schema/custom-view-preview', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        sql: sqlQuery.value
      }
    })

    previewColumns.value = result.columns || []
    previewData.value = result.data || []
  } catch (err: any) {
    previewError.value = err.data?.message || err.message || 'Failed to execute query'
  } finally {
    previewLoading.value = false
  }
}

async function apply() {
  if (!canApply.value) return

  saving.value = true
  try {
    const view: CustomView = {
      id: props.editView?.id || `cv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: viewName.value.trim(),
      sql: sqlQuery.value.trim(),
      columns: previewColumns.value.map(name => ({name, type: 'text'})) // Type detection can be enhanced
    }

    await $fetch('/api/schema/custom-view', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        view,
        isUpdate: isEditing.value
      }
    })

    emit('saved', view)
    close()
  } catch (err: any) {
    previewError.value = err.data?.message || err.message || 'Failed to save custom view'
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
  emit('close')
}
</script>
