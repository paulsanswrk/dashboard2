<template>
  <aside class="w-72 shrink-0 h-full">
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-md flex flex-col h-full max-h-full">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 class="text-lg font-semibold">Options</h3>
        <div class="flex items-center gap-1">
          <UButton
              v-if="(selectedWidget?.type === 'text' || selectedWidget?.type === 'chart' || selectedWidget?.type === 'image') && !readonly"
              color="red"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              class="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
              @click="handleDelete"
              :title="selectedWidget?.type === 'chart' ? 'Delete chart' : selectedWidget?.type === 'image' ? 'Delete image' : 'Delete text block'"
          />
          <slot name="collapse"></slot>
        </div>
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
import WidgetSidebarImage from './WidgetSidebarImage.vue'

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
  'update-image-style': [partial: Record<string, any>]
  'change-image': []
}>()

const panelComponent = computed(() => {
  if (!props.selectedWidget) return null
  if (props.selectedWidget.type === 'text') return WidgetSidebarText
  if (props.selectedWidget.type === 'chart') return WidgetSidebarChart
  if (props.selectedWidget.type === 'image') return WidgetSidebarImage
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
  if (props.selectedWidget.type === 'image') {
    const style = props.selectedWidget.style || {}
    return {
      imageUrl: style.imageUrl || '',
      objectFit: style.objectFit || 'cover',
      backgroundColor: style.backgroundColor || 'transparent',
      borderRadius: style.borderRadius ?? 0,
      borderColor: style.borderColor || '#cccccc',
      borderWidth: style.borderWidth ?? 0,
      borderStyle: style.borderStyle || 'solid',
      shadowColor: style.shadowColor || '#00000033',
      shadowSize: style.shadowSize || 'none',
      shadowPosition: style.shadowPosition || 'bottom-right',
      linkEnabled: style.linkEnabled ?? false,
      linkType: style.linkType || 'url',
      linkUrl: style.linkUrl || '',
      linkNewTab: style.linkNewTab ?? false,
      linkDashboardId: style.linkDashboardId || '',
      linkTabId: style.linkTabId || '',
      readonly: props.readonly,
      onUpdateStyle: (partial: Record<string, any>) => emit('update-image-style', partial),
      onChangeImage: () => emit('change-image')
    }
  }
  return {}
})

function handleDelete() {
  if (!props.selectedWidget) return

  if (props.selectedWidget.type === 'text') {
    const shouldDelete = typeof window !== 'undefined'
        ? window.confirm('Delete this text block? This action cannot be undone.')
        : true
    if (shouldDelete) {
      emit('delete-widget')
    }
  } else if (props.selectedWidget.type === 'chart') {
    // Parent handles confirmation modal for charts
    emit('delete-chart')
  } else if (props.selectedWidget.type === 'image') {
    const shouldDelete = typeof window !== 'undefined'
        ? window.confirm('Delete this image? This action cannot be undone.')
        : true
    if (shouldDelete) {
      emit('delete-widget')
    }
  }
}
</script>

