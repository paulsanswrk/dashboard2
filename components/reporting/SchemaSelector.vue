<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Tables List -->
      <div class="border rounded-md dark:border-gray-700">
        <div class="px-3 py-2 font-medium dark:bg-dark-light text-gray-900 dark:text-white flex items-center justify-between">
          <span>List of tables ({{ filteredTables.length }})</span>
          <div class="flex items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
              <UCheckbox v-model="hideEmptyTables" @update:model-value="onHideEmptyChanged" />
              <span class="text-gray-700 dark:text-gray-200">Hide empty</span>
            </div>
            <div class="flex items-center gap-2">
              <UCheckbox :model-value="allSelected" @update:model-value="toggleAll" />
              <span class="text-gray-700 dark:text-gray-200">{{ allSelected ? 'Deselect all' : 'Select all' }}</span>
            </div>
          </div>
        </div>
        <div class="p-2 max-h-64 overflow-auto">
          <div class="mb-2 relative">
            <UInput v-model="tablesQuery" placeholder="Search" class="w-full pr-8" />
            <button v-if="tablesQuery" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hover:text-gray-700" @click="tablesQuery = ''">
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </div>
          <ul class="space-y-1">
            <!-- Regular Tables -->
            <li v-for="t in filteredTables" :key="t.id" class="flex items-center gap-2">
              <UCheckbox :model-value="!!selected[t.id]" @update:model-value="(v) => toggleTable(t.id, v)" />
              <button class="text-left flex-1 truncate cursor-pointer hover:text-primary-600 transition-colors" @click="toggleExpand(t.id)">
                {{ t.label || t.name }}
              </button>
            </li>

            <!-- Custom Views Section -->
            <li v-if="internalCustomViews.length > 0" class="pt-2 mt-2 border-t dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Custom Views</div>
            </li>
            <li v-for="cv in internalCustomViews" :key="cv.id" class="flex items-center gap-2 group">
              <UCheckbox :model-value="!!selected[cv.id]" @update:model-value="(v) => toggleCustomView(cv.id, v, cv)"/>
              <Icon name="i-heroicons-table-cells" class="w-4 h-4 text-primary-500"/>
              <button class="text-left flex-1 truncate cursor-pointer hover:text-primary-600 transition-colors text-primary-700 dark:text-primary-400" @click="toggleExpandCustomView(cv)">
                {{ cv.name }}
              </button>
              <div class="opacity-0 group-hover:opacity-100 flex gap-1">
                <button @click="editCustomView(cv)" class="p-1 text-gray-400 hover:text-primary-500 cursor-pointer" title="Edit">
                  <Icon name="i-heroicons-pencil" class="w-3.5 h-3.5"/>
                </button>
                <button @click="confirmDeleteView(cv)" class="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Delete">
                  <Icon name="i-heroicons-trash" class="w-3.5 h-3.5"/>
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Add Custom View Button -->
        <div class="p-2 border-t dark:border-gray-700">
          <button
              class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md cursor-pointer transition-colors"
              @click="openAddViewModal"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4"/>
            <span>Add custom view</span>
          </button>
        </div>
      </div>

      <!-- Fields List -->
      <div class="border rounded-md dark:border-gray-700">
        <div class="px-3 py-2 font-medium text-gray-900 dark:text-white flex items-center justify-between">
          <span>List of fields</span>
          <UBadge v-if="expandedIsCustomView" size="xs" color="primary" variant="soft">Custom View</UBadge>
        </div>
        <div class="p-2 max-h-64 overflow-auto" v-if="expanded">
          <div class="text-sm mb-2 text-gray-600 dark:text-gray-300">{{ expandedLabel }}</div>
          <ul class="space-y-1">
            <li v-for="c in columnsForExpanded" :key="c.fieldId" class="flex items-center gap-2">
              <UCheckbox :model-value="!!selected[expanded]?.columns?.[c.fieldId]" @update:model-value="(v) => toggleColumn(expanded, c, v)" />
              <span class="flex-1 truncate">{{ c.label || c.name }}</span>
              <UBadge size="xs" variant="soft" color="neutral">{{ c.type }}</UBadge>
            </li>
          </ul>

          <!-- Custom Fields in this table -->
          <template v-if="customFieldsForExpanded.length > 0">
            <div class="pt-2 mt-2 border-t dark:border-gray-700">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Custom Fields</div>
            </div>
            <ul class="space-y-1">
              <li v-for="cf in customFieldsForExpanded" :key="cf.id" class="flex items-center gap-2 group">
                <Icon :name="cf.type === 'calculated' ? 'i-heroicons-calculator' : 'i-heroicons-link'" class="w-4 h-4 text-orange-500"/>
                <span class="flex-1 truncate text-orange-700 dark:text-orange-400">{{ cf.name }}</span>
                <UBadge size="xs" variant="soft" color="orange">{{ cf.type }}</UBadge>
                <div class="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button @click="editCustomField(cf)" class="p-1 text-gray-400 hover:text-primary-500 cursor-pointer" title="Edit">
                    <Icon name="i-heroicons-pencil" class="w-3.5 h-3.5"/>
                  </button>
                  <button @click="confirmDeleteField(cf)" class="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Delete">
                    <Icon name="i-heroicons-trash" class="w-3.5 h-3.5"/>
                  </button>
                </div>
              </li>
            </ul>
          </template>
        </div>
        <div v-else class="p-4 text-center text-gray-400 text-sm">
          Select a table to view its fields
        </div>

        <!-- Add Custom Field Button -->
        <div class="p-2 border-t dark:border-gray-700">
          <button
              class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md cursor-pointer transition-colors"
              @click="openAddFieldModal"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4"/>
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <div class="text-xs text-gray-600 dark:text-gray-300">{{ selectedCount }} fields selected across {{ Object.keys(selected).length }} table(s)</div>
    </div>

    <!-- Add Custom View Modal -->
    <AddCustomViewModal
        v-model:open="showAddViewModal"
        :connection-id="connectionId"
        :tables="tables"
        :edit-view="editingView"
        @saved="onViewSaved"
        @close="closeAddViewModal"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm" title="Delete Custom View">
      <template #body>
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete the custom view "<strong>{{ viewToDelete?.name }}</strong>"?
        </p>
        <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteConfirm = false" class="cursor-pointer">Cancel</UButton>
          <UButton color="red" :loading="deleting" @click="deleteView" class="cursor-pointer">Delete</UButton>
        </div>
      </template>
    </UModal>

    <!-- Add Custom Field Modal -->
    <AddCustomFieldModal
        v-model:open="showAddFieldModal"
        :connection-id="connectionId"
        :fields-by-table="fieldsByTableForModal"
        :edit-field="editingField"
        @saved="onFieldSaved"
        @close="closeAddFieldModal"
    />

    <!-- Delete Custom Field Confirmation Modal -->
    <UModal v-model:open="showDeleteFieldConfirm" title="Delete Custom Field">
      <template #body>
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete the custom field "<strong>{{ fieldToDelete?.name }}</strong>"?
        </p>
        <p class="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteFieldConfirm = false" class="cursor-pointer">Cancel</UButton>
          <UButton color="red" :loading="deletingField" @click="deleteField" class="cursor-pointer">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import AddCustomViewModal from '~/components/schema/AddCustomViewModal.vue'
import AddCustomFieldModal from '~/components/schema/AddCustomFieldModal.vue'

type TableRow = { id: string; name: string; label?: string }
type ColumnRow = { fieldId: string; name: string; label?: string; type: string; isNumeric?: boolean }
type CustomView = { id: string; name: string; sql: string; columns: { name: string; type: string }[] }
type CustomField = { id: string; name: string; type: 'calculated' | 'merged'; formula?: string; sourceFields?: { tableName: string; fieldName: string }[]; joinType?: string; resultType?: string }

const props = defineProps<{
  tables: TableRow[]
  columnsByTable: Record<string, ColumnRow[]>
  rowCountsByTable?: Record<string, number>
  initialSelected?: Record<string, string[]>
  connectionId?: number
  customViews?: CustomView[]
  customFields?: CustomField[]
}>()

const emit = defineEmits<{
  (e: 'save', payload: any): void
  (e: 'customViewsChanged', views: CustomView[]): void
  (e: 'customFieldsChanged', fields: CustomField[]): void
}>()

const selected = ref<Record<string, { columns: Record<string, ColumnRow> }>>({})
const expanded = ref<string | null>(null)
const tablesQuery = ref('')
const hideEmptyTables = ref(false)

// Custom views state
const internalCustomViews = ref<CustomView[]>([])
const showAddViewModal = ref(false)
const editingView = ref<CustomView | null>(null)
const showDeleteConfirm = ref(false)
const viewToDelete = ref<CustomView | null>(null)
const deleting = ref(false)

// Custom fields state
const internalCustomFields = ref<CustomField[]>([])
const showAddFieldModal = ref(false)
const editingField = ref<CustomField | null>(null)
const showDeleteFieldConfirm = ref(false)
const fieldToDelete = ref<CustomField | null>(null)
const deletingField = ref(false)

// Sync custom views from props
watch(() => props.customViews, (views) => {
  internalCustomViews.value = views || []
}, {immediate: true})

// Sync custom fields from props
watch(() => props.customFields, (fields) => {
  internalCustomFields.value = fields || []
}, {immediate: true})

// Track if expanded item is a custom view
const expandedIsCustomView = computed(() => {
  if (!expanded.value) return false
  return internalCustomViews.value.some(cv => cv.id === expanded.value)
})

const expandedLabel = computed(() => {
  if (!expanded.value) return ''
  const customView = internalCustomViews.value.find(cv => cv.id === expanded.value)
  if (customView) return customView.name
  const table = props.tables.find(t => t.id === expanded.value)
  return table?.label || table?.name || expanded.value
})

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
  let result = props.tables || []
  
  // Filter by search query
  const q = tablesQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter(t => (t.label || t.name).toLowerCase().includes(q))
  }
  
  // Filter out empty tables if enabled
  if (hideEmptyTables.value && props.rowCountsByTable) {
    result = result.filter(t => (props.rowCountsByTable?.[t.id] ?? 0) > 0)
  }
  
  return result
})

// Handler for hide empty tables checkbox - deselect empty tables
function onHideEmptyChanged(checked: boolean) {
  if (checked && props.rowCountsByTable) {
    // Deselect all tables with 0 rows
    const newSelected = { ...selected.value }
    for (const tableId of Object.keys(newSelected)) {
      const rowCount = props.rowCountsByTable[tableId] ?? 0
      if (rowCount === 0) {
        delete newSelected[tableId]
      }
    }
    selected.value = newSelected
  }
}

const columnsForExpanded = computed((): ColumnRow[] => {
  if (!expanded.value) return []

  // Check if it's a custom view
  const customView = internalCustomViews.value.find(cv => cv.id === expanded.value)
  if (customView) {
    return customView.columns.map((col, idx) => ({
      fieldId: `${customView.id}_${col.name}`,
      name: col.name,
      type: col.type,
      isNumeric: col.type === 'number'
    }))
  }
  
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

function toggleExpandCustomView(cv: CustomView) {
  expanded.value = cv.id
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

function toggleCustomView(id: string, checked: boolean, cv: CustomView) {
  if (checked) {
    const cols = cv.columns.map((col, idx) => ({
      fieldId: `${cv.id}_${col.name}`,
      name: col.name,
      type: col.type,
      isNumeric: col.type === 'number'
    }))
    const map: Record<string, ColumnRow> = {}
    for (const c of cols) map[c.fieldId] = c
    selected.value[id] = {columns: map}
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

// Custom view modal functions
function openAddViewModal() {
  editingView.value = null
  showAddViewModal.value = true
}

function editCustomView(cv: CustomView) {
  editingView.value = cv
  showAddViewModal.value = true
}

function closeAddViewModal() {
  showAddViewModal.value = false
  editingView.value = null
}

function onViewSaved(view: CustomView) {
  const idx = internalCustomViews.value.findIndex(v => v.id === view.id)
  if (idx >= 0) {
    internalCustomViews.value[idx] = view
  } else {
    internalCustomViews.value.push(view)
  }
  emit('customViewsChanged', internalCustomViews.value)
}

function confirmDeleteView(cv: CustomView) {
  viewToDelete.value = cv
  showDeleteConfirm.value = true
}

async function deleteView() {
  if (!viewToDelete.value || !props.connectionId) return

  deleting.value = true
  try {
    await $fetch('/api/schema/custom-view', {
      method: 'DELETE',
      body: {
        connectionId: props.connectionId,
        viewId: viewToDelete.value.id
      }
    })

    internalCustomViews.value = internalCustomViews.value.filter(v => v.id !== viewToDelete.value!.id)
    delete selected.value[viewToDelete.value.id]

    if (expanded.value === viewToDelete.value.id) {
      expanded.value = props.tables?.[0]?.id || null
    }

    emit('customViewsChanged', internalCustomViews.value)
    showDeleteConfirm.value = false
    viewToDelete.value = null
  } catch (err) {
    console.error('Failed to delete custom view:', err)
  } finally {
    deleting.value = false
  }
}

// Custom fields computed properties
const customFieldsForExpanded = computed(() => {
  // Show all custom fields for now (they're not tied to specific tables)
  return internalCustomFields.value
})

const fieldsByTableForModal = computed(() => {
  return props.tables.map(t => ({
    tableId: t.id,
    tableName: t.name,
    fields: (props.columnsByTable?.[t.id] || []).map(c => ({
      fieldId: c.fieldId,
      name: c.name,
      type: c.type,
      isNumeric: c.isNumeric
    }))
  }))
})

// Custom field modal functions
function openAddFieldModal() {
  editingField.value = null
  showAddFieldModal.value = true
}

function editCustomField(cf: CustomField) {
  editingField.value = cf
  showAddFieldModal.value = true
}

function closeAddFieldModal() {
  showAddFieldModal.value = false
  editingField.value = null
}

function onFieldSaved(field: CustomField) {
  const idx = internalCustomFields.value.findIndex(f => f.id === field.id)
  if (idx >= 0) {
    internalCustomFields.value[idx] = field
  } else {
    internalCustomFields.value.push(field)
  }
  emit('customFieldsChanged', internalCustomFields.value)
}

function confirmDeleteField(cf: CustomField) {
  fieldToDelete.value = cf
  showDeleteFieldConfirm.value = true
}

async function deleteField() {
  if (!fieldToDelete.value || !props.connectionId) return

  deletingField.value = true
  try {
    await $fetch('/api/schema/custom-field', {
      method: 'DELETE',
      body: {
        connectionId: props.connectionId,
        fieldId: fieldToDelete.value.id
      }
    })

    internalCustomFields.value = internalCustomFields.value.filter(f => f.id !== fieldToDelete.value!.id)

    emit('customFieldsChanged', internalCustomFields.value)
    showDeleteFieldConfirm.value = false
    fieldToDelete.value = null
  } catch (err) {
    console.error('Failed to delete custom field:', err)
  } finally {
    deletingField.value = false
  }
}

// Expose the selected state for external access
defineExpose({
  selected
})
</script>

