<template>
  <div class="space-y-3">
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">X-axis label</label>
      <UInput
          v-model="local.xAxisLabel"
          class="mt-1 w-full"
          :readonly="readonly"
          placeholder="Add a label"
      />
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
  xAxisLabel: ''
})

let initialized = false
watch(() => props.appearance, (val) => {
  local.xAxisLabel = val?.xAxisLabel || ''
  initialized = false
}, {deep: true, immediate: true})

watch(local, (val) => {
  if (!initialized) {
    initialized = true
    return
  }
  emit('update', {xAxisLabel: val.xAxisLabel})
}, {deep: true})
</script>

