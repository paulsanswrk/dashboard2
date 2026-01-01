<template>
  <div class="space-y-3">
    <!-- Title input -->
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
      <UInput v-model="localName" class="mt-1 w-full" @input="emitRename" :readonly="readonly"/>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-wrap items-center gap-2">
      <UButton color="orange" variant="solid" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" size="xs" @click="$emit('edit')" :disabled="readonly">
        Edit Chart
      </UButton>

    </div>

    <!-- Chart Config Editor -->
    <ChartConfigEditor
        :chart-type="chartType"
        :external-appearance="chartAppearance"
        :use-external-state="true"
        @update:appearance="emitUpdate"
    />

    <!-- Border Section -->
    <div class="border-t pt-3 mt-3">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Widget Border</h4>
      <div class="space-y-3">
        <!-- Border Width -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Width</label>
          <div class="flex gap-1 flex-wrap mt-1">
            <button
                v-for="option in borderWidthOptions"
                :key="option.value"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors"
                :class="localBorderWidth === option.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                :disabled="readonly"
                @click="updateBorder('borderWidth', option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <!-- Border Color -->
        <div v-if="localBorderWidth > 0">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Color</label>
          <div class="flex gap-2 items-center mt-1">
            <input
                type="color"
                :value="localBorderColor"
                :disabled="readonly"
                @input="updateBorder('borderColor', ($event.target as HTMLInputElement).value)"
                class="w-8 h-8 rounded cursor-pointer border-0"
            />
            <UInput
                :model-value="localBorderColor"
                :disabled="readonly"
                size="sm"
                class="flex-1"
                placeholder="#cccccc"
                @update:model-value="updateBorder('borderColor', $event)"
            />
          </div>
        </div>
        <!-- Border Style -->
        <div v-if="localBorderWidth > 0">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Style</label>
          <div class="flex gap-1 flex-wrap mt-1">
            <button
                v-for="option in borderStyleOptions"
                :key="option.value"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors"
                :class="localBorderStyle === option.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                :disabled="readonly"
                @click="updateBorder('borderStyle', option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="text-xs text-gray-400">Changes save automatically</div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import ChartConfigEditor from './reporting/ChartConfigEditor.vue'

const props = defineProps<{
  name: string
  chartType: string
  chartAppearance?: Record<string, any>
  readonly?: boolean
  borderWidth?: number
  borderColor?: string
  borderStyle?: string
}>()
const emit = defineEmits<{
  rename: [name: string]
  edit: []
  delete: []
  'update-chart-appearance': [partial: Record<string, any>]
  'update-border': [partial: Record<string, any>]
}>()

const localName = ref(props.name)
watch(() => props.name, (v) => localName.value = v)

// Border local state
const localBorderWidth = computed(() => props.borderWidth ?? 0)
const localBorderColor = computed(() => props.borderColor || '#cccccc')
const localBorderStyle = computed(() => props.borderStyle || 'solid')

const borderWidthOptions = [
  {label: 'None', value: 0},
  {label: '1px', value: 1},
  {label: '2px', value: 2},
  {label: '3px', value: 3}
]

const borderStyleOptions = [
  {label: 'Solid', value: 'solid'},
  {label: 'Dashed', value: 'dashed'},
  {label: 'Dotted', value: 'dotted'}
]

function emitRename() {
  emit('rename', localName.value)
}

function emitUpdate(appearance: Record<string, any>) {
  emit('update-chart-appearance', appearance)
}

function updateBorder(field: string, value: any) {
  emit('update-border', {[field]: value})
}
</script>

