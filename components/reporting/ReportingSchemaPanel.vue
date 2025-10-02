<template>
  <div>
    <h2 class="font-medium mb-2">Fields</h2>
    <ul class="space-y-1 text-sm">
      <li
        v-for="f in fields"
        :key="f.fieldId"
        class="px-2 py-1 rounded border cursor-move"
        draggable="true"
        @dragstart="onDragStart(f)"
      >
        {{ f.label || f.name }}
        <span class="text-gray-500">({{ f.type }})</span>
      </li>
    </ul>
  </div>
  
</template>

<script setup lang="ts">
import type { ReportField } from '@/composables/useReportState'

const props = defineProps<{ fields: Array<ReportField> }>()

function onDragStart(field: ReportField) {
  const dt = (event as DragEvent).dataTransfer
  if (!dt) return
  dt.setData('application/json', JSON.stringify({ type: 'field', field }))
  dt.effectAllowed = 'copyMove'
}
</script>

<style scoped>
</style>


