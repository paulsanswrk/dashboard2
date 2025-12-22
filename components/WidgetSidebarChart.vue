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
      <UButton color="red" variant="outline" size="xs" class="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30" @click="$emit('delete')" :disabled="readonly">
        Delete
      </UButton>
    </div>

    <!-- Chart Config Editor -->
    <ChartConfigEditor
        :chart-type="chartType"
        :external-appearance="chartAppearance"
        :use-external-state="true"
        @update:appearance="emitUpdate"
    />

    <div class="text-xs text-gray-400">Changes save automatically</div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import ChartConfigEditor from './reporting/ChartConfigEditor.vue'

const props = defineProps<{
  name: string
  chartType: string
  chartAppearance?: Record<string, any>
  readonly?: boolean
}>()
const emit = defineEmits<{
  rename: [name: string]
  edit: []
  delete: []
  'update-chart-appearance': [partial: Record<string, any>]
}>()

const localName = ref(props.name)
watch(() => props.name, (v) => localName.value = v)

function emitRename() {
  emit('rename', localName.value)
}

function emitUpdate(appearance: Record<string, any>) {
  emit('update-chart-appearance', appearance)
}
</script>

