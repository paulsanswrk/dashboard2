<template>
  <div class="space-y-3">
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Chart title</label>
      <UInput
          v-model="local.chartTitle"
          class="mt-1 w-full"
          :readonly="readonly"
          placeholder="Enter chart title"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Legend position</label>
        <USelectMenu
            v-model="local.legendPosition"
            :items="legendOptions"
            value-key="value"
            label-key="label"
            class="mt-1 w-full"
            :portal="true"
            :popper="{ strategy: 'fixed' }"
            :ui="{ content: 'z-[120]' }"
            :disabled="readonly"
        />
      </div>
      <div v-if="supportsStacked" class="flex items-end">
        <UCheckbox v-model="local.stacked" :disabled="readonly" label="Stack series"/>
      </div>
    </div>

    <div v-if="isPieOrDonut" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Donut hole (%)</label>
        <UInput
            v-model.number="local.pieInnerRadius"
            type="number"
            min="0"
            max="90"
            class="mt-1 w-full"
            :readonly="readonly"
            placeholder="45"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Outer radius (%)</label>
        <UInput
            v-model.number="local.pieOuterRadius"
            type="number"
            min="10"
            max="100"
            class="mt-1 w-full"
            :readonly="readonly"
            placeholder="75"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Label position</label>
        <USelectMenu
            v-model="local.pieLabelPosition"
            :items="labelPositionOptions"
            value-key="value"
            label-key="label"
            class="mt-1 w-full"
            :portal="true"
            :popper="{ strategy: 'fixed' }"
            :ui="{ content: 'z-[120]' }"
            :disabled="readonly"
        />
      </div>
      <div class="flex items-end">
        <UCheckbox v-model="local.pieShowLabels" :disabled="readonly" label="Show labels"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, watch} from 'vue'

const props = defineProps<{
  appearance?: Record<string, any>
  chartType: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  update: [partial: Record<string, any>]
}>()

const legendOptions = [
  {label: 'Top', value: 'top'},
  {label: 'Bottom', value: 'bottom'},
  {label: 'Left', value: 'left'},
  {label: 'Right', value: 'right'}
]

const supportsStacked = computed(() => ['bar', 'area', 'line'].includes(props.chartType))
const isPieOrDonut = computed(() => ['pie', 'donut'].includes(props.chartType))
const labelPositionOptions = [
  {label: 'Outside', value: 'outside'},
  {label: 'Inside', value: 'inside'}
]

const local = reactive({
  chartTitle: '',
  legendPosition: 'top',
  stacked: false,
  pieInnerRadius: 45,
  pieOuterRadius: 75,
  pieLabelPosition: 'outside',
  pieShowLabels: true
})

let initialized = false
watch(() => props.appearance, (val) => {
  local.chartTitle = val?.chartTitle || ''
  local.legendPosition = val?.legendPosition || 'top'
  local.stacked = !!val?.stacked
  local.pieInnerRadius = val?.pieInnerRadius ?? 45
  local.pieOuterRadius = val?.pieOuterRadius ?? 75
  local.pieLabelPosition = val?.pieLabelPosition || 'outside'
  local.pieShowLabels = val?.pieShowLabels ?? true
  initialized = false
}, {deep: true, immediate: true})

watch(local, (val) => {
  if (!initialized) {
    initialized = true
    return
  }
  const partial: Record<string, any> = {
    chartTitle: val.chartTitle,
    legendPosition: val.legendPosition
  }
  if (supportsStacked.value) {
    partial.stacked = val.stacked
  }
  if (isPieOrDonut.value) {
    partial.pieInnerRadius = Math.min(Math.max(val.pieInnerRadius ?? 0, 0), 90)
    partial.pieOuterRadius = Math.min(Math.max(val.pieOuterRadius ?? 10, 10), 100)
    partial.pieLabelPosition = val.pieLabelPosition || 'outside'
    partial.pieShowLabels = !!val.pieShowLabels
  }
  emit('update', partial)
}, {deep: true})
</script>

