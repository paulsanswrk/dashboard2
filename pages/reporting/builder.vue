 <template>
  <ReportingLayout>
    <template #left>
      <div class="p-0 h-full overflow-hidden">
        <div class="resizable-columns h-full">
          <!-- Column 1: Connection + Datasets -->
          <div class="resizable-column flex-1">
            <div class="space-y-4 min-w-0 h-full overflow-auto bg-dark-light text-white p-4">
              <div class="mb-2">
                <label class="text-xs block mb-1 text-neutral-300">Data Connection</label>
                <div v-if="connectionsLoading" class="flex items-center gap-2 text-sm text-neutral-300">
                  <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                  <span>Loading connections...</span>
                </div>
                <select v-else v-model.number="connectionId" class="border border-dark-lighter bg-dark-light text-white rounded px-2 py-1 w-full text-sm">
                  <option :value="null" disabled>Select</option>
                  <option v-for="c in connections" :key="c.id" :value="c.id">{{ c.internal_name }}</option>
                </select>
              </div>

              <!-- Dataset search (hidden for now) -->
              <div v-if="false" class="relative">
                <Icon name="heroicons:magnifying-glass" class="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <div class="pl-4">
                  <input v-model="datasetQuery" type="text" placeholder="Search"
                        class="w-full pl-7 pr-2 py-1.5 text-sm rounded bg-dark-light text-white placeholder-neutral-400 border border-dark-lighter focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </div>
              </div>

              <!-- Datasets list as collapsible sections -->
              <div class="space-y-2">
                <div v-if="datasetsLoading" class="px-4 py-3 text-neutral-300 flex items-center gap-2">
                  <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                  <span>Loading tables...</span>
                </div>
                <template v-else>
                  <div
                    v-for="ds in filteredDatasets"
                    :key="ds.id"
                    class="rounded-md overflow-hidden"
                  >
                    <button
                      class="w-full flex items-center justify-between px-3 py-2 bg-primary text-white text-sm font-medium"
                      @click="selectDataset(ds.id)"
                    >
                      <span class="truncate">{{ ds.label || ds.name }}</span>
                      <Icon :name="expandedDatasetId === ds.id ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" class="w-4 h-4" />
                    </button>

                    <div v-if="expandedDatasetId === ds.id" class="p-3 bg-transparent">
                      <div v-if="schemaLoading" class="flex items-center gap-2 text-sm text-neutral-500">
                        <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
                        <span>Loading columns...</span>
                      </div>
                      <ReportingSchemaPanel v-else-if="schema.length && selectedDatasetId === ds.id" :fields="schema" :dataset-name="ds.name" />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Resize handle -->
          <div class="resize-handle" @mousedown="startResize"></div>

          <!-- Column 2: Zones + Filters -->
          <div class="resizable-column flex-1">
            <div class="space-y-4 min-w-0 h-full overflow-auto bg-dark-light text-white p-4">
              <h3 class="font-medium text-white">Zones</h3>
              <ClientOnly>
                <ReportingZones />
              </ClientOnly>
              <div>
                <ReportingFilters v-if="schema.length" :schema="schema" />
              </div>
              <div v-if="relationships.length" class="mt-4">
                <ReportingJoinsImplicit :relationships="relationships" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #center>
      <div class="p-6">
        <ReportingBuilder />
      </div>
    </template>

    <template #right>
      <div class="p-4 space-y-4">
        <h2 class="font-medium mb-2">Appearance</h2>
        <ReportingAppearancePanel />
      </div>
    </template>
  </ReportingLayout>
</template>

<script setup lang="ts">
import ReportingLayout from '../../components/reporting/ReportingLayout.vue'
import ReportingBuilder from '../../components/reporting/ReportingBuilder.vue'
import ReportingSchemaPanel from '../../components/reporting/ReportingSchemaPanel.vue'
import ReportingZones from '../../components/reporting/ReportingZones.vue'
import ReportingFilters from '../../components/reporting/ReportingFilters.vue'
import ReportingAppearancePanel from '../../components/reporting/ReportingAppearancePanel.vue'
import ReportingJoinsImplicit from '../../components/reporting/ReportingJoinsImplicit.vue'
import { useReportingService } from '../../composables/useReportingService'
import { onMounted, ref, watch, computed, nextTick } from 'vue'
import { useReportState } from '../../composables/useReportState'

const { listConnections, listDatasets, getSchema, getRelationships, setSelectedDatasetId, selectedDatasetId, selectedConnectionId, setSelectedConnectionId } = useReportingService()
const datasets = ref<Array<{ id: string; name: string; label?: string }>>([])
const schema = ref<any[]>([])
const relationships = ref<any[]>([])
const connections = ref<Array<{ id: number; internal_name: string }>>([])
const connectionId = ref<number | null>(null)
const { selectedDatasetId: selectedIdState, joins } = useReportState()

// Loading states
const connectionsLoading = ref(true)
const datasetsLoading = ref(false)
const schemaLoading = ref(false)
const expandedDatasetId = ref<string | null>(null)

// Search
const datasetQuery = ref('')
const filteredDatasets = computed(() => {
  if (!datasetQuery.value) return datasets.value
  const q = datasetQuery.value.toLowerCase()
  return datasets.value.filter(ds => (ds.label || ds.name).toLowerCase().includes(q))
})

// Resizable columns functionality
const leftColumnRef = ref<HTMLElement>()
const rightColumnRef = ref<HTMLElement>()
let isResizing = false
let startX = 0
let startLeftWidth = 0
let startRightWidth = 0

function startResize(event: MouseEvent) {
  isResizing = true
  startX = event.clientX

  const leftColumn = leftColumnRef.value
  const rightColumn = rightColumnRef.value

  if (leftColumn && rightColumn) {
    startLeftWidth = parseInt(getComputedStyle(leftColumn).width)
    startRightWidth = parseInt(getComputedStyle(rightColumn).width)
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event: MouseEvent) {
  if (!isResizing) return

  const deltaX = event.clientX - startX
  const containerWidth = (leftColumnRef.value?.parentElement?.clientWidth || 0)

  // Calculate proportional changes
  const totalStartWidth = startLeftWidth + startRightWidth
  const leftProportion = startLeftWidth / totalStartWidth
  const rightProportion = startRightWidth / totalStartWidth

  // Calculate new proportions based on mouse movement
  const deltaProportion = deltaX / containerWidth
  let newLeftProportion = leftProportion + deltaProportion
  let newRightProportion = rightProportion - deltaProportion

  // Constrain proportions (minimum 20% each)
  const minProportion = 0.2
  if (newLeftProportion < minProportion) {
    newLeftProportion = minProportion
    newRightProportion = 1 - minProportion
  } else if (newRightProportion < minProportion) {
    newRightProportion = minProportion
    newLeftProportion = 1 - minProportion
  }

  // Apply new proportions
  if (leftColumnRef.value) {
    leftColumnRef.value.style.flex = `${newLeftProportion} 1 0`
  }
  if (rightColumnRef.value) {
    rightColumnRef.value.style.flex = `${newRightProportion} 1 0`
  }
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function selectDataset(id: string) {
  // Toggle collapse if the same dataset is clicked
  if (expandedDatasetId.value === id) {
    expandedDatasetId.value = null
    return
  }
  // If selecting a different dataset, collapse current columns first
  if (expandedDatasetId.value && expandedDatasetId.value !== id) {
    expandedDatasetId.value = null
    schema.value = []
  }
  expandedDatasetId.value = id
  setSelectedDatasetId(id)
}


async function listDatasetsQuery() {
  const params: any = {}
  if (connectionId.value) params.connectionId = connectionId.value
  return await (await fetch(`/api/reporting/datasets?${new URLSearchParams(params).toString()}`)).json()
}

watch(selectedDatasetId, async (id) => {
  if (id) {
    schemaLoading.value = true
    schema.value = await getSchema(id)
    relationships.value = await getRelationships(id)
    schemaLoading.value = false
    // reset any previously applied joins when dataset changes
    joins.value = []
  } else {
    schema.value = []
    relationships.value = []
  }
})

watch(connectionId, (id) => {
  setSelectedConnectionId(id ?? null)
  // persist to URL
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('data_connection_id', String(id))
  else url.searchParams.delete('data_connection_id')
  window.history.replaceState({}, '', url.toString())
  // reload datasets for this connection
  datasetsLoading.value = true
  expandedDatasetId.value = null
  schema.value = []
  listDatasetsQuery().then((rows) => { datasets.value = rows as any }).finally(() => { datasetsLoading.value = false })
})

onMounted(async () => {
  connectionsLoading.value = true
  connections.value = await listConnections()
  connectionsLoading.value = false
  // expose debug flag to window for client-only components
  if (typeof window !== 'undefined') {
    ;(window as any).__DEBUG_ENV__ = (import.meta as any).env?.DEBUG_ENV === 'true'
  }
  // Seed from URL if present
  const url = new URL(window.location.href)
  const cid = url.searchParams.get('data_connection_id')
  if (cid) {
    connectionId.value = Number(cid)
    setSelectedConnectionId(connectionId.value)
  }
  if (connectionId.value) {
    datasetsLoading.value = true
    datasets.value = await listDatasetsQuery()
    datasetsLoading.value = false
  } else {
    datasets.value = []
  }

  // Set initial refs for resizable columns after DOM is mounted
  nextTick(() => {
    const leftColumn = document.querySelector('.resizable-column:first-child') as HTMLElement
    const rightColumn = document.querySelector('.resizable-column:last-child') as HTMLElement
    if (leftColumn) leftColumnRef.value = leftColumn
    if (rightColumn) rightColumnRef.value = rightColumn
  })
})
</script>



