<template>
  <div class="flex items-center gap-2">
    <button
        type="button"
        class="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 overflow-hidden relative cursor-pointer"
        :style="{ backgroundColor: modelValue || '#ffffff' }"
        @click="openPicker"
    >
      <input
          ref="inputRef"
          type="color"
          :value="modelValue || '#ffffff'"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </button>
    <input
        v-if="showHex"
        type="text"
        :value="modelValue || '#ffffff'"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="w-20 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        placeholder="#000000"
    />
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'

defineProps<{
  modelValue?: string
  showHex?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement>()

function openPicker() {
  inputRef.value?.click()
}
</script>
