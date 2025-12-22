<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Type</label>
      <select
          :value="modelValue?.type || 'auto'"
          @change="updateField('type', ($event.target as HTMLSelectElement).value as NumberFormatSettings['type'])"
          class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      >
        <option value="auto">Auto</option>
        <option value="number">Number</option>
        <option value="percentage">Percentage</option>
        <option value="currency">Currency</option>
        <option value="custom">Custom</option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Prefix</label>
      <input
          type="text"
          :value="modelValue?.prefix || ''"
          @input="updateField('prefix', ($event.target as HTMLInputElement).value)"
          class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="$"
      />
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Suffix</label>
      <input
          type="text"
          :value="modelValue?.suffix || ''"
          @input="updateField('suffix', ($event.target as HTMLInputElement).value)"
          class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="%"
      />
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Separator</label>
      <select
          :value="modelValue?.separator || 'comma'"
          @change="updateField('separator', ($event.target as HTMLSelectElement).value as NumberFormatSettings['separator'])"
          class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      >
        <option value="comma">1,234.56</option>
        <option value="space">1 234,56</option>
        <option value="none">1234.56</option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Decimals</label>
      <select
          :value="modelValue?.decimalPlaces ?? 'auto'"
          @change="updateField('decimalPlaces', ($event.target as HTMLSelectElement).value === 'auto' ? 'auto' : Number(($event.target as HTMLSelectElement).value))"
          class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      >
        <option value="auto">Auto</option>
        <option v-for="n in 7" :key="n - 1" :value="n - 1">{{ n - 1 }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface NumberFormatSettings {
  type?: 'auto' | 'number' | 'percentage' | 'currency' | 'custom'
  prefix?: string
  suffix?: string
  separator?: 'comma' | 'space' | 'none'
  decimalPlaces?: number | 'auto'
}

const props = defineProps<{
  modelValue?: NumberFormatSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: NumberFormatSettings]
}>()

function updateField<K extends keyof NumberFormatSettings>(field: K, value: NumberFormatSettings[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}
</script>
