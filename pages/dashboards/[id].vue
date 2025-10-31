<template>
  <div class="p-4 lg:p-6 space-y-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UInput v-model="dashboardName" class="w-72" />
        <UButton color="orange" variant="solid" :loading="saving" @click="save">Save Dashboard</UButton>
      </div>
      <div class="flex items-center gap-2">
        <UButton :variant="device==='desktop'?'solid':'outline'" color="orange" size="xs" @click="setDevice('desktop')">Desktop</UButton>
        <UButton :variant="device==='tablet'?'solid':'outline'" color="orange" size="xs" @click="setDevice('tablet')">Tablet</UButton>
        <UButton :variant="device==='mobile'?'solid':'outline'" color="orange" size="xs" @click="setDevice('mobile')">Mobile</UButton>
        <UButton variant="outline" color="blue" size="xs" @click="autoLayout">
          <Icon name="heroicons:arrows-pointing-out" class="w-4 h-4 mr-1" />
          Auto Layout
        </UButton>
      </div>
    </div>

    <!-- Debug Panel (only shown when DEBUG_ENV=true) -->
    <ClientOnly>
      <div v-if="debugEnv" class="debug-panel border rounded bg-neutral-50 dark:bg-neutral-800 p-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium text-xs flex items-center gap-2">
          <Icon name="heroicons:beaker" class="w-3 h-3 text-orange-500" />
          GridLayout Debug
        </h3>
        <UButton
          variant="ghost"
          size="xs"
          color="gray"
          @click="debugPanelOpen = !debugPanelOpen"
        >
          <Icon :name="debugPanelOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-3 h-3" />
        </UButton>
      </div>

      <div v-if="debugPanelOpen" class="space-y-3">
        <!-- Basic Layout Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Basic Layout</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns</label>
              <UInput v-model.number="gridConfig.colNum" type="number" size="sm" min="1" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Row Height</label>
              <UInput v-model.number="gridConfig.rowHeight" type="number" size="sm" min="1" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Rows</label>
              <UInput v-model="maxRowsInput" type="number" size="sm" min="1" placeholder="Infinity" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Margin [x,y]</label>
              <div class="flex gap-1">
                <UInput v-model.number="gridConfig.margin[0]" type="number" size="sm" placeholder="x" min="0" />
                <UInput v-model.number="gridConfig.margin[1]" type="number" size="sm" placeholder="y" min="0" />
              </div>
            </div>
          </div>
        </div>

        <!-- Behavior Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Behavior</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Draggable</label>
              <UCheckbox v-model="gridConfig.isDraggable" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resizable</label>
              <UCheckbox v-model="gridConfig.isResizable" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mirrored (RTL)</label>
              <UCheckbox v-model="gridConfig.isMirrored" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bounded</label>
              <UCheckbox v-model="gridConfig.isBounded" />
            </div>
          </div>
        </div>

        <!-- Layout Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Auto Size</label>
              <UCheckbox v-model="gridConfig.autoSize" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vertical Compact</label>
              <UCheckbox v-model="gridConfig.verticalCompact" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Restore on Drag</label>
              <UCheckbox v-model="gridConfig.restoreOnDrag" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prevent Collision</label>
              <UCheckbox v-model="gridConfig.preventCollision" />
            </div>
          </div>
        </div>

        <!-- Performance Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Performance</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CSS Transforms</label>
              <UCheckbox v-model="gridConfig.useCssTransforms" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Style Cursor</label>
              <UCheckbox v-model="gridConfig.useStyleCursor" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transform Scale</label>
              <UInput v-model.number="gridConfig.transformScale" type="number" size="sm" step="0.1" min="0.1" />
            </div>
          </div>
        </div>

        <!-- Responsive Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Responsive</h4>
          <div class="space-y-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsive</label>
              <UCheckbox v-model="gridConfig.responsive" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Breakpoints</label>
                <UTextarea
                  v-model="breakpointsJson"
                  :rows="2"
                  size="sm"
                  monospace
                  placeholder='{"lg": 1200, "md": 996, "sm": 768, "xs": 480, "xxs": 0}'
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns per Breakpoint</label>
                <UTextarea
                  v-model="colsJson"
                  :rows="2"
                  size="sm"
                  monospace
                  placeholder='{"lg": 12, "md": 10, "sm": 6, "xs": 4, "xxs": 2}'
                />
              </div>
            </div>
          </div>
        </div>

        <!-- JSON Editor for gridLayout -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout Data</h4>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Grid Layout JSON</label>
          <UTextarea
            v-model="gridLayoutJson"
            :rows="6"
            size="sm"
            monospace
            @input="updateGridLayoutFromJson"
            placeholder="Edit the grid layout as JSON..."
          />
        </div>

        <!-- Current Layout Info -->
        <div class="text-xs text-gray-600 dark:text-gray-400 border-t pt-2">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="font-medium mb-1">Layout Stats</div>
              <div>Items: {{ gridLayout.length }}</div>
              <div>Total Width: {{ gridLayout.reduce((sum, item) => sum + item.w, 0) }}</div>
              <div>Max Height: {{ gridLayout.length ? Math.max(...gridLayout.map(item => item.y + item.h)) : 0 }}</div>
            </div>
            <div>
              <div class="font-medium mb-1">Config Summary</div>
              <div>Responsive: {{ gridConfig.responsive ? 'Yes' : 'No' }}</div>
              <div>Draggable: {{ gridConfig.isDraggable ? 'Yes' : 'No' }}</div>
              <div>Resizable: {{ gridConfig.isResizable ? 'Yes' : 'No' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ClientOnly>

    <!-- Rename Chart Modal -->
    <UModal v-model="showRenameModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Rename Chart</h3>
        </template>
        <UForm :state="renameForm" @submit="renameChart">
          <UFormGroup label="New Chart Name" name="newName">
            <UInput v-model="renameForm.newName" />
          </UFormGroup>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" @click="showRenameModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" :loading="renaming">Rename</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>

    <!-- Delete Chart Confirmation Modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">Delete Chart</h3>
        </template>
        <div class="space-y-4">
          <p>Are you sure you want to delete the chart "<strong>{{ chartToDeleteName }}</strong>"?</p>
          <p class="text-sm text-gray-600">This action cannot be undone. The chart will be removed from this dashboard but will still be available in your saved charts.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="red" :loading="deleting" @click="deleteChart">Delete</UButton>
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Add Chart Modal -->
    <UModal v-model="showAddChartModal" size="2xl">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add Chart to Dashboard</h3>
        </template>
        <div class="space-y-4">
          <div v-if="availableCharts.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="heroicons:chart-bar" class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No saved charts available</p>
            <p class="text-sm">Create charts in the Report Builder first</p>
          </div>
          <div v-else class="max-h-96 overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UCard
                v-for="chart in availableCharts"
                :key="chart.id"
                class="cursor-pointer hover:border-orange-300 transition-colors"
                @click="addChartToDashboard(chart.id)"
              >
                <div class="font-medium">{{ chart.name }}</div>
                <div class="text-sm text-gray-500">{{ chart.description || 'No description' }}</div>
                <div class="text-xs text-gray-400 mt-2">Type: {{ chart.state_json?.chartType || 'Unknown' }}</div>
              </UCard>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showAddChartModal = false">Cancel</UButton>
          </div>
        </div>
      </UCard>
    </UModal>

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
          v-model:layout="gridLayout"
          :col-num="gridConfig.colNum"
          :row-height="gridConfig.rowHeight"
          :max-rows="gridConfig.maxRows"
          :margin="gridConfig.margin"
          :is-draggable="gridConfig.isDraggable"
          :is-resizable="gridConfig.isResizable"
          :is-mirrored="gridConfig.isMirrored"
          :is-bounded="gridConfig.isBounded"
          :auto-size="gridConfig.autoSize"
          :vertical-compact="gridConfig.verticalCompact"
          :restore-on-drag="gridConfig.restoreOnDrag"
          :prevent-collision="gridConfig.preventCollision"
          :use-css-transforms="gridConfig.useCssTransforms"
          :use-style-cursor="gridConfig.useStyleCursor"
          :transform-scale="gridConfig.transformScale"
          :responsive="gridConfig.responsive"
          :breakpoints="gridConfig.breakpoints"
          :cols="gridConfig.cols"
          @layout-updated="onLayoutUpdated"
        >
            <GridItem v-for="item in gridLayout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i">
              <UCard class="h-full w-full" :ui="{
                header: { base: 'bg-white dark:bg-gray-800', padding: 'sm:p-1 p-1' },
                body: { padding: 'sm:p-1 p-1' }
              }">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="font-medium text-center flex-1">{{ findChartName(item.i) }}</div>
                    <UDropdown :items="getChartMenuItems(item.i)" :popper="{ placement: 'bottom-end' }">
                      <UButton
                        variant="ghost"
                        size="xs"
                        color="gray"
                        square
                      >
                        <Icon name="heroicons:ellipsis-vertical" class="w-4 h-4" />
                      </UButton>
                    </UDropdown>
                  </div>
                </template>
              <div class="h-full">
                <DashboardChartRenderer :state="findChartState(item.i)" :preloaded-columns="findChartColumns(item.i)" :preloaded-rows="findChartRows(item.i)" />
              </div>
            </UCard>
          </GridItem>
        </GridLayout>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const id = computed(() => String(route.params.id))

// Set page title
useHead({
  title: 'Edit Dashboard'
})

// Debug environment flag for development
const { public: { debugEnv: runtimeDebugEnv } } = useRuntimeConfig()
const debugEnv = ref<boolean>(false)

onMounted(() => {
  if (typeof window === 'undefined') return
  // Initialize once; preserve existing global if already set
  if (!('__DEBUG_ENV__' in (window as any))) {
    ;(window as any).__DEBUG_ENV__ = runtimeDebugEnv === 'true'
  }
  debugEnv.value = (window as any).__DEBUG_ENV__ === true
})

const { getDashboardFull, updateDashboard, createDashboardReport } = useDashboardsService()
const { listCharts, updateChart, deleteChart: deleteChartApi } = useChartsService()

const dashboardName = ref('')
const charts = ref<Array<{ chartId: number; name: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }>>([])
const gridLayout = ref<any[]>([])
const loading = ref(true)

// Modal states
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showAddChartModal = ref(false)

// Rename functionality
const renamingChart = ref<string | null>(null)
const renameForm = reactive({
  newName: ''
})
const renaming = ref(false)

// Delete functionality
const chartToDelete = ref<string | null>(null)
const chartToDeleteName = ref('')
const deleting = ref(false)

// Available charts for adding
const availableCharts = ref<Array<{ id: number; name: string; description?: string; state_json: any }>>([])
const loadingCharts = ref(false)

// Debug panel state
const debugPanelOpen = ref(false)
const gridConfig = reactive({
  // Basic layout properties
  colNum: 12,
  rowHeight: 30,
  maxRows: Infinity,
  margin: [20, 20], // Increased margins for more spacing between blocks

  // Behavior properties
  isDraggable: true,
  isResizable: true,
  isMirrored: false,
  isBounded: false,

  // Layout properties
  autoSize: true,
  verticalCompact: true,
  restoreOnDrag: false,
  preventCollision: false,

  // Performance properties
  useCssTransforms: true,
  useStyleCursor: true,
  transformScale: 1,

  // Responsive properties
  responsive: true, // Enable responsive layout
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
})

const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')

const previewWidth = computed(() => {
  if (device.value === 'mobile') return 390
  if (device.value === 'tablet') return 768
  return 1600 // Increased from 1200px for better chart readability with 12 columns
})

// Calculate the left overlay width for the device preview indicator
const leftOverlayWidth = computed(() => {
  // The container has p-3 (12px) padding on each side, so inner width is containerWidth - 24px
  // The preview is centered, so left overlay = (innerWidth - previewWidth) / 2
  // But since we're using flexbox within the padded area, we can use percentages
  return `calc((100% - ${previewWidth.value}px) / 2)`
})

function setDevice(d: 'desktop' | 'tablet' | 'mobile') {
  device.value = d
}

function autoLayout() {
  // Reset all block widths to a standard width and arrange sequentially left-to-right, top-to-bottom
  const colNum = gridConfig.colNum

  // Sort items by their current y position to maintain some order, then reset positions
  const sortedItems = [...gridLayout.value].sort((a, b) => a.y - b.y || a.x - b.x)

  let currentX = 0
  let currentY = 0
  let maxHeightInRow = 0

  sortedItems.forEach((item) => {
    // Set width to a reasonable default (6 columns for a balanced layout, but not exceeding grid width)
    const defaultWidth = Math.min(6, colNum)
    item.w = Math.max(1, Math.min(defaultWidth, colNum)) // Ensure width is at least 1 and at most colNum

    // Set height to a reasonable default if not set
    if (!item.h || item.h < 1) {
      item.h = 8 // Default height
    }

    // Check if this item fits in current row
    if (currentX + item.w > colNum) {
      // Move to next row
      currentX = 0
      currentY += maxHeightInRow
      maxHeightInRow = 0
    }

    // Set position
    item.x = currentX
    item.y = currentY

    // Track the maximum height in the current row
    maxHeightInRow = Math.max(maxHeightInRow, item.h)

    // Move to next position
    currentX += item.w
  })
}

function fromPositions() {
  gridLayout.value = charts.value.map(c => ({
    x: c.position?.x ?? 0,
    y: c.position?.y ?? 0,
    w: c.position?.w ?? 4,
    h: c.position?.h ?? 8, // Default to 8 rows (240px) for auto-height behavior
    i: String(c.chartId)
  }))
}

function toPositions() {
  return gridLayout.value.map((li: any) => ({ chartId: Number(li.i), position: { x: li.x, y: li.y, w: li.w, h: li.h } }))
}

function findChartName(i: string) {
  const c = charts.value.find(c => String(c.chartId) === i)
  return c?.name || 'Chart'
}

function findChartState(i: string) {
  const c = charts.value.find(c => String(c.chartId) === i)
  return c?.state || {}
}

function findChartColumns(i: string) {
  const c = charts.value.find(c => String(c.chartId) === i)
  return c?.preloadedColumns || undefined
}

function findChartRows(i: string) {
  const c = charts.value.find(c => String(c.chartId) === i)
  return c?.preloadedRows || undefined
}

function editChart(chartId: string) {
  navigateTo(`/reporting/builder?chartId=${chartId}&dashboard_id=${id.value}`)
}

function getChartMenuItems(chartId: string) {
  return [
    [{
      label: 'Edit Chart',
      icon: 'heroicons:document-text',
      click: () => editChart(chartId)
    }],
    [{
      label: 'Rename Chart',
      icon: 'heroicons:pencil',
      disabled: renamingChart.value === chartId,
      click: () => startRenameChart(chartId)
    }],
    [{
      label: 'Delete Chart',
      icon: 'heroicons:trash',
      click: () => confirmDeleteChart(chartId)
    }]
  ]
}

async function load() {
  loading.value = true
  try {
    const res = await getDashboardFull(id.value)
    dashboardName.value = res.name
    charts.value = (res.charts || []).map((c: any) => ({
      chartId: c.id,
      name: c.name,
      position: c.position,
      state: c.state,
      preloadedColumns: c.data?.columns,
      preloadedRows: c.data?.rows
    }))
    fromPositions()
  } finally {
    loading.value = false
  }
}

onMounted(load)

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await updateDashboard({
      id: id.value,
      name: dashboardName.value,
      layout: toPositions()
    })
  } finally {
    saving.value = false
  }
}

function onLayoutUpdated() {
  // no-op, local state is already updated via v-model
}

// Chart operations
async function startRenameChart(chartId: string) {
  const chart = charts.value.find(c => String(c.chartId) === chartId)
  if (!chart) return

  renamingChart.value = chartId
  renameForm.newName = chart.name
  showRenameModal.value = true
}

async function renameChart() {
  if (!renamingChart.value) return

  renaming.value = true
  try {
    await updateChart({
      id: Number(renamingChart.value),
      name: renameForm.newName
    })

    // Update local state
    const chart = charts.value.find(c => String(c.chartId) === renamingChart.value)
    if (chart) {
      chart.name = renameForm.newName
    }

    showRenameModal.value = false
    renamingChart.value = null
    renameForm.newName = ''
  } finally {
    renaming.value = false
  }
}

async function confirmDeleteChart(chartId: string) {
  const chart = charts.value.find(c => String(c.chartId) === chartId)
  if (!chart) return

  chartToDelete.value = chartId
  chartToDeleteName.value = chart.name
  showDeleteModal.value = true
}

async function deleteChart() {
  if (!chartToDelete.value) return

  deleting.value = true
  try {
    await deleteChartApi(Number(chartToDelete.value))

    // Remove from local state
    const chartIndex = charts.value.findIndex(c => String(c.chartId) === chartToDelete.value)
    if (chartIndex >= 0) {
      charts.value.splice(chartIndex, 1)
      fromPositions() // Update grid layout
    }

    showDeleteModal.value = false
    chartToDelete.value = null
    chartToDeleteName.value = ''
  } finally {
    deleting.value = false
  }
}

async function openAddChartModal() {
  loadingCharts.value = true
  showAddChartModal.value = true

  try {
    const allCharts = await listCharts()
    // Filter out charts that are already on this dashboard
    const dashboardChartIds = new Set(charts.value.map(c => c.chartId))
    availableCharts.value = allCharts.filter(chart => !dashboardChartIds.has(chart.id))
  } finally {
    loadingCharts.value = false
  }
}

async function addChartToDashboard(chartId: number) {
  try {
    // Find the chart details
    const chart = availableCharts.value.find(c => c.id === chartId)
    if (!chart) return

    // Add to dashboard with default position
    const newPosition = { x: 0, y: Math.max(...gridLayout.value.map(item => item.y + item.h), 0), w: 6, h: 8 }

    await createDashboardReport({
      dashboardId: id.value,
      chartId: chartId,
      position: newPosition
    })

    // Add to local state and reload to get full data
    await load()

    showAddChartModal.value = false
  } catch (error) {
    console.error('Failed to add chart to dashboard:', error)
  }
}

// Debug functions
const gridLayoutJson = computed({
  get: () => JSON.stringify(gridLayout.value, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        gridLayout.value = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

const breakpointsJson = computed({
  get: () => JSON.stringify(gridConfig.breakpoints, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        gridConfig.breakpoints = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

const colsJson = computed({
  get: () => JSON.stringify(gridConfig.cols, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        gridConfig.cols = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

// Handle maxRows Infinity input
const maxRowsInput = computed({
  get: () => gridConfig.maxRows === Infinity ? '' : gridConfig.maxRows,
  set: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value
    gridConfig.maxRows = isNaN(numValue) || value === '' ? Infinity : numValue
  }
})

function updateGridLayoutFromJson() {
  // The computed property setter handles this
}
</script>

<style scoped>
:deep(.vue-grid-layout) { min-height: 300px; }

:deep(.vue-grid-item) {
  min-height: 200px !important; /* Force min-height for grid items */
}

:deep(.vue-resizable-handle) {
  z-index: 10; /* Ensure resizer is visible */
}

/* Make all textareas in debug panel resizable */
:deep(.debug-panel textarea) {
  resize: both;
  min-height: 60px;
  max-height: 400px;
}

</style>


