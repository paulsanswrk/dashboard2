<template>
  <div class="p-4 lg:p-6 space-y-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UInput v-model="dashboardName" class="w-72" />
        <UButton color="orange" variant="solid" :loading="savingName" @click="saveName">Save name</UButton>
      </div>
      <div class="flex items-center gap-2">
        <UButton :variant="device==='desktop'?'solid':'outline'" color="orange" size="xs" @click="setDevice('desktop')">Desktop</UButton>
        <UButton :variant="device==='tablet'?'solid':'outline'" color="orange" size="xs" @click="setDevice('tablet')">Tablet</UButton>
        <UButton :variant="device==='mobile'?'solid':'outline'" color="orange" size="xs" @click="setDevice('mobile')">Mobile</UButton>
        <UButton color="orange" variant="outline" :loading="savingLayout" @click="saveLayout">
          <Icon name="heroicons:device-phone-mobile" class="w-4 h-4 mr-1" />
          Save layout
        </UButton>
      </div>
    </div>

    <div class="border rounded bg-white dark:bg-gray-900 p-3 overflow-auto">
      <div :style="{ width: previewWidth + 'px', margin: '0 auto' }">
        <ClientOnly>
        <GridLayout
          v-model:layout="gridLayout"
          :col-num="12"
          :row-height="30"
          :is-draggable="true"
          :is-resizable="true"
          :margin="[10, 10]"
          @layout-updated="onLayoutUpdated"
        >
          <GridItem v-for="item in gridLayout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i">
            <UCard class="h-full w-full">
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

const { getDashboardFull, updateDashboard } = useDashboardsService()

const dashboardName = ref('')
const charts = ref<Array<{ chartId: number; name: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }>>([])
const gridLayout = ref<any[]>([])

const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const previewWidth = computed(() => {
  if (device.value === 'mobile') return 390
  if (device.value === 'tablet') return 768
  return 1200
})

function setDevice(d: 'desktop' | 'tablet' | 'mobile') {
  device.value = d
}

function fromPositions() {
  gridLayout.value = charts.value.map(c => ({
    x: c.position?.x ?? 0,
    y: c.position?.y ?? 0,
    w: c.position?.w ?? 4,
    h: c.position?.h ?? 6,
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
}

onMounted(load)

const savingLayout = ref(false)
async function saveLayout() {
  savingLayout.value = true
  try {
    await updateDashboard({ id: id.value, layout: toPositions() })
  } finally {
    savingLayout.value = false
  }
}

const savingName = ref(false)
async function saveName() {
  savingName.value = true
  try {
    await updateDashboard({ id: id.value, name: dashboardName.value })
  } finally {
    savingName.value = false
  }
}

function onLayoutUpdated() {
  // no-op, local state is already updated via v-model
}
</script>

<style scoped>
:deep(.vue-grid-layout) { min-height: 300px; }
</style>


