<template>
  <div class="border rounded-md dark:border-gray-700 h-full flex flex-col">
    <div class="px-3 py-2 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between border-b dark:border-gray-700">
      <span>List of foreign keys</span>
      <button
          class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
          title="Refresh from database"
          @click="$emit('refresh')"
      >
        <Icon name="i-heroicons-arrow-path" class="w-4 h-4 text-primary-600 dark:text-primary-400"/>
      </button>
    </div>

    <!-- References List -->
    <div class="flex-1 overflow-auto p-2">
      <div v-if="allReferences.length === 0" class="text-center text-gray-400 py-8 text-sm">
        No foreign keys found
      </div>

      <div class="space-y-2">
        <div
            v-for="(ref, index) in allReferences"
            :key="ref.id || index"
            class="border rounded-lg p-3 hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
            :class="ref.isCustom ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700'"
        >
          <div class="grid grid-cols-2 gap-3 text-sm">
            <!-- Source -->
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Source</div>
              <div class="font-medium text-gray-900 dark:text-white truncate">{{ ref.sourceTable }}</div>
              <div class="text-gray-600 dark:text-gray-300 truncate">{{ ref.sourceColumn }}</div>
            </div>

            <!-- Target -->
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Target</div>
              <div class="font-medium text-gray-900 dark:text-white truncate">{{ ref.targetTable }}</div>
              <div class="text-gray-600 dark:text-gray-300 truncate">{{ ref.targetColumn }}</div>
            </div>
          </div>

          <!-- Custom Reference Indicator + Delete -->
          <div v-if="ref.isCustom" class="mt-2 pt-2 border-t border-primary-200 dark:border-primary-700 flex items-center justify-between">
            <UBadge size="xs" color="primary" variant="soft">Custom Reference</UBadge>
            <button
                class="p-1 text-gray-400 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete reference"
                @click="$emit('delete', ref)"
            >
              <Icon name="i-heroicons-trash" class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ForeignKey {
  constraintName?: string
  sourceTable: string
  targetTable: string
  columnPairs: Array<{
    sourceColumn: string
    targetColumn: string
  }>
}

interface CustomReference {
  id: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  isCustom: true
}

interface DisplayReference {
  id?: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  isCustom: boolean
}

const props = defineProps<{
  foreignKeys: ForeignKey[]
  customReferences: CustomReference[]
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'delete', ref: DisplayReference): void
}>()

const allReferences = computed((): DisplayReference[] => {
  // Convert foreign keys to display format
  const fkRefs: DisplayReference[] = []
  for (const fk of props.foreignKeys) {
    for (const pair of fk.columnPairs) {
      fkRefs.push({
        sourceTable: fk.sourceTable,
        sourceColumn: pair.sourceColumn,
        targetTable: fk.targetTable,
        targetColumn: pair.targetColumn,
        isCustom: false
      })
    }
  }

  // Add custom references
  const customRefs: DisplayReference[] = props.customReferences.map(cr => ({
    id: cr.id,
    sourceTable: cr.sourceTable,
    sourceColumn: cr.sourceColumn,
    targetTable: cr.targetTable,
    targetColumn: cr.targetColumn,
    isCustom: true
  }))

  return [...fkRefs, ...customRefs]
})
</script>
