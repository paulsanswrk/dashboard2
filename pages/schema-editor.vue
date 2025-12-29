<template>
  <div class="p-4 lg:p-6">
    <div class="max-w-5xl mx-auto">
      <UCard>
        <template #header>
          <h2 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Select tables and fields for reporting</h2>
        </template>

        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <UButton variant="outline" @click="goBack" class="cursor-pointer">Back</UButton>
            <div class="flex-1" />
            <UButton variant="outline" :disabled="!allSchemasLoaded" :loading="saving" @click="saveAndContinue" class="cursor-pointer">Continue to References</UButton>
          </div>

          <!-- Progress indicators -->
          <div v-if="loadingDatasets || loadingSchemas" class="text-sm text-gray-600 dark:text-gray-300">
            <div v-if="loadingDatasets" class="flex items-center gap-2">
              <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
              <span>Loading complete database schema...</span>
            </div>
          </div>

          <SchemaSelector
            v-if="datasetsLoaded"
            ref="schemaSelectorRef"
            :tables="datasets"
            :columns-by-table="columnsByTable"
            :initial-selected="initialSelected"
            :connection-id="connectionId"
            :custom-views="customViews"
            :custom-fields="customFields"
            @save="onSchemaSave"
            @custom-views-changed="onCustomViewsChanged"
            @custom-fields-changed="onCustomFieldsChanged"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import SchemaSelector from '../components/reporting/SchemaSelector.vue'

const route = useRoute()
const connectionId = computed(() => Number(route.query.id || route.query.connection_id || route.query.data_connection_id))

const datasets = ref([])
const columnsByTable = ref({})
const datasetsLoaded = ref(false)
const saving = ref(false)
const schemaSelection = ref(null)
const initialSelected = ref({})
const allSchemasLoaded = ref(false)
const customViews = ref([])
const customFields = ref([])

// Ref to access the SchemaSelector component
const schemaSelectorRef = ref()

// Progress tracking
const loadingDatasets = ref(false)
const loadingSchemas = ref(false)

const schemaSelectionCount = computed(() => {
  const sel = schemaSelection.value
  if (!sel || !sel.tables) return 0
  return sel.tables.reduce((acc, t) => acc + ((t.columns && t.columns.length) || 0), 0)
})

function goBack() {
  navigateTo('/data-sources')
}

async function loadExisting() {
  const conn = await $fetch('/api/reporting/connection', { params: { id: connectionId.value } })
  const selected = {}
  const tables = conn?.schema_json?.tables || []
  for (const t of tables) {
    selected[t.tableId] = (t.columns || []).map((c) => c.fieldId || c.name)
  }
  initialSelected.value = selected

  // Load custom views
  customViews.value = conn?.custom_views || []

  // Load custom fields
  customFields.value = conn?.custom_fields || []
}

async function loadAll() {
  loadingDatasets.value = true
  try {
    // Get all tables, columns, PKs, and FKs in a single request
    const fullSchema = await $fetch('/api/reporting/full-schema', { params: { connectionId: connectionId.value } })

    datasets.value = (fullSchema.tables || []).map((t: any) => ({
      id: t.tableId,
      name: t.tableName,
      label: t.tableName
    }))

    if (datasets.value.length === 0) {
      datasetsLoaded.value = true
      allSchemasLoaded.value = true
      return
    }

    datasetsLoaded.value = true
    loadingDatasets.value = false

    // All data is already loaded, no need for sequential loading
    const map = {}
    for (const t of fullSchema.tables || []) {
      map[t.tableId] = t.columns || []
    }

    columnsByTable.value = map
    allSchemasLoaded.value = true
  } catch (error) {
    console.error('Failed to load full schema:', error)
    datasetsLoaded.value = true
    allSchemasLoaded.value = true
  } finally {
    loadingDatasets.value = false
    loadingSchemas.value = false
  }
}

function onSchemaSave(payload) {
  schemaSelection.value = payload
}

function onCustomViewsChanged(views: any[]) {
  customViews.value = views
}

function onCustomFieldsChanged(fields: any[]) {
  customFields.value = fields
}

async function saveAndContinue() {
  saving.value = true
  try {
    // Get the current selection state from the SchemaSelector component
    const schemaSelector = schemaSelectorRef.value
    const currentSelection = schemaSelector?.selected || {}

    console.log('[SCHEMA_EDITOR_AUTO_JOIN] Saving schema from schema editor:', {
      connectionId: connectionId.value,
      selectedTables: Object.keys(currentSelection),
      totalColumns: Object.values(currentSelection).reduce((acc: number, tableData: any) => {
        return acc + Object.keys(tableData.columns || {}).length
      }, 0)
    })

    // Always save the current schema selection state
    const currentSchema = {
      tables: Object.entries(currentSelection).map(([tableId, tableData]: [string, any]) => ({
        tableId,
        columns: Object.values(tableData.columns || {})
      }))
    }

    console.log('[SCHEMA_EDITOR_AUTO_JOIN] Schema to save:', {
      tableCount: currentSchema.tables.length,
      tables: currentSchema.tables.map(t => ({ tableId: t.tableId, columnCount: t.columns.length }))
    })

    const response = await $fetch('/api/reporting/connections', {
      method: 'PUT',
      params: { id: connectionId.value },
      body: { schema: currentSchema }
    })

    console.log('[SCHEMA_EDITOR_AUTO_JOIN] Schema save response:', response)
    console.log('[SCHEMA_EDITOR_AUTO_JOIN] Schema saved successfully - auto_join_info should now be computed on backend')

    navigateTo(`/references-editor?id=${connectionId.value}`)
  } catch (error) {
    console.error('[SCHEMA_EDITOR_AUTO_JOIN] Failed to save schema:', error)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!connectionId.value) {
    navigateTo('/data-sources')
    return
  }
  await Promise.all([loadExisting(), loadAll()])
})
</script>



