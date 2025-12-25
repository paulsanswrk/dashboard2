<template>
  <UModal v-model:open="isOpen" size="5xl" class="w-full max-w-5xl mx-4">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">Edit Join Path</h3>
        <button
            class="text-sm text-primary-500 hover:text-primary-600 hover:underline cursor-pointer"
            @click="resetToDefault"
        >
          Reset to default join path
        </button>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h4 class="font-medium">List of applied table joins</h4>
        </div>

        <!-- Joins List Table -->
        <div class="border rounded-lg overflow-hidden dark:border-gray-700">
          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 text-sm font-medium">
            <div class="col-span-3">Table</div>
            <div class="col-span-2 text-center">Join type</div>
            <div class="col-span-3">Table</div>
            <div class="col-span-2"></div>
            <div class="col-span-2 text-center text-xs">
              Prevent<br>duplication
              <Icon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 ml-1 cursor-help"
                  title="Check this to apply DISTINCT to prevent cartesian product issues"
              />
            </div>
          </div>

          <!-- Join Rows -->
          <div v-if="localJoins.length === 0" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No joins configured. Add fields from multiple tables to create joins automatically.
          </div>

          <div v-else class="divide-y dark:divide-gray-700">
            <div
                v-for="(join, index) in localJoins"
                :key="index"
                class="grid grid-cols-12 gap-2 px-4 py-3 items-center"
            >
              <!-- Source Table/Column -->
              <div class="col-span-3 flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <span
                      class="w-2 h-2 rounded-sm"
                      :class="join.sourceCardinality === 'many' ? 'bg-blue-500' : 'bg-gray-400'"
                      :title="join.sourceCardinality === 'many' ? 'Many' : 'One'"
                  ></span>
                </div>
                <div class="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-sm truncate">
                  <span class="font-medium text-primary-600 dark:text-primary-400">{{ join.sourceTable }}</span>:
                  <span class="text-gray-600 dark:text-gray-300">{{ getSourceColumn(join) }}</span>
                </div>
              </div>

              <!-- Join Type Dropdown -->
              <div class="col-span-2 flex justify-center">
                <USelect
                    v-model="join.joinType"
                    :items="joinTypeOptions"
                    class="w-full"
                    size="sm"
                />
              </div>

              <!-- Target Table/Column -->
              <div class="col-span-3 flex items-center gap-2">
                <div class="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-sm truncate">
                  <span class="font-medium text-primary-600 dark:text-primary-400">{{ join.targetTable }}</span>:
                  <span class="text-gray-600 dark:text-gray-300">{{ getTargetColumn(join) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span
                      class="w-2 h-2 rounded-sm"
                      :class="join.targetCardinality === 'many' ? 'bg-blue-500' : 'bg-gray-400'"
                      :title="join.targetCardinality === 'many' ? 'Many' : 'One'"
                  ></span>
                </div>
              </div>

              <!-- Reorder & Delete Buttons -->
              <div class="col-span-2 flex items-center justify-center gap-1">
                <button
                    class="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="index === 0"
                    @click="moveJoin(index, index - 1)"
                    title="Move up"
                >
                  <Icon name="i-heroicons-arrow-up" class="w-4 h-4"/>
                </button>
                <button
                    class="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="index === localJoins.length - 1"
                    @click="moveJoin(index, index + 1)"
                    title="Move down"
                >
                  <Icon name="i-heroicons-arrow-down" class="w-4 h-4"/>
                </button>
                <button
                    class="p-1 text-gray-500 hover:text-red-500 cursor-pointer"
                    @click="deleteJoin(index)"
                    title="Remove join"
                >
                  <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                </button>
              </div>

              <!-- Prevent Duplication Checkbox -->
              <div class="col-span-2 flex justify-center">
                <input
                    type="checkbox"
                    v-model="join.preventDuplication"
                    class="w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Cardinality Legend -->
        <div class="flex items-center justify-end gap-6 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-sm bg-gray-400"></span>
            <span>one</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-sm bg-blue-500"></span>
            <span>many</span>
          </div>
        </div>

        <!-- Add Join Button -->
        <div>
          <UButton
              variant="solid"
              color="primary"
              size="sm"
              class="cursor-pointer"
              @click="showAddJoinForm = !showAddJoinForm"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
            Add Join Paths
          </UButton>
        </div>

        <!-- Add Join Form (collapsible) -->
        <div v-if="showAddJoinForm" class="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Source Table">
              <USelect
                  v-model="newJoin.sourceTable"
                  :items="tableOptions"
                  placeholder="Select table..."
                  class="w-full"
              />
            </UFormField>
            <UFormField label="Join Type">
              <USelect
                  v-model="newJoin.joinType"
                  :items="joinTypeOptions"
                  class="w-full"
              />
            </UFormField>
            <UFormField label="Target Table">
              <USelect
                  v-model="newJoin.targetTable"
                  :items="tableOptions"
                  placeholder="Select table..."
                  class="w-full"
              />
            </UFormField>
          </div>
          <div class="flex gap-2">
            <UButton
                variant="outline"
                size="sm"
                class="cursor-pointer"
                @click="addNewJoin"
                :disabled="!newJoin.sourceTable || !newJoin.targetTable"
            >
              Add
            </UButton>
            <UButton
                variant="ghost"
                size="sm"
                class="cursor-pointer"
                @click="showAddJoinForm = false"
            >
              Cancel
            </UButton>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-medium">Preview</h4>
            <button
                class="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                @click="refreshPreview"
                :disabled="previewLoading"
                title="Refresh preview"
            >
              <Icon name="i-heroicons-arrow-path" class="w-4 h-4" :class="{ 'animate-spin': previewLoading }"/>
            </button>
          </div>

          <!-- Preview Table -->
          <div class="border rounded-lg overflow-hidden dark:border-gray-700">
            <div v-if="previewLoading" class="flex items-center justify-center py-12">
              <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400"/>
            </div>
            <div v-else-if="previewError" class="p-4 text-red-500 text-sm">
              {{ previewError }}
            </div>
            <div v-else-if="previewRows.length === 0" class="p-4 text-gray-500 dark:text-gray-400 text-sm text-center">
              No preview data available
            </div>
            <div v-else class="overflow-x-auto max-h-64">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                      v-for="col in previewColumns"
                      :key="col.key"
                      class="px-4 py-2 text-left font-medium border-b dark:border-gray-700"
                  >
                    {{ col.label }}
                  </th>
                </tr>
                </thead>
                <tbody>
                <tr
                    v-for="(row, rowIndex) in previewRows"
                    :key="rowIndex"
                    class="border-b dark:border-gray-700 last:border-b-0"
                >
                  <td
                      v-for="col in previewColumns"
                      :key="col.key"
                      class="px-4 py-2"
                  >
                    {{ row[col.key] ?? '' }}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Entry Count -->
          <div class="text-right text-sm text-gray-500 dark:text-gray-400">
            {{ previewTotalCount }} Entries
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton
            variant="solid"
            color="gray"
            class="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
            @click="handleCancel"
        >
          Cancel
        </UButton>
        <UButton
            variant="solid"
            color="primary"
            class="cursor-pointer"
            @click="handleSave"
        >
          Save
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {type JoinRef, useReportState} from '../../composables/useReportState'
import {useReportingService} from '../../composables/useReportingService'

const props = defineProps<{
  open: boolean
  connectionId?: number | null
  availableTables?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', joins: JoinRef[]): void
}>()

const {joins, xDimensions, yMetrics, breakdowns, setJoins} = useReportState()
const {runPreview, selectedConnectionId} = useReportingService()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Local copy of joins for editing
const localJoins = ref<JoinRef[]>([])

// Add join form state
const showAddJoinForm = ref(false)
const newJoin = ref({
  sourceTable: '',
  targetTable: '',
  joinType: 'inner' as 'inner' | 'left' | 'right'
})

// Preview state
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewColumns = ref<Array<{ key: string; label: string }>>([])
const previewRows = ref<Array<Record<string, unknown>>>([])
const previewTotalCount = ref(0)

const joinTypeOptions = [
  {label: 'INNER', value: 'inner'},
  {label: 'LEFT', value: 'left'},
  {label: 'RIGHT', value: 'right'}
]

// Convert availableTables string array to USelect item format
const tableOptions = computed(() => {
  return (props.availableTables || []).map(table => ({
    label: table,
    value: table
  }))
})

// Sync local joins when modal opens
watch(() => props.open, async (open) => {
  if (open) {
    // Copy current joins from state
    localJoins.value = JSON.parse(JSON.stringify(joins.value))

    // If joins are empty but we have fields from multiple tables, 
    // fetch the auto-joins that the server is using
    const tables = new Set<string>()
    ;[...xDimensions.value, ...yMetrics.value, ...breakdowns.value].forEach((f) => {
      if (f?.table) tables.add(f.table)
    })

    if (localJoins.value.length === 0 && tables.size >= 2) {
      // Auto-populate with server-computed joins
      await resetToDefault()
    } else {
      refreshPreview()
    }
  }
})

function getSourceColumn(join: JoinRef): string {
  return join.columnPairs.map(p => p.sourceColumn).join(', ')
}

function getTargetColumn(join: JoinRef): string {
  return join.columnPairs.map(p => p.targetColumn).join(', ')
}

function moveJoin(from: number, to: number) {
  const arr = localJoins.value
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return
  const [item] = arr.splice(from, 1)
  if (item) arr.splice(to, 0, item)
  refreshPreview()
}

function deleteJoin(index: number) {
  localJoins.value.splice(index, 1)
  refreshPreview()
}

function addNewJoin() {
  if (!newJoin.value.sourceTable || !newJoin.value.targetTable) return

  localJoins.value.push({
    constraintName: `manual_${Date.now()}`,
    sourceTable: newJoin.value.sourceTable,
    targetTable: newJoin.value.targetTable,
    joinType: newJoin.value.joinType,
    columnPairs: [], // Will need to be filled in by user or auto-detected
    preventDuplication: false
  })

  newJoin.value = {sourceTable: '', targetTable: '', joinType: 'inner'}
  showAddJoinForm.value = false
  refreshPreview()
}

async function resetToDefault() {
  // Call get-joins API to get joins from stored schema graph
  const connId = props.connectionId ?? selectedConnectionId.value
  if (!connId) return

  // Get all tables from current fields
  const tables = new Set<string>()
  ;[...xDimensions.value, ...yMetrics.value, ...breakdowns.value].forEach((f) => {
    if (f?.table) tables.add(f.table)
  })

  if (tables.size < 2) {
    localJoins.value = []
    refreshPreview()
    return
  }

  try {
    const result = await $fetch<{
      status: string
      joins: Array<{
        constraintName: string
        sourceTable: string
        targetTable: string
        joinType: 'inner' | 'left' | 'right'
        columnPairs: Array<{ position: number; sourceColumn: string; targetColumn: string }>
        sourceCardinality?: 'one' | 'many'
        targetCardinality?: 'one' | 'many'
      }>
      message?: string
    }>('/api/reporting/get-joins', {
      method: 'POST',
      body: {
        connectionId: connId,
        tableNames: Array.from(tables)
      }
    })

    if (result.status === 'ok' && result.joins) {
      localJoins.value = result.joins.map(join => ({
        constraintName: join.constraintName,
        sourceTable: join.sourceTable,
        targetTable: join.targetTable,
        joinType: join.joinType || 'inner',
        columnPairs: join.columnPairs,
        sourceCardinality: join.sourceCardinality,
        targetCardinality: join.targetCardinality
      }))
    } else {
      console.warn('Get joins returned:', result.message)
    }
  } catch (err) {
    console.error('Failed to reset joins:', err)
  }

  refreshPreview()
}

async function refreshPreview() {
  const connId = props.connectionId ?? selectedConnectionId.value
  if (!connId) return

  previewLoading.value = true
  previewError.value = null

  try {
    const result = await runPreview({
      datasetId: 'connection',
      xDimensions: xDimensions.value,
      yMetrics: yMetrics.value,
      breakdowns: breakdowns.value,
      filters: [],
      joins: localJoins.value,
      limit: 10,
      connectionId: connId
    })

    previewColumns.value = result.columns || []
    previewRows.value = result.rows || []
    previewTotalCount.value = result.meta?.totalCount as number || result.rows?.length || 0
  } catch (err: any) {
    previewError.value = err.message || 'Failed to load preview'
    previewColumns.value = []
    previewRows.value = []
    previewTotalCount.value = 0
  } finally {
    previewLoading.value = false
  }
}

function handleCancel() {
  isOpen.value = false
}

function handleSave() {
  setJoins(localJoins.value)
  emit('save', localJoins.value)
  isOpen.value = false
}
</script>

<style scoped>
</style>
