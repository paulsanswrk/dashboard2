<template>
  <div class="p-4 lg:p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Progress Steps -->
      <div class="flex items-center justify-center mb-6 lg:mb-8">
        <div class="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div
              v-for="(step, index) in steps"
              :key="step.step"
              class="flex items-center"
          >
            <div
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="getStepClasses(step)"
            >
              <Icon
                  v-if="step.completed"
                  name="i-heroicons-check"
                  class="w-4 h-4"
              />
              <span v-else>{{ step.step }}</span>
            </div>
            <span class="ml-2 text-xs sm:text-sm font-medium hidden sm:block">{{ step.label }}</span>
            <div
                v-if="index < steps.length - 1"
                class="w-8 h-px bg-gray-300 mx-2 sm:mx-4 hidden sm:block"
            />
          </div>
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">References</h2>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Top Navigation Buttons -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b dark:border-gray-700">
            <UButton
                variant="outline"
                @click="goBack"
                class="w-full sm:w-auto cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </UButton>
            <UButton
                @click="saveAndProceed"
                :loading="saving"
                :disabled="saving"
                class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                color="green"
            >
              {{ saving ? 'Saving...' : 'Save And Proceed' }}
            </UButton>
          </div>

          <!-- Instructions -->
          <UAlert
              color="blue"
              variant="soft"
              title="Configure Table References"
              description="Here you see the existing foreign keys in your database. If you need to add additional references, use our interface below."
          />

          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400"/>
          </div>

          <!-- Main 3-Column Layout -->
          <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4" style="min-height: 400px;">
            <!-- Source Column Selector -->
            <div class="lg:col-span-4">
              <ReferenceSelector
                  title="Source Column"
                  :tables="tables"
                  :selected-table="sourceSelection?.table?.tableId"
                  :selected-column="sourceSelection?.column?.fieldId"
                  @select="onSourceSelect"
              />
            </div>

            <!-- Middle: Target + Add Button -->
            <div class="lg:col-span-4 flex flex-col gap-4">
              <ReferenceSelector
                  title="Target Column"
                  :tables="tables"
                  :selected-table="targetSelection?.table?.tableId"
                  :selected-column="targetSelection?.column?.fieldId"
                  @select="onTargetSelect"
                  class="flex-1"
              />

              <!-- Add Reference Button -->
              <UButton
                  color="primary"
                  class="w-full cursor-pointer"
                  :disabled="!canAddReference"
                  @click="addReference"
              >
                <Icon name="i-heroicons-plus" class="w-4 h-4 mr-2"/>
                Add Reference
              </UButton>
            </div>

            <!-- Reference List -->
            <div class="lg:col-span-4">
              <ReferenceList
                  :foreign-keys="foreignKeys"
                  :custom-references="customReferences"
                  @refresh="loadSchema"
                  @delete="deleteReference"
              />
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
            <UButton
                variant="outline"
                @click="goBack"
                class="w-full sm:w-auto cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </UButton>
            <UButton
                @click="saveAndProceed"
                :loading="saving"
                :disabled="saving"
                class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                color="green"
            >
              {{ saving ? 'Saving...' : 'Save And Proceed' }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import ReferenceSelector from '~/components/references/ReferenceSelector.vue'
import ReferenceList from '~/components/references/ReferenceList.vue'

interface Column {
  fieldId: string
  name: string
  type: string
  isNumeric?: boolean
  isDate?: boolean
}

interface Table {
  tableId: string
  tableName: string
  columns: Column[]
  foreignKeys?: any[]
}

interface Selection {
  table: Table
  column: Column
}

interface CustomReference {
  id: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  isCustom: true
}

const route = useRoute()
const connectionId = computed(() => Number(route.query.id || route.query.connection_id))

const steps = ref([
  {step: 1, label: 'Integration', active: false, completed: true},
  {step: 2, label: 'Data Schema', active: false, completed: true},
  {step: 3, label: 'References', active: true, completed: false}
])

const loading = ref(true)
const saving = ref(false)
const tables = ref<Table[]>([])
const foreignKeys = ref<any[]>([])
const customReferences = ref<CustomReference[]>([])

const sourceSelection = ref<Selection | null>(null)
const targetSelection = ref<Selection | null>(null)

const canAddReference = computed(() => {
  if (!sourceSelection.value || !targetSelection.value) return false
  // Don't allow self-reference of the same column
  if (
      sourceSelection.value.table.tableId === targetSelection.value.table.tableId &&
      sourceSelection.value.column.fieldId === targetSelection.value.column.fieldId
  ) {
    return false
  }
  // Check if reference already exists
  const exists = customReferences.value.some(ref =>
      ref.sourceTable === sourceSelection.value!.table.tableName &&
      ref.sourceColumn === sourceSelection.value!.column.name &&
      ref.targetTable === targetSelection.value!.table.tableName &&
      ref.targetColumn === targetSelection.value!.column.name
  )
  return !exists
})

function getStepClasses(step: { active: boolean; completed: boolean }) {
  if (step.active) {
    return 'bg-blue-600 text-white'
  } else if (step.completed) {
    return 'bg-orange-500 text-white'
  } else {
    return 'bg-gray-300 text-gray-600'
  }
}

function onSourceSelect(selection: Selection) {
  sourceSelection.value = selection
}

function onTargetSelect(selection: Selection) {
  targetSelection.value = selection
}

function addReference() {
  if (!sourceSelection.value || !targetSelection.value) return

  const newRef: CustomReference = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sourceTable: sourceSelection.value.table.tableName,
    sourceColumn: sourceSelection.value.column.name,
    targetTable: targetSelection.value.table.tableName,
    targetColumn: targetSelection.value.column.name,
    isCustom: true
  }

  customReferences.value.push(newRef)

  // Clear selections after adding
  sourceSelection.value = null
  targetSelection.value = null
}

function deleteReference(ref: CustomReference) {
  customReferences.value = customReferences.value.filter(r => r.id !== ref.id)
}

async function loadSchema() {
  loading.value = true
  try {
    // Load full schema with foreign keys
    const fullSchema = await $fetch('/api/reporting/full-schema', {
      params: {connectionId: connectionId.value}
    })

    tables.value = (fullSchema.tables || []).map((t: any) => ({
      tableId: t.tableId,
      tableName: t.tableName,
      columns: t.columns || [],
      foreignKeys: t.foreignKeys || []
    }))

    // Extract all foreign keys
    foreignKeys.value = tables.value.flatMap(t => t.foreignKeys || [])

    // Load existing custom references from connection
    const connection = await $fetch('/api/reporting/connection', {
      params: {id: connectionId.value}
    })

    customReferences.value = connection?.schema_json?.customReferences || []
  } catch (error) {
    console.error('Failed to load schema:', error)
  } finally {
    loading.value = false
  }
}

function goBack() {
  navigateTo('/data-sources')
}

async function saveAndProceed() {
  saving.value = true
  try {
    // Save custom references to connection
    await $fetch('/api/schema/custom-references', {
      method: 'POST',
      body: {
        connectionId: connectionId.value,
        customReferences: customReferences.value
      }
    })

    // Navigate to reporting builder
    navigateTo(`/reporting/builder?data_connection_id=${connectionId.value}`)
  } catch (error) {
    console.error('Failed to save references:', error)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!connectionId.value) {
    navigateTo('/data-sources')
    return
  }
  await loadSchema()
})
</script>
