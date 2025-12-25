<template>
  <UModal v-model:open="isOpen" :title="isEditing ? 'Edit Custom Field' : 'Add Custom Field'" class="max-w-5xl">
    <template #body>
      <div class="h-[70vh] flex flex-col">
        <!-- Tabs -->
        <div class="flex border-b dark:border-gray-700 mb-4">
          <button
              v-for="tab in tabs"
              :key="tab.id"
              class="px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors"
              :class="activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Calculated Field Tab -->
        <div v-if="activeTab === 'calculated'" class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Left: Fields list -->
          <div class="border rounded-md dark:border-gray-700 flex flex-col">
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Available Fields</span>
            </div>
            <div class="p-2">
              <UInput v-model="fieldSearch" placeholder="Search fields..." size="sm" class="w-full"/>
            </div>
            <div class="flex-1 overflow-auto px-2 pb-2">
              <div v-for="table in filteredFieldsByTable" :key="table.tableId" class="mb-3">
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ table.tableName }}</div>
                <ul class="space-y-0.5">
                  <li
                      v-for="field in table.fields"
                      :key="field.fieldId"
                      class="px-2 py-1 text-sm rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex items-center gap-2"
                      @click="insertField(table.tableName, field.name)"
                      @dblclick="insertField(table.tableName, field.name)"
                  >
                    <Icon name="i-heroicons-variable" class="w-3.5 h-3.5 text-gray-400"/>
                    <span class="truncate text-gray-700 dark:text-gray-300">{{ field.name }}</span>
                    <UBadge size="xs" variant="soft" color="neutral" class="ml-auto">{{ field.type }}</UBadge>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Center: Formula editor -->
          <div class="flex flex-col gap-4">
            <UFormField label="Field Name" required>
              <UInput
                  v-model="fieldName"
                  placeholder="e.g. Profit Margin"
                  class="w-full"
              />
            </UFormField>

            <div class="flex-1 flex flex-col">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formula</label>
              <div class="flex-1 border rounded-md dark:border-gray-700 overflow-hidden">
                <textarea
                    ref="formulaTextarea"
                    v-model="formula"
                    class="w-full h-full p-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none"
                    placeholder="Drag fields and functions to create a custom field&#10;&#10;Example: ([Revenue] - [Cost]) / [Revenue] * 100"
                    spellcheck="false"
                />
              </div>
            </div>

            <div v-if="formulaError" class="text-sm text-red-500">{{ formulaError }}</div>
          </div>

          <!-- Right: Functions list -->
          <div class="border rounded-md dark:border-gray-700 flex flex-col">
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex items-center gap-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Functions</span>
              <USelect
                  v-model="selectedCategory"
                  :items="categoryOptions"
                  size="xs"
                  class="ml-auto w-28"
              />
            </div>
            <div class="p-2">
              <UInput v-model="functionSearch" placeholder="Search functions..." size="sm" class="w-full"/>
            </div>
            <div class="flex-1 overflow-auto">
              <ul class="px-2 pb-2 space-y-0.5">
                <li
                    v-for="fn in filteredFunctions"
                    :key="fn.name"
                    class="px-2 py-1.5 text-sm rounded cursor-pointer transition-colors"
                    :class="selectedFunction?.name === fn.name
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'"
                    @click="selectFunction(fn)"
                    @dblclick="insertFunction(fn)"
                >
                  {{ fn.name }}
                </li>
              </ul>
            </div>

            <!-- Function Documentation -->
            <div v-if="selectedFunction" class="border-t dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 max-h-40 overflow-auto">
              <div class="font-mono text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                {{ selectedFunction.signature }}
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ selectedFunction.description }}</p>
              <div v-if="selectedFunction.examples.length" class="text-xs text-gray-500">
                <span class="font-medium">Example:</span>
                <code class="ml-1 bg-gray-200 dark:bg-gray-700 px-1 rounded">{{ selectedFunction.examples[0] }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Merged Field Tab -->
        <div v-else-if="activeTab === 'merged'" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Left: Fields to merge -->
          <div class="flex flex-col gap-4">
            <UFormField label="Field Name" required>
              <UInput
                  v-model="fieldName"
                  placeholder="e.g. Full Location"
                  class="w-full"
              />
            </UFormField>

            <div class="flex-1 flex flex-col">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fields to Merge</label>
              <div
                  class="flex-1 border-2 border-dashed rounded-md dark:border-gray-600 p-4 min-h-[200px]"
                  :class="mergeFields.length === 0 ? 'flex items-center justify-center' : ''"
              >
                <div v-if="mergeFields.length === 0" class="text-center text-gray-400">
                  <Icon name="i-heroicons-arrow-down-on-square" class="w-8 h-8 mx-auto mb-2"/>
                  <p class="text-sm">Click fields from the list to add them here</p>
                </div>
                <div v-else class="space-y-2">
                  <div
                      v-for="(field, index) in mergeFields"
                      :key="index"
                      class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <Icon name="i-heroicons-bars-2" class="w-4 h-4 text-gray-400 cursor-move"/>
                    <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">{{ field.tableName }}.{{ field.fieldName }}</span>
                    <button @click="removeMergeField(index)" class="p-1 text-gray-400 hover:text-red-500 cursor-pointer">
                      <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Join Type -->
            <div>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Join Type</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                    v-for="jt in joinTypes"
                    :key="jt.id"
                    class="p-3 border rounded-md text-left cursor-pointer transition-colors"
                    :class="joinType === jt.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    @click="joinType = jt.id"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-6 h-6 flex items-center justify-center">
                      <div class="flex" v-html="jt.icon"></div>
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ jt.label }}</span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ jt.description }}</p>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Available fields -->
          <div class="border rounded-md dark:border-gray-700 flex flex-col">
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Available Dimension Fields</span>
            </div>
            <div class="p-2">
              <UInput v-model="mergeFieldSearch" placeholder="Search fields..." size="sm" class="w-full"/>
            </div>
            <div class="flex-1 overflow-auto px-2 pb-2">
              <div v-for="table in filteredDimensionFields" :key="table.tableId" class="mb-3">
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ table.tableName }}</div>
                <ul class="space-y-0.5">
                  <li
                      v-for="field in table.fields"
                      :key="field.fieldId"
                      class="px-2 py-1 text-sm rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex items-center gap-2"
                      @click="addMergeField(table.tableName, field.name)"
                  >
                    <Icon name="i-heroicons-tag" class="w-3.5 h-3.5 text-gray-400"/>
                    <span class="truncate text-gray-700 dark:text-gray-300">{{ field.name }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
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
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {type FormulaFunction, formulaFunctions, functionCategories, type FunctionCategory} from '~/lib/formulaFunctions'

interface FieldInfo {
  fieldId: string
  name: string
  type: string
  isNumeric?: boolean
}

interface TableFields {
  tableId: string
  tableName: string
  fields: FieldInfo[]
}

interface CustomField {
  id: string
  name: string
  type: 'calculated' | 'merged'
  formula?: string
  sourceFields?: { tableName: string; fieldName: string }[]
  joinType?: string
  resultType?: string
}

const props = defineProps<{
  connectionId: number
  fieldsByTable: TableFields[]
  editField?: CustomField | null
}>()

const emit = defineEmits<{
  (e: 'saved', field: CustomField): void
  (e: 'close'): void
}>()

const isOpen = defineModel<boolean>('open', {default: false})

const tabs = [
  {id: 'calculated', label: 'Calculated Field'},
  {id: 'merged', label: 'Merged Field'}
]

const activeTab = ref<'calculated' | 'merged'>('calculated')
const fieldName = ref('')
const saving = ref(false)

// Calculated field state
const formula = ref('')
const formulaError = ref('')
const fieldSearch = ref('')
const functionSearch = ref('')
const selectedCategory = ref<FunctionCategory | 'All'>('All')
const selectedFunction = ref<FormulaFunction | null>(null)
const formulaTextarea = ref<HTMLTextAreaElement | null>(null)

// Merged field state
const mergeFields = ref<{ tableName: string; fieldName: string }[]>([])
const mergeFieldSearch = ref('')
const joinType = ref('cross')

const categoryOptions = computed(() => [
  {label: 'All', value: 'All'},
  ...functionCategories.map(c => ({label: c, value: c}))
])

const joinTypes = [
  {
    id: 'cross',
    label: 'Cross Join',
    description: 'Combine all values from both fields',
    icon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="5" fill="currentColor" opacity="0.5"/><circle cx="15" cy="12" r="5" fill="currentColor" opacity="0.5"/></svg>'
  },
  {
    id: 'left',
    label: 'Left Join',
    description: 'Keep all values from the first field',
    icon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="5" fill="currentColor"/><circle cx="15" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
  },
  {
    id: 'right',
    label: 'Right Join',
    description: 'Keep all values from the last field',
    icon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="12" r="5" fill="currentColor"/></svg>'
  },
  {
    id: 'inner',
    label: 'Inner Join',
    description: 'Only matching values from both fields',
    icon: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="12" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 8a5 5 0 0 1 0 8 5 5 0 0 1 0-8z" fill="currentColor"/></svg>'
  }
]

const isEditing = computed(() => !!props.editField)

// Initialize from edit field if provided
watch(() => props.editField, (field) => {
  if (field) {
    fieldName.value = field.name
    activeTab.value = field.type
    if (field.type === 'calculated') {
      formula.value = field.formula || ''
    } else {
      mergeFields.value = field.sourceFields || []
      joinType.value = field.joinType || 'cross'
    }
  } else {
    resetForm()
  }
}, {immediate: true})

watch(isOpen, (open) => {
  if (!open) {
    resetForm()
  }
})

function resetForm() {
  fieldName.value = ''
  formula.value = ''
  formulaError.value = ''
  mergeFields.value = []
  joinType.value = 'cross'
  selectedFunction.value = null
}

const filteredFieldsByTable = computed(() => {
  const search = fieldSearch.value.toLowerCase().trim()
  if (!search) return props.fieldsByTable

  return props.fieldsByTable
      .map(table => ({
        ...table,
        fields: table.fields.filter(f => f.name.toLowerCase().includes(search))
      }))
      .filter(table => table.fields.length > 0)
})

const filteredFunctions = computed(() => {
  let fns = formulaFunctions

  if (selectedCategory.value !== 'All') {
    fns = fns.filter(f => f.category === selectedCategory.value)
  }

  const search = functionSearch.value.toLowerCase().trim()
  if (search) {
    fns = fns.filter(f =>
        f.name.toLowerCase().includes(search) ||
        f.description.toLowerCase().includes(search)
    )
  }

  return fns
})

const filteredDimensionFields = computed(() => {
  const search = mergeFieldSearch.value.toLowerCase().trim()

  // Filter to non-numeric fields (dimensions)
  return props.fieldsByTable
      .map(table => ({
        ...table,
        fields: table.fields.filter(f => {
          const isText = !f.isNumeric && f.type !== 'number' && f.type !== 'numeric' && f.type !== 'integer'
          const matchesSearch = !search || f.name.toLowerCase().includes(search)
          return isText && matchesSearch
        })
      }))
      .filter(table => table.fields.length > 0)
})

const canApply = computed(() => {
  if (!fieldName.value.trim()) return false

  if (activeTab.value === 'calculated') {
    return formula.value.trim().length > 0
  } else {
    return mergeFields.value.length >= 2
  }
})

function insertField(tableName: string, fieldName: string) {
  const fieldRef = `[${tableName}.${fieldName}]`
  if (formulaTextarea.value) {
    const start = formulaTextarea.value.selectionStart
    const end = formulaTextarea.value.selectionEnd
    formula.value = formula.value.substring(0, start) + fieldRef + formula.value.substring(end)
    nextTick(() => {
      formulaTextarea.value?.focus()
      const newPos = start + fieldRef.length
      formulaTextarea.value?.setSelectionRange(newPos, newPos)
    })
  } else {
    formula.value += fieldRef
  }
}

function selectFunction(fn: FormulaFunction) {
  selectedFunction.value = fn
}

function insertFunction(fn: FormulaFunction) {
  const funcText = fn.name + '()'
  if (formulaTextarea.value) {
    const start = formulaTextarea.value.selectionStart
    const end = formulaTextarea.value.selectionEnd
    formula.value = formula.value.substring(0, start) + funcText + formula.value.substring(end)
    nextTick(() => {
      formulaTextarea.value?.focus()
      // Position cursor inside parentheses
      const newPos = start + fn.name.length + 1
      formulaTextarea.value?.setSelectionRange(newPos, newPos)
    })
  } else {
    formula.value += funcText
  }
}

function addMergeField(tableName: string, fieldName: string) {
  // Avoid duplicates
  if (!mergeFields.value.some(f => f.tableName === tableName && f.fieldName === fieldName)) {
    mergeFields.value.push({tableName, fieldName})
  }
}

function removeMergeField(index: number) {
  mergeFields.value.splice(index, 1)
}

async function apply() {
  if (!canApply.value) return

  saving.value = true
  formulaError.value = ''

  try {
    const customField: CustomField = {
      id: props.editField?.id || `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fieldName.value.trim(),
      type: activeTab.value
    }

    if (activeTab.value === 'calculated') {
      customField.formula = formula.value.trim()
      customField.resultType = 'number' // Could be enhanced with formula analysis
    } else {
      customField.sourceFields = [...mergeFields.value]
      customField.joinType = joinType.value
      customField.resultType = 'text'
    }

    await $fetch('/api/schema/custom-field', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        field: customField,
        isUpdate: isEditing.value
      }
    })

    emit('saved', customField)
    close()
  } catch (err: any) {
    formulaError.value = err.data?.message || err.message || 'Failed to save custom field'
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
  emit('close')
}
</script>
