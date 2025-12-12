<template>
  <aside class="w-full max-w-md shrink-0 flex sticky top-4 self-start">
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-md flex flex-col w-full max-h-[calc(100vh-2rem)]">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 class="text-lg font-semibold">Options</h3>
        <slot name="collapse"></slot>
      </div>
      <div class="p-4 space-y-3 overflow-y-auto flex-1">
        <div v-if="!selectedWidget" class="text-sm text-gray-500">Select a block to edit its options.</div>
        <template v-else>
          <component
              :is="panelComponent"
              v-bind="panelProps"
          />
        </template>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import WidgetSidebarText from './WidgetSidebarText.vue'
import WidgetSidebarChart from './WidgetSidebarChart.vue'

const props = defineProps<{
  selectedWidget: any | null
  textForm: any
  fontFamilyItems: Array<{ label: string; value: string }>
  readonly?: boolean
  chartAppearance?: any
}>()

const emit = defineEmits<{
  'update-text-form': [partial: Record<string, any>]
  'update-text-content': [content: string]
  'delete-widget': []
  'edit-chart': []
  'rename-chart': [name: string]
  'delete-chart': []
  'update-chart-appearance': [partial: Record<string, any>]
}>()

const panelComponent = computed(() => {
  if (!props.selectedWidget) return null
  if (props.selectedWidget.type === 'text') return WidgetSidebarText
  if (props.selectedWidget.type === 'chart') return WidgetSidebarChart
  return null
})

const panelProps = computed(() => {
  if (!props.selectedWidget) return {}
  if (props.selectedWidget.type === 'text') {
    return {
      textForm: props.textForm,
      fontFamilyItems: props.fontFamilyItems,
      readonly: props.readonly,
      onUpdateTextForm: (partial: Record<string, any>) => emit('update-text-form', partial),
      onUpdateTextContent: (content: string) => emit('update-text-content', content),
      onDeleteWidget: () => emit('delete-widget')
    }
  }
  if (props.selectedWidget.type === 'chart') {
    return {
      name: props.selectedWidget.name || 'Chart',
      chartType: props.selectedWidget.state?.chartType || 'table',
      chartAppearance: props.chartAppearance || {},
      readonly: props.readonly,
      onEdit: () => emit('edit-chart'),
      onRename: (name: string) => emit('rename-chart', name),
      onDelete: () => emit('delete-chart'),
      onUpdateChartAppearance: (partial: Record<string, any>) => emit('update-chart-appearance', partial)
    }
  }
  return {}
})
</script>

