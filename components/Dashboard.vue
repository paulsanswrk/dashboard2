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
            <UCard class="h-full w-full" :ui="{
              header: { base: 'bg-white dark:bg-gray-800', padding: 'sm:p-1 p-1' },
              body: { padding: 'sm:p-1 p-1' }
            }">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="font-medium text-center flex-1">{{ findChartName(item.i) }}</div>
                  <UDropdownMenu v-if="!preview" :items="getChartMenuItems(item.i)" :popper="{ placement: 'bottom-end' }">
                    <UButton
                        variant="ghost"
                        size="xs"
                        color="gray"
                        square
                    >
                      <Icon name="i-heroicons-ellipsis-vertical" class="w-4 h-4"/>
                    </UButton>
                  </UDropdownMenu>
                </div>
              </template>
              <div class="h-full">
                <DashboardChartRenderer :state="findChartState(item.i)" :preloaded-columns="findChartColumns(item.i)" :preloaded-rows="findChartRows(item.i)"/>
              </div>
            </UCard>
          </GridItem>
        </GridLayout>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Chart {
  chartId: number
  name: string
  position: any
  state?: any
  preloadedColumns?: any[]
  preloadedRows?: any[]
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
  charts: Chart[]
  loading: boolean
  preview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  preview: false
})

const emit = defineEmits<{
  'update:layout': [layout: any[]]
  'edit-chart': [chartId: string]
  'rename-chart': [chartId: string]
  'delete-chart': [chartId: string]
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

function findChartName(i: string) {
  const c = props.charts.find(c => String(c.chartId) === i)
  return c?.name || 'Chart'
}

function findChartState(i: string) {
  const c = props.charts.find(c => String(c.chartId) === i)
  return c?.state || {}
}

function findChartColumns(i: string) {
  const c = props.charts.find(c => String(c.chartId) === i)
  return c?.preloadedColumns || undefined
}

function findChartRows(i: string) {
  const c = props.charts.find(c => String(c.chartId) === i)
  return c?.preloadedRows || undefined
}

function handleEditChart(chartId: string) {
  emit('edit-chart', chartId)
}

function handleRenameChart(chartId: string) {
  emit('rename-chart', chartId)
}

function handleDeleteChart(chartId: string) {
  emit('delete-chart', chartId)
}


function getChartMenuItems(chartId: string) {
  return [
    [{
      label: 'Edit Chart',
      icon: 'i-heroicons-document-text',
      onClick: () => handleEditChart(chartId),
    }],
    [{
      label: 'Rename Chart',
      icon: 'i-heroicons-pencil',
      onClick: () => handleRenameChart(chartId)
    }],
    [{
      label: 'Delete Chart',
      icon: 'i-heroicons-trash',
      onClick: () => handleDeleteChart(chartId)
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
  min-height: 200px !important; /* Force min-height for grid items */
}

:deep(.vue-resizable-handle) {
  z-index: 10; /* Ensure resizer is visible */
}
</style>
