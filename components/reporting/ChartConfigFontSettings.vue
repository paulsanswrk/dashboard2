<template>
  <div class="space-y-2">
    <!-- Color and Size row -->
    <div class="flex items-center gap-2">
      <ChartConfigColorPicker
          :model-value="modelValue?.color"
          @update:model-value="updateField('color', $event)"
      />
      <select
          :value="modelValue?.size || 12"
          @change="updateField('size', Number(($event.target as HTMLSelectElement).value))"
          class="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white w-16"
      >
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </div>
    <!-- Style buttons row -->
    <div class="flex border rounded overflow-hidden dark:border-gray-600 w-fit">
      <button
          type="button"
          :class="[
          'px-2 py-1 text-xs font-bold border-r dark:border-gray-600 cursor-pointer',
          modelValue?.bold ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
          @click="updateField('bold', !modelValue?.bold)"
      >B
      </button>
      <button
          type="button"
          :class="[
          'px-2 py-1 text-xs italic border-r dark:border-gray-600 cursor-pointer',
          modelValue?.italic ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
          @click="updateField('italic', !modelValue?.italic)"
      >I
      </button>
      <button
          type="button"
          :class="[
          'px-2 py-1 text-xs underline cursor-pointer',
          modelValue?.underline ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
          @click="updateField('underline', !modelValue?.underline)"
      >U
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChartConfigColorPicker from './ChartConfigColorPicker.vue'

export interface FontSettings {
  color?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

const props = defineProps<{
  modelValue?: FontSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FontSettings]
}>()

const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32]

function updateField<K extends keyof FontSettings>(field: K, value: FontSettings[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}
</script>
