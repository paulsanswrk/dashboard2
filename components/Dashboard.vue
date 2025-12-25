<template>
  <div class="relative border rounded bg-white dark:bg-gray-900 p-3 overflow-hidden">
    <!-- Device width indicator overlay - only show for tablet/mobile -->
    <div v-if="!loading && device !== 'desktop'" class="absolute inset-3 pointer-events-none z-10 flex">
      <!-- Left overlay -->
      <div
          class="bg-black/10"
          :style="{ width: leftOverlayWidth }"
      ></div>
      <!-- Center transparent area (for preview content) -->
      <div
          class="flex-shrink-0"
          :style="{ width: previewWidth + 'px' }"
      ></div>
      <!-- Right overlay (mirrors left) -->
      <div
          class="bg-black/10"
          :style="{ width: leftOverlayWidth }"
      ></div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      <span class="ml-3 text-gray-500">Loading dashboard...</span>
    </div>
    <div v-else :style="{ width: previewWidth + 'px', margin: '0 auto', position: 'relative', zIndex: 20 }">
      <ClientOnly>
        <GridLayout
            :layout="layout"
            :col-num="gridConfig.colNum"
            :row-height="gridConfig.rowHeight"
            :max-rows="gridConfig.maxRows"
            :margin="gridConfig.margin"
            :is-draggable="gridConfig.isDraggable && !preview"
            :is-resizable="gridConfig.isResizable && !preview"
            :is-mirrored="gridConfig.isMirrored"
            :is-bounded="gridConfig.isBounded"
            :auto-size="gridConfig.autoSize"
            :vertical-compact="gridConfig.verticalCompact"
            :restore-on-drag="gridConfig.restoreOnDrag"
            :prevent-collision="gridConfig.preventCollision"
            :use-css-transforms="gridConfig.useCssTransforms"
            :use-style-cursor="gridConfig.useStyleCursor && !preview"
            :transform-scale="gridConfig.transformScale"
            :responsive="gridConfig.responsive"
            :breakpoints="gridConfig.breakpoints"
            :cols="gridConfig.cols"
            @layout-updated="onLayoutUpdated"
        >
          <GridItem v-for="item in layout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i">
            <template v-if="findWidget(item.i)?.type === 'chart'">
              <UCard
                  :class="['h-full w-full cursor-pointer transition-shadow', {'ring-2 ring-orange-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900': isSelected(item.i)}]"
                  :ui="{ body: { padding: 'sm:p-2 p-2' } }"
                  @click="handleSelectText(item.i)"
              >
                <div class="mb-2">
                  <input
                      :value="findChartName(item.i)"
                      class="w-full !bg-transparent text-sm font-semibold px-0 py-0 focus:outline-none focus:ring-0 focus:border-transparent"
                      :readonly="preview"
                      @focus.stop="handleSelectText(item.i)"
                      @input="onChartNameInput(item.i, $event)"
                  />
                </div>
                <div class="h-full">
                  <DashboardChartRenderer
                      :state="findChartState(item.i)"
                      :config-override="findConfigOverride(item.i)"
                      :preloaded-columns="findChartColumns(item.i)"
                      :preloaded-rows="findChartRows(item.i)"
                  />
                </div>
              </UCard>
            </template>
            <template v-else-if="findWidget(item.i)?.type === 'text'">
              <div
                  class="h-full w-full relative border border-gray-200 dark:border-gray-700 rounded-md p-2 cursor-pointer"
                  :class="{'ring-2 ring-orange-400': isSelected(item.i)}"
                  @click="handleSelectText(item.i)"
              >
                <DashboardTextWidget
                    :style-props="findWidgetStyle(item.i)"
                    class="h-full w-full"
                    :readonly="preview"
                    @update:content="handleUpdateTextContent(item.i, $event)"
                />
              </div>
            </template>
            <template v-else-if="findWidget(item.i)?.type === 'image'">
              <div
                  class="h-full w-full relative border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden cursor-pointer"
                  :class="{'ring-2 ring-orange-400': isSelected(item.i)}"
                  @click="handleSelectText(item.i)"
              >
                <DashboardImageWidget
                    :style-props="findWidgetStyle(item.i)"
                    :edit-mode="!preview"
                    class="h-full w-full"
                />
              </div>
            </template>
            <template v-else>
              <div class="h-full flex items-center justify-center text-sm text-gray-500">
                Unsupported widget
              </div>
            </template>
          </GridItem>
        </GridLayout>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Widget {
  widgetId: string
  type: 'chart' | 'text' | 'image' | 'icon'
  chartId?: number
  name?: string
  position: any
  state?: any
  preloadedColumns?: any[]
  preloadedRows?: any[]
  style?: any
  configOverride?: any
}

interface GridConfig {
  colNum: number
  rowHeight: number
  maxRows: number | typeof Infinity
  margin: [number, number]
  isDraggable: boolean
  isResizable: boolean
  isMirrored: boolean
  isBounded: boolean
  autoSize: boolean
  verticalCompact: boolean
  restoreOnDrag: boolean
  preventCollision: boolean
  useCssTransforms: boolean
  useStyleCursor: boolean
  transformScale: number
  responsive: boolean
  breakpoints: Record<string, number>
  cols: Record<string, number>
}

interface Props {
  device: 'desktop' | 'tablet' | 'mobile'
  layout: any[]
  gridConfig: GridConfig
  widgets: Widget[]
  loading: boolean
  preview?: boolean
  selectedTextId?: string
}

const props = withDefaults(defineProps<Props>(), {
  preview: false
})

const emit = defineEmits<{
  'update:layout': [layout: any[]]
  'edit-chart': [chartId: string]
  'rename-chart': [chartId: string]
  'delete-chart': [chartId: string]
  'edit-text': [widgetId: string]
  'delete-widget': [widgetId: string]
  'select-text': [widgetId: string]
  'update-text-content': [widgetId: string, content: string]
  'rename-chart-inline': [widgetId: string, name: string]
}>()

const previewWidth = computed(() => {
  if (props.device === 'mobile') return 390
  if (props.device === 'tablet') return 768
  return 1600 // Increased from 1200px for better chart readability with 12 columns
})

// Calculate the left overlay width for the device preview indicator
const leftOverlayWidth = computed(() => {
  // The container has p-3 (12px) padding on each side, so inner width is containerWidth - 24px
  // The preview is centered, so left overlay = (innerWidth - previewWidth) / 2
  // But since we're using flexbox within the padded area, we can use percentages
  return `calc((100% - ${previewWidth.value}px) / 2)`
})

function findWidget(i: string): Widget | undefined {
  return props.widgets.find((w) => String(w.widgetId) === i)
}

const findChartName = (i: string) => findWidget(i)?.name || 'Chart'
const findChartState = (i: string) => findWidget(i)?.state || {}
const findChartColumns = (i: string) => findWidget(i)?.preloadedColumns || undefined
const findChartRows = (i: string) => findWidget(i)?.preloadedRows || undefined
const findWidgetStyle = (i: string) => findWidget(i)?.style || {}
const findConfigOverride = (i: string) => findWidget(i)?.configOverride || {}

function isSelected(widgetId: string) {
  return props.selectedTextId != null && props.selectedTextId === widgetId
}

function handleEditChart(widgetId: string) {
  const widget = findWidget(widgetId)
  if (widget?.chartId != null) {
    emit('edit-chart', String(widget.chartId))
  }
}

function handleRenameChart(widgetId: string) {
  const widget = findWidget(widgetId)
  if (widget?.chartId != null) {
    emit('rename-chart', String(widget.chartId))
  }
}

function handleDeleteChart(widgetId: string) {
  const widget = findWidget(widgetId)
  if (widget?.chartId != null) {
    emit('delete-chart', String(widget.chartId))
  }
}

function handleEditText(widgetId: string) {
  emit('edit-text', widgetId)
}

function handleDeleteWidget(widgetId: string) {
  emit('delete-widget', widgetId)
}

function handleSelectText(widgetId: string) {
  emit('select-text', widgetId)
}

function handleUpdateTextContent(widgetId: string, content: string) {
  emit('update-text-content', widgetId, content)
}

function onChartNameInput(widgetId: string, e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('rename-chart-inline', widgetId, value)
}

function getMenuItems(widgetId: string) {
  const widget = findWidget(widgetId)
  if (!widget) return []
  if (widget.type === 'chart') return getChartMenuItems(widgetId)
  if (widget.type === 'text') return getTextMenuItems(widgetId)
  return getTextMenuItems(widgetId)
}


function getChartMenuItems(chartId: string) {
  return [
    [{
      label: 'Edit Chart',
      icon: 'i-heroicons-document-text',
      class: 'cursor-pointer',
      onClick: () => handleEditChart(chartId),
    }],
    [{
      label: 'Rename Chart',
      icon: 'i-heroicons-pencil',
      class: 'cursor-pointer',
      onClick: () => handleRenameChart(chartId)
    }],
    [{
      label: 'Delete Chart',
      icon: 'i-heroicons-trash',
      class: 'cursor-pointer',
      onClick: () => handleDeleteChart(chartId)
    }]
  ]
}

function getTextMenuItems(widgetId: string) {
  return [
    [{
      label: 'Edit Text',
      icon: 'i-heroicons-pencil-square',
      class: 'cursor-pointer',
      onClick: () => handleEditText(widgetId),
    }],
    [{
      label: 'Delete',
      icon: 'i-heroicons-trash',
      class: 'cursor-pointer',
      onClick: () => handleDeleteWidget(widgetId)
    }]
  ]
}

function onLayoutUpdated(newLayout: any[]) {
  emit('update:layout', newLayout)
}
</script>

<style scoped>
:deep(.vue-grid-layout) {
  min-height: 300px;
}

:deep(.vue-grid-item) {
  min-height: 60px !important; /* Allow smaller widgets (esp. text) */
}

:deep(.vue-resizable-handle) {
  z-index: 10; /* Ensure resizer is visible */
}
</style>
