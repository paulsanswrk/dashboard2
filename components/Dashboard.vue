<template>
  <div ref="containerRef" class="relative w-full min-h-full border rounded bg-white dark:bg-gray-900 p-3 overflow-hidden" @click="handleContainerClick">
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
    <!-- Wrapper uses relative positioning and sets the visual height after scaling -->
    <!-- The inner scaled container is absolute so its original large size doesn't affect layout -->
    <div v-else class="relative" :style="wrapperStyle">
      <div class="absolute top-0 left-0" :style="[scaledContainerStyle, {
        fontFamily: tabStyle?.fontFamily,
        backgroundColor: tabStyle?.backgroundColor
      }]">
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
                    :class="['h-full w-full transition-shadow', {'ring-2 ring-orange-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900': isSelected(item.i), 'cursor-pointer': !preview}]"
                    :ui="{ body: { padding: 'sm:p-2 p-2' } }"
                    :style="[getWidgetContainerStyle(item.i), {
                      backgroundColor: tabStyle?.chartBackground
                    }]"
                    @click.stop="!preview && handleSelectText(item.i)"
                >
                  <div class="mb-2">
                    <input
                        :value="findChartName(item.i)"
                        class="w-full !bg-transparent text-sm font-semibold px-0 py-0 focus:outline-none focus:ring-0 focus:border-transparent"
                        :readonly="preview"
                        @focus.stop="!preview && handleSelectText(item.i)"
                        @input="onChartNameInput(item.i, $event)"
                    />
                  </div>
                  <div class="h-full">
                    <DashboardChartRenderer
                        :state="findChartState(item.i)"
                        :config-override="findConfigOverride(item.i)"
                        :preloaded-columns="findChartColumns(item.i)"
                        :preloaded-rows="findChartRows(item.i)"
                        :dashboard-filters="dashboardFilters"
                        :tab-style="tabStyle"
                    />
                  </div>
                </UCard>
              </template>
              <template v-else-if="findWidget(item.i)?.type === 'text'">
                <div
                    class="h-full w-full relative rounded-md p-2"
                    :class="{'ring-2 ring-orange-400': isSelected(item.i), 'cursor-pointer': !preview}"
                    :style="getWidgetContainerStyle(item.i)"
                    @click.stop="!preview && handleSelectText(item.i)"
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
                    class="h-full w-full relative rounded-md overflow-hidden"
                    :class="{'ring-2 ring-orange-400': isSelected(item.i), 'cursor-pointer': !preview}"
                    :style="getWidgetContainerStyle(item.i)"
                    @click.stop="!preview && handleSelectText(item.i)"
                >
                  <DashboardImageWidget
                      :style-props="findWidgetStyle(item.i)"
                      :edit-mode="!preview"
                      class="h-full w-full"
                  />
                </div>
              </template>
              <template v-else-if="findWidget(item.i)?.type === 'icon'">
                <div
                    class="h-full w-full relative rounded-md overflow-hidden"
                    :class="{'ring-2 ring-orange-400': isSelected(item.i), 'cursor-pointer': !preview}"
                    :style="getWidgetContainerStyle(item.i)"
                    @click.stop="!preview && handleSelectText(item.i)"
                >
                  <DashboardIconWidget
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
  </div>
</template>

<script setup lang="ts">
import {DASHBOARD_WIDTH, DEVICE_PREVIEW_WIDTHS} from '~/lib/dashboard-constants'
import type {TabStyleOptions} from '~/types/tab-options'

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
  /** Whether to enable scaling to fit container (default: true for display, false for PDF rendering) */
  scalingEnabled?: boolean
  /** Custom dashboard width in pixels (defaults to DASHBOARD_WIDTH constant) */
  dashboardWidth?: number
  dashboardFilters?: Array<{
    fieldId: string
    table: string
    type: string
    operator: string
    value: any
    values?: any[]
  }>
  tabStyle?: TabStyleOptions
}

const props = withDefaults(defineProps<Props>(), {
  preview: false,
  scalingEnabled: true,
  dashboardFilters: () => [],
  tabStyle: () => ({})
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
  'deselect': []
}>()

// Container ref for measuring available width
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const dashboardHeight = ref(0)

// Measure container width on mount and resize
onMounted(() => {
  updateContainerWidth()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateContainerWidth)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateContainerWidth)
  }
})

function updateContainerWidth() {
  if (containerRef.value) {
    // Account for padding (p-3 = 12px on each side)
    containerWidth.value = containerRef.value.clientWidth - 24
  }
}

// Also update when container ref changes
watch(containerRef, () => {
  updateContainerWidth()
})

// Get the dashboard canvas width based on device and custom dashboard width
const previewWidth = computed(() => {
  if (props.device === 'mobile') return DEVICE_PREVIEW_WIDTHS.mobile
  if (props.device === 'tablet') return DEVICE_PREVIEW_WIDTHS.tablet
  return props.dashboardWidth || DASHBOARD_WIDTH
})

// Calculate scale factor to fit dashboard in available space
// Scales both up and down to fill the container without dead zones
const scale = computed(() => {
  if (!props.scalingEnabled || containerWidth.value === 0) return 1
  return containerWidth.value / previewWidth.value
})

// Style for the scaled dashboard container
// Position is set by template class (absolute), this just handles width and transform
const scaledContainerStyle = computed(() => {
  const s = scale.value
  // When scale is 1, no transform needed
  if (s === 1) {
    return {
      width: `${previewWidth.value}px`,
      zIndex: 20,
    }
  }
  // When scaling, set width to desired preview width but transform it
  return {
    width: `${previewWidth.value}px`,
    zIndex: 20,
    transform: `scale(${s})`,
    transformOrigin: 'top left',
  }
})

// Wrapper style to constrain the scaled content and prevent horizontal scroll
// The wrapper has explicit dimensions matching the visually scaled size
const wrapperStyle = computed(() => {
  const s = scale.value
  // Use 100% width of parent (which is constrained by CSS)
  // Height is auto to flow with content, but we use min-height for safety
  return {
    width: '100%',
    minHeight: '400px',
  }
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

// Helper to compute border style for widget wrappers
function getWidgetBorderStyle(i: string): Record<string, string> {
  const style = findWidgetStyle(i)
  const borderWidth = style.borderWidth ?? 0
  if (borderWidth <= 0) return {}

  const borderColor = style.borderColor || '#e5e7eb' // gray-200
  const borderStyle = style.borderStyle || 'solid'
  return {
    border: `${borderWidth}px ${borderStyle} ${borderColor}`
  }
}

// Helper to get combined container styles (edit mode indicator + custom border)
function getWidgetContainerStyle(i: string): Record<string, string> {
  const customBorder = getWidgetBorderStyle(i)

  // In edit mode (not preview), show thin dashed border as visual indicator
  // unless widget has a custom border
  if (!props.preview && !customBorder.border) {
    return {
      border: '1px dashed #d1d5db' // gray-300 thin dashed border
    }
  }

  return customBorder
}

// Handle click on container (empty space) to deselect widget
function handleContainerClick(e: MouseEvent) {
  // Only deselect in edit mode
  if (props.preview) return
  emit('deselect')
}

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
  console.log('[Dashboard.vue] onLayoutUpdated received from GridLayout:', newLayout?.length, 'items')
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
