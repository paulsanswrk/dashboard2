<template>
  <Dashboard
      device="desktop"
      :layout="gridLayout"
      :grid-config="gridConfig"
      :charts="charts"
      :loading="loading"
      :preview="true"
  />
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

const charts = ref<Array<{ chartId: number; name: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }>>([])
const gridLayout = ref<any[]>([])
const loading = ref(true)

// Grid configuration for render (read-only)
const gridConfig = reactive({
  // Basic layout properties
  colNum: 12,
  rowHeight: 30,
  maxRows: Infinity,
  margin: [20, 20],

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
  gridLayout.value = charts.value.map(c => ({
    x: c.position?.x ?? 0,
    y: c.position?.y ?? 0,
    w: c.position?.w ?? 4,
    h: c.position?.h ?? 8,
    i: String(c.chartId)
  }))
}

async function load() {
  loading.value = true
  try {
    const res = await getDashboardFull(id.value)
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
</script>
