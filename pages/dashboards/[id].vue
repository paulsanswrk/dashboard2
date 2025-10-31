<template>
  <div class="p-4 lg:p-6 space-y-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UInput v-model="dashboardName" class="w-72" />
        <UButton color="orange" variant="solid" :loading="saving" @click="save">Save</UButton>
      </div>
      <div class="flex items-center gap-2">
        <UButton :variant="device==='desktop'?'solid':'outline'" color="orange" size="xs" @click="setDevice('desktop')">Desktop</UButton>
        <UButton :variant="device==='tablet'?'solid':'outline'" color="orange" size="xs" @click="setDevice('tablet')">Tablet</UButton>
        <UButton :variant="device==='mobile'?'solid':'outline'" color="orange" size="xs" @click="setDevice('mobile')">Mobile</UButton>
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

    <div class="border rounded bg-white dark:bg-gray-900 p-3 overflow-auto">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span class="ml-3 text-gray-500">Loading dashboard...</span>
      </div>
      <div v-else :style="{ width: previewWidth + 'px', margin: '0 auto' }">
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
                    <div class="font-medium">{{ findChartName(item.i) }}</div>
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

// Debug environment flag for development
const { public: { debugEnv: runtimeDebugEnv } } = useRuntimeConfig()
const debugEnv = ref<boolean>(false)

watchEffect(() => {
  if (typeof window !== 'undefined') {
    // Set global debug flag if not already set
    if (!(window as any).__DEBUG_ENV__) {
      ;(window as any).__DEBUG_ENV__ = runtimeDebugEnv === 'true'
    }
    debugEnv.value = (window as any).__DEBUG_ENV__ === true
  }
})

const { getDashboardFull, updateDashboard } = useDashboardsService()

const dashboardName = ref('')
const charts = ref<Array<{ chartId: number; name: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }>>([])
const gridLayout = ref<any[]>([])
const loading = ref(true)

// Debug panel state
const debugPanelOpen = ref(false)
const gridConfig = reactive({
  // Basic layout properties
  colNum: 12,
  rowHeight: 30,
  maxRows: Infinity,
  margin: [10, 10],

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
  responsive: false,
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
})

const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const previewWidth = computed(() => {
  if (device.value === 'mobile') return 390
  if (device.value === 'tablet') return 768
  return 'auto'
})

function setDevice(d: 'desktop' | 'tablet' | 'mobile') {
  device.value = d
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

/* Make all textareas in debug panel resizable */
:deep(.debug-panel textarea) {
  resize: both;
  min-height: 60px;
  max-height: 400px;
}

</style>


