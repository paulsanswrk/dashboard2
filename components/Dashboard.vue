<template>
  <div 
    ref="containerRef" 
    class="relative w-full bg-white dark:bg-gray-900" 
    :class="{'border rounded': !preview}" 
    @click="handleContainerClick"
    @mousemove="handleGlobalMouseMove"
    @mouseup="handleGlobalMouseUp"
    @mouseleave="handleGlobalMouseUp"
  >
    <!-- Device width indicator overlay - only show for tablet/mobile -->
    <div v-if="!loading && device !== 'desktop'" class="absolute inset-0 pointer-events-none z-10 flex px-3">
      <!-- Left overlay -->
      <div
          class="bg-black/5"
          :style="{ width: leftOverlayWidth }"
      ></div>
      <!-- Center transparent area (for preview content) -->
      <div
          class="flex-shrink-0"
          :style="{ width: canvasWidth + 'px' }"
      ></div>
      <!-- Right overlay (mirrors left) -->
      <div
          class="bg-black/5"
          :style="{ width: leftOverlayWidth }"
      ></div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      <span class="ml-3 text-gray-500">Loading dashboard...</span>
    </div>

    <!-- Wrapper sets the canvas at its natural pixel width; horizontal scroll handles overflow -->
    <div v-else class="relative" :style="wrapperStyle">
      <div 
        :class="{'edit-mode-grid': !preview}"
        :style="[canvasStyle, {
          fontFamily: tabStyle?.fontFamily,
          backgroundColor: tabStyle?.backgroundColor || undefined
        }]"
        @contextmenu.prevent="handleCanvasOrWidgetContextMenu($event)"
      >
        <!-- Widget Container -->
        <div class="relative w-full h-full p-3">

          <div 
            v-for="item in layout" 
            :key="item.i"
            :data-widget-id="item.i"
            class="absolute transition-shadow transition-[border-color] dashboard-widget"
            :class="{
              'ring-2 ring-blue-500': isSelected(item.i),
              'hover:ring-1 hover:ring-gray-300': !isSelected(item.i) && !preview,
              'cursor-move': !preview && !isResizing
            }"
            :style="{
              left: `${item.left}px`,
              top: `${item.top}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              zIndex: isSelected(item.i) ? 1000 : layout.indexOf(item) + 1
            }"
            @mousedown="!preview && handleWidgetMouseDown($event, item.i)"
            @contextmenu.prevent="!preview && handleWidgetContextMenu($event, item.i)"
          >
            <!-- Selection Highlight & Handles -->
            <template v-if="isSelected(item.i) && !preview">
              <!-- 8 Resize Handles -->
              <div v-for="h in RESIZE_HANDLES" :key="h"
                :class="['resize-handle', `handle-${h}`]"
                @mousedown.stop="handleResizeMouseDown($event, item.i, h)"
              ></div>
            </template>

            <!-- Widget Content -->
            <template v-if="findWidget(item.i)?.type === 'chart'">
              <UCard
                  class="h-full w-full pointer-events-auto"
                  :ui="getChartCardUi(item.i)"
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
                      :dashboard-id="dashboardId"
                      :chart-id="findChartId(item.i)"
                      :data-status="findDataStatus(item.i)"
                      :preloaded-columns="findPreloadedColumns(item.i)"
                      :preloaded-rows="findPreloadedRows(item.i)"
                      :dashboard-filters="dashboardFilters"
                      :tab-style="tabStyle"
                  />
                </div>
              </UCard>
            </template>
            <template v-else-if="findWidget(item.i)?.type === 'text'">
              <div
                  class="h-full w-full relative rounded-md p-2 pointer-events-auto"
                  :class="{'ring-2 ring-blue-500': isSelected(item.i)}"
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
                  class="h-full w-full relative rounded-md overflow-hidden pointer-events-auto"
                  :class="{'ring-2 ring-blue-500': isSelected(item.i)}"
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
                  class="h-full w-full relative rounded-md overflow-hidden pointer-events-auto"
                  :class="{'ring-2 ring-blue-500': isSelected(item.i)}"
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
              <div class="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded">
                Unsupported widget
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {DASHBOARD_WIDTH, DEVICE_PREVIEW_WIDTHS} from '~/lib/dashboard-constants'
import type {TabStyleOptions} from '~/types/tab-options'

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const
type ResizeDir = typeof RESIZE_HANDLES[number]

interface Widget {
  widgetId: string
  type: 'chart' | 'text' | 'image' | 'icon'
  chartId?: number
  name?: string
  position: any
  state?: any
  style?: any
  configOverride?: any
  dataStatus?: 'cached' | 'pending'
  preloadedColumns?: Array<{ key: string; label: string }>
  preloadedRows?: Array<Record<string, unknown>>
}

interface Props {
  device?: 'desktop' | 'tablet' | 'mobile'
  layout?: any[]
  widgets?: Widget[]
  loading?: boolean
  preview?: boolean
  selectedTextId?: string
  dashboardWidth?: number
  dashboardFilters?: any[]
  tabStyle?: TabStyleOptions
  dashboardId?: string
}

const props = withDefaults(defineProps<Props>(), {
  device: 'desktop',
  layout: () => [],
  widgets: () => [],
  loading: false,
  preview: false,
  dashboardFilters: () => [],
  tabStyle: () => ({}),
  dashboardId: undefined
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
  'context-menu': [payload: { widgetId: string; x: number; y: number }]
  'canvas-context-menu': [payload: { x: number; y: number }]
}>()

// Interaction State
const isDragging = ref(false)
const isResizing = ref(false)
const activeWidgetId = ref<string | null>(null)
const resizeDir = ref<ResizeDir | null>(null)
const startMouseX = ref(0)
const startMouseY = ref(0)
const startWidgetPos = ref({ left: 0, top: 0, width: 0, height: 0 })

// Container ref (kept for click-outside handling)
const containerRef = ref<HTMLElement | null>(null)

const canvasWidth = computed(() => {
  if (props.device === 'mobile') return DEVICE_PREVIEW_WIDTHS.mobile
  if (props.device === 'tablet') return DEVICE_PREVIEW_WIDTHS.tablet
  return props.dashboardWidth || DASHBOARD_WIDTH
})

const DASHBOARD_MIN_HEIGHT = 2000

const calculatedHeight = computed(() => {
  const maxY = props.layout.reduce((acc, item) => Math.max(acc, item.top + item.height), 0)
  if (props.preview) {
    // Add a small buffer for shadows or tight borders, but much smaller than edit mode
    return Math.max(10, maxY + 40)
  }
  return Math.max(DASHBOARD_MIN_HEIGHT, maxY + 100)
})

const canvasStyle = computed(() => {
  const style: any = {
    width: `${canvasWidth.value}px`,
    minWidth: `${canvasWidth.value}px`,
    zIndex: 20,
    border: (!props.preview) ? '1px solid #e5e7eb' : 'none'
  }

  if (props.preview) {
    style.height = `${calculatedHeight.value}px`
  } else {
    style.minHeight = `${calculatedHeight.value}px`
  }

  return style
})

const wrapperStyle = computed(() => {
  return {
    minWidth: `${canvasWidth.value}px`,
    height: `${calculatedHeight.value}px`,
  }
})

const leftOverlayWidth = computed(() => `calc((100% - ${canvasWidth.value}px) / 2)`)

// Widget Helpers
function findWidget(i: string): Widget | undefined {
  return props.widgets.find((w) => String(w.widgetId) === i)
}
const findChartName = (i: string) => findWidget(i)?.name || 'Chart'
const findChartState = (i: string) => findWidget(i)?.state || {}
const findChartId = (i: string) => findWidget(i)?.chartId
const findWidgetStyle = (i: string) => findWidget(i)?.style || {}
const findConfigOverride = (i: string) => findWidget(i)?.configOverride || {}
const findPreloadedColumns = (i: string) => findWidget(i)?.preloadedColumns
const findPreloadedRows = (i: string) => findWidget(i)?.preloadedRows
const findDataStatus = (i: string) => findWidget(i)?.dataStatus

function getWidgetContainerStyle(i: string): Record<string, string> {
  const widget = findWidget(i)
  const style = widget?.style || {}
  const widgetType = widget?.type
  
  const res: Record<string, string> = {}
  
  // For icon widgets, only apply border if explicitly set by user
  // Icons typically should not have container borders
  if (widgetType === 'icon') {
    if (style.borderWidth && style.borderWidth > 0) {
      const borderColor = style.borderColor || '#e5e7eb'
      const borderStyle = style.borderStyle || 'solid'
      res.border = `${style.borderWidth}px ${borderStyle} ${borderColor}`
    } else if (props.preview) {
      // In preview/PDF mode, explicitly set no border
      res.border = 'none'
    }
    // In edit mode, show dashed border as guide when no border is set
    if (!props.preview && !isSelected(i) && (!style.borderWidth || style.borderWidth === 0)) {
      res.border = '1px dashed #d1d5db'
    }
    return res
  }
  
  // For other widget types, apply default 1px border
  let borderWidth = style.borderWidth ?? 1
  const borderColor = style.borderColor || '#e5e7eb'
  const borderStyle = style.borderStyle || 'solid'
  
  // If borderWidth is 0, we'll still use 1px as a workaround for PDF consistency
  if (borderWidth === 0) borderWidth = 1

  res.border = `${borderWidth}px ${borderStyle} ${borderColor}`

  // Apply dashed border only in edit mode when not selected (as a visual guide)
  if (!props.preview && !isSelected(i) && style.borderWidth === 0) {
    res.border = '1px dashed #d1d5db'
  }
  
  return res
}

function getChartCardUi(i: string) {
  const style = findWidgetStyle(i)
  // We're now defaulting to 1px, so borderWidth should effectively be at least 1
  const borderWidth = style.borderWidth ?? 1
  
  // Base padding config
  const ui: any = {
    body: { padding: 'sm:p-2 p-2' }
  }
  
  // Always remove default Nuxt UI styling so our custom border logic applies cleanly
  ui.ring = ''
  ui.shadow = ''
  ui.divide = ''
  // Keep rounded as it usually comes from our style_json anyway
  
  return ui
}

function handleContainerClick() {
  if (props.preview || isDragging.value || isResizing.value) return
  emit('deselect')
}

function isSelected(widgetId: string) {
  return props.selectedTextId != null && props.selectedTextId === widgetId
}

// Global Mouse Handlers
function handleGlobalMouseMove(e: MouseEvent) {
  if (!isDragging.value && !isResizing.value) return
  
  const dx = e.clientX - startMouseX.value
  const dy = e.clientY - startMouseY.value
  
  const item = props.layout.find(i => i.i === activeWidgetId.value)
  if (!item) return

  if (isDragging.value) {
    item.left = Math.round(startWidgetPos.value.left + dx)
    item.top = Math.round(startWidgetPos.value.top + dy)
  } else if (isResizing.value && resizeDir.value) {
    const minSize = 40
    const dir = resizeDir.value
    
    if (dir.includes('e')) {
      item.width = Math.max(minSize, Math.round(startWidgetPos.value.width + dx))
    }
    if (dir.includes('s')) {
      item.height = Math.max(minSize, Math.round(startWidgetPos.value.height + dy))
    }
    if (dir.includes('w')) {
      const newWidth = Math.max(minSize, startWidgetPos.value.width - dx)
      if (newWidth > minSize) {
        item.width = Math.round(newWidth)
        item.left = Math.round(startWidgetPos.value.left + dx)
      }
    }
    if (dir.includes('n')) {
      const newHeight = Math.max(minSize, startWidgetPos.value.height - dy)
      if (newHeight > minSize) {
        item.height = Math.round(newHeight)
        item.top = Math.round(startWidgetPos.value.top + dy)
      }
    }
  }
}

function handleGlobalMouseUp() {
  if (isDragging.value || isResizing.value) {
    emit('update:layout', [...props.layout])
  }
  isDragging.value = false
  isResizing.value = false
  activeWidgetId.value = null
  resizeDir.value = null
}

// Drag & Resize Start
function handleWidgetMouseDown(e: MouseEvent, widgetId: string) {
  if (props.preview) return
  
  // If clicking on a handle, let the handle logic take over
  if ((e.target as HTMLElement).classList.contains('resize-handle')) return

  isDragging.value = true
  activeWidgetId.value = widgetId
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY
  
  const item = props.layout.find(i => i.i === widgetId)
  if (item) {
    startWidgetPos.value = { 
      left: item.left, 
      top: item.top, 
      width: item.width, 
      height: item.height 
    }
  }
  
  emit('select-text', widgetId)
}

function handleResizeMouseDown(e: MouseEvent, widgetId: string, dir: ResizeDir) {
  isResizing.value = true
  activeWidgetId.value = widgetId
  resizeDir.value = dir
  startMouseX.value = e.clientX
  startMouseY.value = e.clientY
  
  const item = props.layout.find(i => i.i === widgetId)
  if (item) {
    startWidgetPos.value = { 
      left: item.left, 
      top: item.top, 
      width: item.width, 
      height: item.height 
    }
  }
}

function handleUpdateTextContent(widgetId: string, content: string) {
  emit('update-text-content', widgetId, content)
}

function onChartNameInput(widgetId: string, e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('rename-chart-inline', widgetId, value)
}

function handleSelectText(widgetId: string) {
  emit('select-text', widgetId)
}

function handleWidgetContextMenu(e: MouseEvent, widgetId: string) {
  // Stop propagation so the canvas handler doesn't also fire
  e.stopPropagation()
  emit('select-text', widgetId)
  emit('context-menu', { widgetId, x: e.clientX, y: e.clientY })
}

function handleCanvasOrWidgetContextMenu(e: MouseEvent) {
  if (props.preview) return
  // Check if the click target is inside a widget
  const target = e.target as HTMLElement
  if (target.closest('.dashboard-widget')) return // widget handler already fired via stopPropagation
  emit('canvas-context-menu', { x: e.clientX, y: e.clientY })
}
</script>

<style scoped>
.edit-mode-grid {
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
}

.dark .edit-mode-grid {
  background-image: radial-gradient(#374151 1px, transparent 1px);
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #3b82f6; /* blue-500 */
  border: 1px solid white;
  z-index: 40;
}

.handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
.handle-n { top: -4px; left: calc(50% - 4px); cursor: n-resize; }
.handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
.handle-w { top: calc(50% - 4px); left: -4px; cursor: w-resize; }
.handle-e { top: calc(50% - 4px); right: -4px; cursor: e-resize; }
.handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
.handle-s { bottom: -4px; left: calc(50% - 4px); cursor: s-resize; }
.handle-se { bottom: -4px; right: -4px; cursor: se-resize; }

/* Pointer events management */
:deep(.dashboard-chart-renderer) {
  pointer-events: none;
}
</style>
