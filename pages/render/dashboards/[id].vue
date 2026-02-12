<template>
  <div :data-render-status="renderStatus">
    <!-- Render each tab -->
    <div 
      v-for="tab in tabs" 
      :key="tab.id"
    >
      <Dashboard
          device="desktop"
          :layout="tab.layout"
          :widgets="tab.widgets"
          :loading="loading"
          :preview="true"
          :dashboard-id="id"
          :dashboard-width="dashboardWidth"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DASHBOARD_WIDTH } from '~/lib/dashboard-constants'

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

interface TabData {
  id: string
  widgets: Widget[]
  layout: Array<{ i: string; left: number; top: number; width: number; height: number }>
}

const tabs = ref<TabData[]>([])
const dashboardWidth = ref<number>(DASHBOARD_WIDTH)
const loading = ref(true)

// Get context token from URL and provide it to child components
const renderContextToken = computed(() => route.query.context as string | undefined)
provide('renderContextToken', renderContextToken)

// Render status for PDF generation to wait on
const renderStatus = computed(() => loading.value ? 'loading' : 'ready')

async function load() {
  loading.value = true
  try {
    // Get context token from URL query parameter
    const contextToken = route.query.context as string | undefined
    const res = await getDashboardFull(id.value, contextToken)

    // Set dashboard width from response
    dashboardWidth.value = res.width || DASHBOARD_WIDTH

    // Build tabs array - each tab gets its own widgets and layout
    const tabsData: TabData[] = []

    for (const tab of res.tabs || []) {
      const tabWidgets: Widget[] = []
      const tabLayout: Array<{ i: string; left: number; top: number; width: number; height: number }> = []

      for (const widget of (tab.widgets || [])) {
        const position = widget.position || {}

        // Map API response to Widget interface
        tabWidgets.push({
          widgetId: String(widget.widgetId),
          type: widget.type as 'chart' | 'text',
          chartId: widget.id,
          name: widget.name || '',
          position: position,
          state: widget.state,
          style: widget.style,
          configOverride: widget.configOverride
        })

        // Build layout for this widget
        tabLayout.push({
          left: position.left ?? 0,
          top: position.top ?? 0,
          width: position.width ?? 400,
          height: position.height ?? 240,
          i: String(widget.widgetId)
        })
      }

      if (tabWidgets.length > 0) {
        tabsData.push({
          id: tab.id,
          widgets: tabWidgets,
          layout: tabLayout
        })
      }
    }

    tabs.value = tabsData
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>


