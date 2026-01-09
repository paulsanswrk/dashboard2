<template>
  <div :data-render-status="renderStatus">
    <Dashboard
        device="desktop"
        :layout="gridLayout"
        :grid-config="gridConfig"
        :widgets="widgets"
        :loading="loading"
        :preview="true"
        :scaling-enabled="false"
        :dashboard-id="id"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'empty'
})

const route = useRoute()
const id = computed(() => String(route.params.id))

// Set page title
useHead({
  title: 'Render Dashboard'
})

const {getDashboardFull} = useDashboardsService()

interface Widget {
  widgetId: string
  type: 'chart' | 'text' | 'image' | 'icon'
  chartId?: number
  name?: string
  position: any
  state?: any
  style?: any
  configOverride?: any
}

const widgets = ref<Widget[]>([])
const gridLayout = ref<any[]>([])
const loading = ref(true)

// Render status for PDF generation to wait on
const renderStatus = computed(() => loading.value ? 'loading' : 'ready')

// Grid configuration for render (read-only)
const gridConfig = reactive({
  // Basic layout properties
  colNum: 12,
  rowHeight: 30,
  maxRows: Infinity,
  margin: [20, 20] as [number, number],

  // Behavior properties (disabled for render)
  isDraggable: false,
  isResizable: false,
  isMirrored: false,
  isBounded: false,

  // Layout properties
  autoSize: true,
  verticalCompact: true,
  restoreOnDrag: false,
  preventCollision: false,

  // Performance properties
  useCssTransforms: true,
  useStyleCursor: false, // Disabled for render
  transformScale: 1,

  // Responsive properties
  responsive: true,
  breakpoints: {lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0},
  cols: {lg: 12, md: 10, sm: 6, xs: 4, xxs: 2}
})

function fromPositions() {
  gridLayout.value = widgets.value.map(w => ({
    x: w.position?.x ?? 0,
    y: w.position?.y ?? 0,
    w: w.position?.w ?? 4,
    h: w.position?.h ?? 8,
    i: String(w.widgetId)
  }))
}

async function load() {
  loading.value = true
  try {
    // Get context token from URL query parameter
    const contextToken = route.query.context as string | undefined
    const res = await getDashboardFull(id.value, contextToken)

    // Flatten all widgets from all tabs
    const allWidgets: Widget[] = []
    for (const tab of res.tabs || []) {
      for (const widget of (tab.widgets || [])) {
        // Map API response to Widget interface
        allWidgets.push({
          widgetId: String(widget.widgetId),
          type: widget.type as 'chart' | 'text',
          chartId: widget.id,
          name: widget.name || '',
          position: widget.position,
          state: widget.state,
          // Note: No preloaded data - charts fetch their own data progressively
          style: widget.style,
          configOverride: widget.configOverride
        })
      }
    }

    widgets.value = allWidgets
    fromPositions()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
