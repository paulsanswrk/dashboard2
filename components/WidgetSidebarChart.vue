<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
        <UInput v-model="localName" class="mt-1 w-full" @input="emitRename" :readonly="readonly"/>
      </div>
      <div class="flex items-center gap-2">
        <UButton color="orange" variant="solid" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" size="sm" @click="$emit('edit')" :disabled="readonly">
          Edit Chart
        </UButton>
        <UButton color="red" variant="outline" size="sm" class="cursor-pointer" @click="$emit('delete')" :disabled="readonly">
          Delete
        </UButton>
      </div>
    </div>

    <div>
      <div class="flex gap-2 mb-3">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            class="px-3 py-1 rounded border text-sm font-medium cursor-pointer transition-all"
            :class="activeTab === tab.key
              ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-700'
              : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <component
          :is="activeComponent"
          v-if="activeComponent"
          :appearance="chartAppearance"
          :chart-type="chartType"
          :readonly="readonly"
          @update="emitUpdate"
      />
    </div>

    <div class="text-xs text-gray-400">Changes save automatically</div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import ChartAreaOptions from './dashboard/chart-options/ChartAreaOptions.vue'
import XAxisOptions from './dashboard/chart-options/XAxisOptions.vue'
import YAxisOptions from './dashboard/chart-options/YAxisOptions.vue'
import TableOptions from './dashboard/chart-options/TableOptions.vue'

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

const supportsAxes = computed(() => ['bar', 'line', 'area', 'scatter'].includes(props.chartType))
const isTable = computed(() => props.chartType === 'table')
const tabs = computed(() => {
  if (isTable.value) {
    return [{key: 'table', label: 'Table', component: TableOptions}]
  }
  const base = [
    {key: 'chart', label: 'Chart area', component: ChartAreaOptions}
  ]
  if (supportsAxes.value) {
    base.push({key: 'x', label: 'X-axis', component: XAxisOptions})
    base.push({key: 'y', label: 'Y-axis', component: YAxisOptions})
  }
  return base
})

const activeTab = ref('chart')
watch(tabs, (newTabs) => {
  if (!newTabs.find(t => t.key === activeTab.value) && newTabs.length) {
    activeTab.value = newTabs[0].key
  }
}, {immediate: true})

watch(() => props.chartType, () => {
  const available = tabs.value
  if (!available.find(t => t.key === activeTab.value) && available.length) {
    activeTab.value = available[0].key
  }
}, {immediate: true})

const activeComponent = computed(() => tabs.value.find(t => t.key === activeTab.value)?.component || null)

function emitUpdate(partial: Record<string, any>) {
  emit('update-chart-appearance', partial)
}
</script>
