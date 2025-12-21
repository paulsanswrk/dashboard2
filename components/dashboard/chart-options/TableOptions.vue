<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <UCheckbox v-model="local.tableStriped" :disabled="readonly" label="Zebra rows"/>
      <UCheckbox v-model="local.tableBordered" :disabled="readonly" label="Show borders"/>
      <UCheckbox v-model="local.tableCompact" :disabled="readonly" label="Compact density"/>
      <UCheckbox v-model="local.tableHeaderBold" :disabled="readonly" label="Bold header"/>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Row padding</label>
        <UInput
            v-model.number="local.tableRowPadding"
            type="number"
            min="4"
            max="24"
            class="mt-1 w-full"
            :readonly="readonly"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Header background</label>
        <UInput
            v-model="local.tableHeaderBg"
            type="text"
            class="mt-1 w-full"
            :readonly="readonly"
            placeholder="#f8fafc"
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
  tableStriped: true,
  tableBordered: true,
  tableCompact: false,
  tableHeaderBold: true,
  tableRowPadding: 10,
  tableHeaderBg: '#f8fafc'
})

let initialized = false
watch(() => props.appearance, (val) => {
  local.tableStriped = val?.tableStriped ?? true
  local.tableBordered = val?.tableBordered ?? true
  local.tableCompact = val?.tableCompact ?? false
  local.tableHeaderBold = val?.tableHeaderBold ?? true
  local.tableRowPadding = val?.tableRowPadding ?? 10
  local.tableHeaderBg = val?.tableHeaderBg ?? '#f8fafc'
  initialized = false
}, {deep: true, immediate: true})

watch(local, (val) => {
  if (!initialized) {
    initialized = true
    return
  }
  emit('update', {
    tableStriped: !!val.tableStriped,
    tableBordered: !!val.tableBordered,
    tableCompact: !!val.tableCompact,
    tableHeaderBold: !!val.tableHeaderBold,
    tableRowPadding: Math.min(Math.max(val.tableRowPadding ?? 10, 2), 32),
    tableHeaderBg: val.tableHeaderBg || '#f8fafc'
  })
}, {deep: true})
</script>











