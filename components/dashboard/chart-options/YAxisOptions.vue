<template>
  <div class="space-y-3">
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Y-axis label</label>
      <UInput
          v-model="local.yAxisLabel"
          class="mt-1 w-full"
          :readonly="readonly"
          placeholder="Add a label"
      />
    </div>

    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Number formatting</label>
      <div class="flex items-center gap-3 mt-1">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600 dark:text-gray-300">Decimals</span>
          <UInput
              v-model.number="local.numberFormat.decimalPlaces"
              type="number"
              min="0"
              max="6"
              class="w-20"
              :readonly="readonly"
          />
        </div>
        <UCheckbox
            v-model="local.numberFormat.thousandsSeparator"
            :disabled="readonly"
            label="Thousands separator"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {reactive, watch} from 'vue'

const props = defineProps<{
  appearance?: Record<string, any>
  readonly?: boolean
}>()

const emit = defineEmits<{
  update: [partial: Record<string, any>]
}>()

const local = reactive({
  yAxisLabel: '',
  numberFormat: {
    decimalPlaces: 0,
    thousandsSeparator: true
  }
})

let initialized = false
watch(() => props.appearance, (val) => {
  local.yAxisLabel = val?.yAxisLabel || ''
  local.numberFormat.decimalPlaces = val?.numberFormat?.decimalPlaces ?? 0
  local.numberFormat.thousandsSeparator = val?.numberFormat?.thousandsSeparator ?? true
  initialized = false
}, {deep: true, immediate: true})

watch(local, (val) => {
  if (!initialized) {
    initialized = true
    return
  }
  emit('update', {
    yAxisLabel: val.yAxisLabel,
    numberFormat: {
      decimalPlaces: val.numberFormat.decimalPlaces ?? 0,
      thousandsSeparator: !!val.numberFormat.thousandsSeparator
    }
  })
}, {deep: true})
</script>

