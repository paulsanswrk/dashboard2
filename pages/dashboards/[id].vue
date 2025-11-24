<template>
  <div class="p-4 lg:p-6 space-y-4">
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-1 px-1 py-2">
        <!-- Tabs -->
        <div class="flex items-center gap-1 flex-1 overflow-x-auto">
          <button
              v-for="(tab, index) in tabs"
              :key="tab.id"
              @click="selectTab(tab.id)"
              :class="[
              'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer',
              activeTabId === tab.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]"
          >
            <span>{{ tab.name }}</span>

            <!-- Dropdown menu for tab actions -->
            <UDropdownMenu
                :items="getTabMenuItems(tab)"
                :popper="{ placement: 'bottom-end' }"
            >
              <UButton
                  variant="ghost"
                  size="xs"
                  class="p-0 h-4 w-4 opacity-70 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                  title="Tab options"
                  @click.stop
              >
                <Icon name="i-heroicons-chevron-down" class="w-3 h-3"/>
              </UButton>
            </UDropdownMenu>
          </button>

          <!-- Add Tab Button (just + icon) -->
          <button
              @click="showCreateTabModal = true"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer border-b-2 border-transparent"
              title="Add new tab"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4"/>
          </button>
        </div>

        <!-- Toolbar inside tab area -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <UInput v-model="dashboardName" class="w-72"/>
            <UButton color="orange" variant="solid" :loading="saving" @click="save" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium cursor-pointer" title="Save dashboard changes">Save Dashboard</UButton>
          </div>
          <div class="flex items-center gap-2">
            <UButton :variant="device==='desktop'?'solid':'outline'" color="orange" size="xs" @click="setDevice('desktop')" class="cursor-pointer" title="Desktop preview">
              <Icon name="i-heroicons-computer-desktop" class="w-4 h-4"/>
            </UButton>
            <UButton :variant="device==='tablet'?'solid':'outline'" color="orange" size="xs" @click="setDevice('tablet')" class="cursor-pointer" title="Tablet preview">
              <Icon name="i-heroicons-device-tablet" class="w-4 h-4"/>
            </UButton>
            <UButton :variant="device==='mobile'?'solid':'outline'" color="orange" size="xs" @click="setDevice('mobile')" class="cursor-pointer" title="Mobile preview">
              <Icon name="i-heroicons-device-phone-mobile" class="w-4 h-4"/>
            </UButton>
            <UButton variant="outline" color="blue" size="xs" @click="autoLayout" class="hover:bg-blue-500 hover:text-white cursor-pointer" title="Automatically arrange charts">
              <Icon name="i-heroicons-arrows-pointing-out" class="w-4 h-4 mr-1"/>
              Auto Layout
            </UButton>
            <UButton variant="outline" color="blue" size="xs" @click="openPreview" class="hover:bg-blue-500 hover:text-white cursor-pointer" title="Preview dashboard">
              <Icon name="i-heroicons-eye" class="w-4 h-4 mr-1"/>
              Preview
            </UButton>
            <UButton variant="outline" color="red" size="xs" @click="downloadPDF" class="hover:bg-red-500 hover:text-white cursor-pointer" title="Download as PDF">
              <Icon name="i-heroicons-document-arrow-down" class="w-4 h-4 mr-1"/>
              Get PDF
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Panel (only shown when DEBUG_ENV=true) -->
    <ClientOnly>
      <div v-if="debugEnv" class="debug-panel border rounded bg-neutral-50 dark:bg-neutral-800 p-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium text-xs flex items-center gap-2">
          <Icon name="i-heroicons-beaker" class="w-3 h-3 text-orange-500"/>
          GridLayout Debug
        </h3>
        <UButton
          variant="ghost"
          size="xs"
          color="gray"
          class="cursor-pointer"
          @click="debugPanelOpen = !debugPanelOpen"
        >
          <Icon :name="debugPanelOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3 h-3"/>
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
    <UModal v-model:open="showRenameModal">
      <template #header>
        <h3 class="text-lg font-semibold">Rename Chart</h3>
      </template>
      <template #body>
        <UForm :state="renameForm" @submit="renameChart">
          <UFormField label="New Chart Name" name="newName">
            <UInput v-model="renameForm.newName" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showRenameModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="renaming">Rename</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Chart Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600">Delete Chart</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>Are you sure you want to delete the chart "<strong>{{ chartToDeleteName }}</strong>"?</p>
          <p class="text-sm text-gray-600">This action cannot be undone. The chart will be removed from this dashboard but will still be available in your saved charts.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="red" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" :loading="deleting" @click="deleteChart">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Add Chart Modal -->
    <UModal v-model:open="showAddChartModal" size="2xl">
      <template #header>
        <h3 class="text-lg font-semibold">Add Chart to Dashboard</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-if="availableCharts.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-4 opacity-50"/>
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
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showAddChartModal = false">Cancel</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Create Tab Modal -->
    <UModal v-model:open="showCreateTabModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create New Tab</h3>
      </template>
      <template #body>
        <UForm :state="createTabForm" @submit="createTab">
          <UFormField label="Tab Name" name="name">
            <UInput v-model="createTabForm.name" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showCreateTabModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="creatingTab">Create Tab</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Rename Tab Modal -->
    <UModal v-model:open="showRenameTabModal">
      <template #header>
        <h3 class="text-lg font-semibold">Rename Tab</h3>
      </template>
      <template #body>
        <UForm :state="renameTabForm" @submit="renameTab">
          <UFormField label="New Tab Name" name="name">
            <UInput v-model="renameTabForm.name" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showRenameTabModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="renamingTab">Rename</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Tab Confirmation Modal -->
    <UModal v-model:open="showDeleteTabModal">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600">Delete Tab</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>Are you sure you want to delete the tab "<strong>{{ tabToDeleteName }}</strong>"?</p>
          <p class="text-sm text-gray-600">This will permanently delete all charts in this tab. This action cannot be undone.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showDeleteTabModal = false">Cancel</UButton>
            <UButton color="red" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" :loading="deletingTab" @click="deleteTab">Delete Tab</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <Dashboard
        :device="device"
        v-model:layout="gridLayout"
        :grid-config="gridConfig"
        :charts="currentTabCharts"
        :loading="loading"
        @edit-chart="editChart"
        @rename-chart="startRenameChart"
        @delete-chart="confirmDeleteChart"
    />
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
const tabs = ref<Array<{ id: string; name: string; position: number; charts: Array<{ chartId: number; name: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }> }>>([])
const activeTabId = ref<string>('')
const gridLayout = ref<any[]>([])
const loading = ref(true)

// Modal states
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showAddChartModal = ref(false)
const showCreateTabModal = ref(false)
const showRenameTabModal = ref(false)
const showDeleteTabModal = ref(false)

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

// Tab operations
const createTabForm = reactive({name: ''})
const creatingTab = ref(false)
const renameTabForm = reactive({name: ''})
const renamingTab = ref(false)
const tabToRename = ref<string | null>(null)
const tabToDelete = ref<string | null>(null)
const tabToDeleteName = ref('')
const deletingTab = ref(false)

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

// Computed property for current tab charts
const currentTabCharts = computed(() => {
  const currentTab = tabs.value.find(t => t.id === activeTabId.value)
  return currentTab?.charts || []
})

function setDevice(d: 'desktop' | 'tablet' | 'mobile') {
  device.value = d
}

function selectTab(tabId: string) {
  activeTabId.value = tabId
  fromPositions()
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
  gridLayout.value = currentTabCharts.value.map(c => ({
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

function editChart(chartId: string) {
  navigateTo(`/reporting/builder?chartId=${chartId}&dashboard_id=${id.value}`)
}

function openPreview() {
  navigateTo(`/dashboards/preview/${id.value}`)
}

async function load() {
  loading.value = true
  try {
    const res = await getDashboardFull(id.value)
    dashboardName.value = res.name

    // Transform tabs data
    tabs.value = (res.tabs || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      charts: (t.charts || []).map((c: any) => ({
        chartId: c.id,
        name: c.name,
        position: c.position,
        state: c.state,
        preloadedColumns: c.data?.columns,
        preloadedRows: c.data?.rows
      }))
    }))

    // Set active tab to first tab if available
    if (tabs.value.length > 0 && !activeTabId.value) {
      activeTabId.value = tabs.value[0].id
    }

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
    // For now, save just updates the dashboard name
    // Tab layouts are saved individually when charts are moved
    await updateDashboard({
      id: id.value,
      name: dashboardName.value
    })
  } finally {
    saving.value = false
  }
}


// Chart operations
async function startRenameChart(chartId: string) {
  const chart = currentTabCharts.value.find(c => String(c.chartId) === chartId)
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
  const chart = currentTabCharts.value.find(c => String(c.chartId) === chartId)
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

    // Remove from current tab's charts
    const currentTab = tabs.value.find(t => t.id === activeTabId.value)
    if (currentTab) {
      const chartIndex = currentTab.charts.findIndex(c => String(c.chartId) === chartToDelete.value)
      if (chartIndex >= 0) {
        currentTab.charts.splice(chartIndex, 1)
        fromPositions() // Update grid layout
      }
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
    // Filter out charts that are already on this dashboard (across all tabs)
    const dashboardChartIds = new Set(
        tabs.value.flatMap(t => t.charts.map(c => c.chartId))
    )
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

    // Add to current tab with default position
    const newPosition = { x: 0, y: Math.max(...gridLayout.value.map(item => item.y + item.h), 0), w: 6, h: 8 }

    // Use the new API endpoint for adding charts to tabs
    await $fetch(`/api/dashboard-tabs`, {
      method: 'POST',
      body: {
        tabId: activeTabId.value,
        chartId: chartId,
        position: newPosition
      }
    })

    // Add to local state and reload to get full data
    await load()

    showAddChartModal.value = false
  } catch (error) {
    console.error('Failed to add chart to dashboard:', error)
  }
}

// Tab operations
function getTabMenuItems(tab: any) {
  return [
    [{
      label: 'Rename',
      icon: 'i-heroicons-pencil',
      class: 'cursor-pointer',
      onClick: () => startRenameTab(tab)
    }],
    [{
      label: 'Delete',
      icon: 'i-heroicons-trash',
      class: 'cursor-pointer',
      onClick: () => confirmDeleteTab(tab)
    }]
  ]
}

async function startRenameTab(tab: any) {
  tabToRename.value = tab.id
  renameTabForm.name = tab.name
  showRenameTabModal.value = true
}

async function confirmDeleteTab(tab: any) {
  tabToDelete.value = tab.id
  tabToDeleteName.value = tab.name
  showDeleteTabModal.value = true
}

async function createTab() {
  if (!createTabForm.name.trim()) return

  creatingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'POST',
      body: {
        dashboardId: id.value,
        name: createTabForm.name.trim()
      }
    })

    // Reload to get updated tabs
    await load()

    showCreateTabModal.value = false
    createTabForm.name = ''
  } catch (error) {
    console.error('Failed to create tab:', error)
  } finally {
    creatingTab.value = false
  }
}

async function renameTab() {
  if (!renameTabForm.name.trim() || !tabToRename.value) return

  renamingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'PUT',
      body: {
        tabId: tabToRename.value,
        name: renameTabForm.name.trim()
      }
    })

    // Update local state
    const tab = tabs.value.find(t => t.id === tabToRename.value)
    if (tab) {
      tab.name = renameTabForm.name.trim()
    }

    showRenameTabModal.value = false
    renameTabForm.name = ''
    tabToRename.value = null
  } catch (error) {
    console.error('Failed to rename tab:', error)
  } finally {
    renamingTab.value = false
  }
}

async function deleteTab() {
  if (!tabToDelete.value) return

  deletingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'DELETE',
      query: {id: tabToDelete.value}
    })

    // Remove from local state
    const tabIndex = tabs.value.findIndex(t => t.id === tabToDelete.value)
    if (tabIndex >= 0) {
      tabs.value.splice(tabIndex, 1)

      // If we deleted the active tab, switch to the first remaining tab
      if (activeTabId.value === tabToDelete.value && tabs.value.length > 0) {
        activeTabId.value = tabs.value[0].id
        fromPositions()
      }
    }

    showDeleteTabModal.value = false
    tabToDelete.value = null
    tabToDeleteName.value = ''
  } catch (error) {
    console.error('Failed to delete tab:', error)
  } finally {
    deletingTab.value = false
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

async function downloadPDF() {
  try {
    const response = await fetch(`/api/dashboards/${id.value}/pdf`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dashboardName.value.replace(/[^a-z0-9]/gi, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Failed to download PDF:', error)
    alert('Failed to generate PDF. Check console for details.')
  }
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


