 <template>
  <ReportingLayout :show-right-sidebar="sidebarVisible">
    <template #left>
      <div class="p-0 h-full overflow-hidden">
        <!-- AI Mode Toggle and Connection Selector -->
        <div class="px-4 py-3 border-b border-dark-lighter bg-dark-light">
          <div class="flex items-center justify-between gap-3 mb-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="aiModeEnabled"
                type="checkbox"
                class="sr-only"
              >
              <div class="relative">
                <div class="w-10 h-5 bg-gray-600 rounded-full shadow-inner transition-colors" :class="{ 'bg-green-500': aiModeEnabled }"></div>
                <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="{ 'translate-x-5': aiModeEnabled }"></div>
              </div>
              <span class="text-sm font-medium" :class="aiModeEnabled ? 'text-green-400' : 'text-white'">AI Mode</span>
            </label>
          </div>
          <!-- Connection Selector (always visible) -->
          <div>
            <label class="block text-xs text-neutral-400 mb-1">Data Connection</label>
            <select
              v-model="connectionId"
              class="w-full px-3 py-2 text-sm bg-dark-lighter border border-dark-lighter rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              <option :value="null">Select a connection...</option>
              <option v-for="conn in connections" :key="conn.id" :value="conn.id">
                {{ conn.internal_name }}
              </option>
            </select>
          </div>
        </div>

        <!-- AI Chat Box (when AI mode is enabled) -->
        <div v-if="aiModeEnabled" class="flex flex-col bg-dark-light text-white" style="height: calc(100% - 120px);">
          <div class="flex-1 p-4 overflow-auto" ref="chatContainer">
            <h3 class="font-medium text-white mb-4">AI Assistant</h3>
            <div class="space-y-3">
              <div
                v-for="(msg, idx) in aiMessages"
                :key="idx"
                :class="[
                  'rounded-lg p-3',
                  msg.role === 'assistant'
                    ? 'bg-dark-lighter'
                    : 'bg-primary-600 ml-auto max-w-xs'
                ]"
              >
                <p class="text-sm" :class="msg.role === 'assistant' ? 'text-neutral-300' : 'text-white'">
                  {{ msg.content }}
                </p>
              </div>
              <div v-if="aiLoading" class="bg-dark-lighter rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-neutral-400"/>
                  <p class="text-sm text-neutral-400">Thinking...</p>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-dark-lighter p-4">
            <div class="flex gap-2">
              <textarea
                v-model="aiInput"
                rows="3"
                placeholder="Ask me to help build your chart..."
                class="flex-1 px-3 py-2 text-sm bg-dark-lighter border border-dark-lighter rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
                @keydown.enter.exact.prevent="sendAiMessage"
                :disabled="aiLoading"
              ></textarea>
              <button
                @click="sendAiMessage"
                :disabled="aiLoading || !aiInput.trim()"
                class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end cursor-pointer"
              >
                <Icon v-if="aiLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
                <span v-else>Send</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Traditional Data Sources & Zones (when AI mode is disabled) -->
        <div v-else class="resizable-columns h-full">
          <!-- Column 1: Connection + Datasets -->
          <div class="resizable-column flex-1">
            <div class="space-y-4 min-w-0 h-full overflow-auto bg-dark-light text-white p-4">

              <!-- Dataset search (hidden for now) -->
              <div v-if="false" class="relative">
                <Icon name="i-heroicons-magnifying-glass" class="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"/>
                <div class="pl-4">
                  <input v-model="datasetQuery" type="text" placeholder="Search"
                        class="w-full pl-7 pr-2 py-1.5 text-sm rounded bg-dark-light text-white placeholder-neutral-400 border border-dark-lighter focus:outline-none focus:ring-1 focus:ring-primary-400" />
                </div>
              </div>

              <!-- Datasets list as collapsible sections -->
              <div class="space-y-2">
                <div v-if="datasetsLoading" class="px-4 py-3 text-neutral-300 flex items-center gap-2">
                  <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
                  <span>Loading tables...</span>
                </div>
                <template v-else>
                  <div
                    v-for="ds in filteredDatasets"
                    :key="ds.id"
                    class="rounded-md overflow-hidden"
                  >
                    <div class="group flex items-center bg-primary">
                      <button
                          class="flex-1 flex items-center justify-between px-3 py-2 text-white text-sm font-medium hover:bg-primary-700 cursor-pointer transition-colors"
                        @click="selectDataset(ds.id)"
                      >
                        <span class="truncate">{{ ds.label || ds.name }}</span>
                        <Icon :name="expandedDatasetId === ds.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-4 h-4"/>
                      </button>
                      <button
                        @click.stop="openTablePreview(ds.name)"
                        class="px-2 py-2 text-white hover:bg-primary-700 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Preview table data"
                      >
                        <Icon name="i-heroicons-table-cells" class="w-4 h-4"/>
                      </button>
                    </div>

                    <div v-if="expandedDatasetId === ds.id" class="p-3 bg-transparent">
                      <ReportingSchemaPanel v-if="columnsByDataset[ds.id]?.length" :fields="columnsByDataset[ds.id]" :dataset-name="ds.name"/>
                      <div v-else class="text-sm text-neutral-500">No columns available</div>
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
                <ReportingZones :zone-config="zoneConfig" :connection-id="connectionId" @field-updated="onFieldUpdated" @open-join-path-modal="showEditJoinPathModal = true"/>
              </ClientOnly>
              <div>
                <ReportingFilters :disabled="false"/>
              </div>
              <div v-if="relationships.length" class="mt-4">
                <ReportingJoinsImplicit :relationships="relationships" :server-error="previewError" :server-warnings="previewWarnings" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #center>
      <div>
        <ClientOnly>
          <ReportingBuilder
            ref="reportingBuilderRef"
            :sidebar-visible="sidebarVisible"
            :connection-id="connectionId"
            :editing-chart-id="editingChartId"
            :dashboard-id="dashboardId"
            @toggle-sidebar="sidebarVisible = !sidebarVisible"
            @preview-meta="onPreviewMeta"
            @chart-type-change="currentChartType = $event"
          />
        </ClientOnly>
      </div>
    </template>

    <template #right>
      <div class="p-4 space-y-4 relative text-gray-900 dark:text-white">
        <!-- Close button in top right corner -->
        <button
          @click="sidebarVisible = !sidebarVisible"
          class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <Icon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"/>
        </button>

        <h2 class="font-medium mb-2 pr-8">Chart Config</h2>
        <ChartConfigEditor :chart-type="currentChartType"/>
      </div>
    </template>
  </ReportingLayout>

   <!-- Edit Join Path Modal -->
   <EditJoinPathModal
       v-model:open="showEditJoinPathModal"
       :connection-id="connectionId"
       :available-tables="availableTableNames"
       @save="onJoinPathSave"
   />

   <!-- Table Preview Modal -->
   <TablePreviewModal
       v-model:open="showTablePreviewModal"
       :connection-id="connectionId"
       :table-name="previewTableName"
   />
</template>

<script setup lang="ts">
// Page meta - use builder layout (minimal chrome, no sidebar)
definePageMeta({
  layout: 'builder',
  middleware: 'auth'
})

import ReportingLayout from '../../components/reporting/ReportingLayout.vue'
import ReportingBuilder from '../../components/reporting/ReportingBuilder.vue'
import ReportingSchemaPanel from '../../components/reporting/ReportingSchemaPanel.vue'
import ReportingZones from '../../components/reporting/ReportingZones.vue'
import EditJoinPathModal from '../../components/reporting/EditJoinPathModal.vue'
import TablePreviewModal from '../../components/reporting/TablePreviewModal.vue'
import ChartConfigEditor from '../../components/reporting/ChartConfigEditor.vue'
import ReportingJoinsImplicit from '../../components/reporting/ReportingJoinsImplicit.vue'
import {useReportingService} from '../../composables/useReportingService'
import {useChartsService} from '../../composables/useChartsService'
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {useReportState} from '../../composables/useReportState'
import {getZoneConfig as getChartZoneConfig} from '~/lib/charts'

const { listConnections, listDatasets, getSchema, getRelationships, setSelectedDatasetId, selectedDatasetId, selectedConnectionId, setSelectedConnectionId } = useReportingService()
const { getChart } = useChartsService()
const datasets = ref<Array<{ id: string; name: string; label?: string }>>([])
const schema = ref<any[]>([])
const relationships = ref<any[]>([])
const connections = ref<Array<{ id: number; internal_name: string }>>([])
const connectionId = ref<number | null>(null)
const editingChartId = ref<number | null>(null)
const dashboardId = ref<string | null>(null)
const {selectedDatasetId: selectedIdState, setSelectedDatasetId: setReportSelectedDatasetId, joins, xDimensions, yMetrics, breakdowns, excludeNullsInDimensions, appearance, useSql, overrideSql, sqlText, actualExecutedSql} = useReportState()
const reportingBuilderRef = ref<any>(null)
const currentChartType = ref<string>('bar')
const showEditJoinPathModal = ref(false)
const showTablePreviewModal = ref(false)
const previewTableName = ref('')
const chartName = ref<string | null>(null)

// Dynamic page title with chart name
usePageTitle('Chart Builder', chartName)

// Computed list of available table names from datasets
const availableTableNames = computed(() => datasets.value.map(ds => ds.name))

// Zone configuration based on chart type (using polymorphic chart registry)
const zoneConfig = computed(() => getChartZoneConfig(currentChartType.value))

// Preview meta propagated from ReportingBuilder to display in Joins panel
const previewError = ref<string | null>(null)
const previewWarnings = ref<string[]>([])
function onPreviewMeta(p: { error: string | null; warnings: string[] }) {
  previewError.value = p?.error || null
  previewWarnings.value = Array.isArray(p?.warnings) ? p.warnings : []
}

// Loading states
const connectionsLoading = ref(true)
const datasetsLoading = ref(false)
const schemaLoading = ref(false)
const expandedDatasetId = ref<string | null>(null)

// Preloaded columns cache: populated when connection is selected
const columnsByDataset = ref<Record<string, any[]>>({})
// Preloaded relationships cache: all foreign keys for the entire connection
const allRelationships = ref<any[]>([])

// Sidebar visibility (collapsed by default)
const sidebarVisible = ref(false)

// Table Preview Modal
function openTablePreview(tableName: string) {
  previewTableName.value = tableName
  showTablePreviewModal.value = true
}

// Handler for when a field is updated in the zones
// Note: Preview is automatically triggered by the watcher in ReportingBuilder
// when zone state changes, so we don't need to manually call it here
function onFieldUpdated() {
  // Placeholder for any additional logic needed when a field is updated
  // The preview refresh is handled by the automatic watcher
}

// Handler for when join paths are saved from the modal
// Note: Preview is automatically triggered by the watcher in ReportingBuilder
// when joins state changes, so we don't need to manually call it here
function onJoinPathSave() {
  // Placeholder for any additional logic needed when joins are saved
  // The preview refresh is handled by the automatic watcher
}

// AI mode toggle
const aiModeEnabled = ref(true)

// AI chat state
const aiMessages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
const aiInput = ref('')
const aiLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Initialize AI messages based on connection status
watch(() => connectionId.value, (newVal) => {
  if (aiMessages.value.length === 0) {
    if (newVal) {
      aiMessages.value.push({
        role: 'assistant',
        content: 'Hello! I\'m here to help you build charts. What kind of visualization would you like to create?'
      })
    } else {
      aiMessages.value.push({
        role: 'assistant',
        content: 'Welcome! I\'m ready to help you create amazing charts. What kind of data visualization would you like to build?'
      })
    }
  }
}, { immediate: true })

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

  // Constrain proportions (minimum 15% each for flexible resizing on smaller displays)
  const minProportion = 0.15
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
    setSelectedDatasetId(null)
    setReportSelectedDatasetId(null)
    return
  }
  // If selecting a different dataset, collapse current columns first
  if (expandedDatasetId.value && expandedDatasetId.value !== id) {
    expandedDatasetId.value = null
    schema.value = []
  }
  expandedDatasetId.value = id
  setSelectedDatasetId(id)
  setReportSelectedDatasetId(id)
}


async function listDatasetsQuery() {
  const params: any = {}
  if (connectionId.value) params.connectionId = connectionId.value
  return await (await fetch(`/api/reporting/datasets?${new URLSearchParams(params).toString()}`)).json()
}

watch(selectedDatasetId, async (id) => {
  if (id) {
    schemaLoading.value = true
    try {
      // Use cached columns if available, otherwise fetch
      if (columnsByDataset.value[id]?.length) {
        schema.value = columnsByDataset.value[id]
      } else {
        schema.value = await getSchema(id)
      }
      // Filter pre-loaded relationships for the selected dataset
      relationships.value = allRelationships.value.filter(
        (rel: any) => rel.sourceTable === id || rel.targetTable === id
      )
    } catch (error) {
      console.error('Failed to load schema:', error)
      schema.value = []
      relationships.value = []
    }
    schemaLoading.value = false
    // reset any previously applied joins when dataset changes (only if there are joins)
    if (joins.value.length > 0) {
      joins.value = []
    }
  } else {
    schema.value = []
    relationships.value = []
  }
})

// Ensure dataset and schema load when state is restored from URL (zones may be pre-populated)
watch(selectedIdState, (id) => {
  if (id && selectedDatasetId.value !== id) {
    setSelectedDatasetId(id)
  }
})

watch(connectionId, async (id) => {
  setSelectedConnectionId(id ?? null)
  // persist to URL
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('data_connection_id', String(id))
  else url.searchParams.delete('data_connection_id')
  window.history.replaceState({}, '', url.toString())
  // reload datasets and preload full schema for this connection
  datasetsLoading.value = true
  expandedDatasetId.value = null
  schema.value = []
  columnsByDataset.value = {}
  allRelationships.value = []

  if (!id) {
    datasets.value = []
    datasetsLoading.value = false
    return
  }

  try {
    // Fetch full schema (tables + columns + relationships) in one request
    const fullSchema = await $fetch<{ tables: Array<{ tableId: string; tableName: string; columns: any[] }>; relationships: any[] }>('/api/reporting/full-schema', {
      params: {connectionId: id}
    })

    // Populate datasets from full schema
    datasets.value = (fullSchema.tables || []).map(t => ({
      id: t.tableId,
      name: t.tableName,
      label: t.tableName
    }))

    // Cache columns by table
    const columnsMap: Record<string, any[]> = {}
    for (const t of fullSchema.tables || []) {
      columnsMap[t.tableId] = t.columns || []
    }
    columnsByDataset.value = columnsMap
    
    // Cache all relationships for the connection
    allRelationships.value = fullSchema.relationships || []
  } catch (error) {
    console.error('Failed to load full schema:', error)
    // Fallback to old method
    datasets.value = await listDatasetsQuery() as any
  } finally {
    datasetsLoading.value = false
  }
})

// Load chart from saved state
async function loadChartFromState(state: any) {
  // Set connection and dataset at the page level first
  if (state.dataConnectionId) {
    connectionId.value = state.dataConnectionId
    setSelectedConnectionId(connectionId.value)

    // Load datasets for this connection
    try {
      datasetsLoading.value = true
      datasets.value = await listDatasetsQuery()
      datasetsLoading.value = false
    } catch (error) {
      console.error('Failed to load datasets for connection:', state.dataConnectionId, error)
      datasetsLoading.value = false
      datasets.value = []
    }
  }

  if (state.selectedDatasetId) {
    setSelectedDatasetId(state.selectedDatasetId)
    setReportSelectedDatasetId(state.selectedDatasetId)
  }

  // Set the state on the ReportingBuilder component after connection and dataset are ready
  if (reportingBuilderRef.value && typeof reportingBuilderRef.value.handleLoadChartState === 'function') {
    reportingBuilderRef.value.handleLoadChartState({
      dataConnectionId: state.dataConnectionId || null,
      useSql: state.useSql || false,
      overrideSql: state.overrideSql || false,
      sqlText: state.sqlText || '',
      actualExecutedSql: state.actualExecutedSql || '',
      selectedDatasetId: state.selectedDatasetId || null,
      xDimensions: state.xDimensions || [],
      yMetrics: state.yMetrics || [],
      filters: state.filters || [],
      breakdowns: state.breakdowns || [],
      sizeValue: state.sizeValue || null,  // For bubble chart SIZE zone
      excludeNullsInDimensions: !!state.excludeNullsInDimensions,
      appearance: state.appearance || {},
      chartType: state.chartType || 'bar',
      chartName: state.chartName || ''
    })
  }
}

// AI assistant function
async function sendAiMessage() {
  if (!aiInput.value.trim() || aiLoading.value) return
  if (!connectionId.value) {
    aiMessages.value.push({
      role: 'assistant',
      content: 'Please select a data connection first to continue.'
    })
    return
  }

  const userMessage = aiInput.value.trim()
  aiMessages.value.push({ role: 'user', content: userMessage })
  aiInput.value = ''
  aiLoading.value = true

  try {
    // Get current state from ReportingBuilder
    let currentState = { sql: '', chartType: '', appearance: {} }
    if (reportingBuilderRef.value && typeof reportingBuilderRef.value.getCurrentState === 'function') {
      currentState = reportingBuilderRef.value.getCurrentState()
    } else {
      // Fallback: use computed SQL from zones
      currentState.sql = sqlGenerated.value || ''
    }

    const response = await $fetch<{
      sql: string
      chartConfig: any
      chartType: string
      title?: string
      explanation: string
      usage?: any
      explanation: string
      usage?: any
    }>('/api/reporting/ai-chart-assistant', {
      method: 'POST',
      body: {
        connectionId: connectionId.value,
        userPrompt: userMessage,
        currentSql: currentState.sql,
        currentChartType: currentState.chartType,
        currentAppearance: currentState.appearance,
        datasetId: selectedDatasetId.value,
        schemaJson: null  // Will use saved schema
      }
    })

    // Add AI response to chat
    aiMessages.value.push({
      role: 'assistant',
      content: response.explanation
    })

    // Auto-apply the changes
    if (reportingBuilderRef.value) {
      if (typeof reportingBuilderRef.value.applySqlAndChartType === 'function') {
        reportingBuilderRef.value.applySqlAndChartType(response.sql, response.chartType, response.chartConfig)
      }
      if (response.title && typeof reportingBuilderRef.value.setTitle === 'function') {
        reportingBuilderRef.value.setTitle(response.title)
      }
      // Put the chartConfig in the debug textarea for inspection
      if (typeof reportingBuilderRef.value.setDebugJsonConfig === 'function') {
        reportingBuilderRef.value.setDebugJsonConfig(response.chartConfig)
      }
    }
    
    // Scroll chat to bottom
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    })
    
  } catch (error) {
    console.error('AI request failed:', error)
    aiMessages.value.push({
      role: 'assistant',
      content: `Sorry, I encountered an error: ${error.data?.statusMessage || error.message}`
    })
  } finally {
    aiLoading.value = false
  }
}

// Computed for SQL generation (moved from inline to be accessible)
const sqlGenerated = computed(() => {
  if (!selectedDatasetId.value) return ''
  const safeId = (s?: string) => !!s && /^[a-zA-Z0-9_]+$/.test(s)
  const wrap = (s: string) => `\`${s}\``
  const table = wrap(selectedDatasetId.value)
  const qualify = (f: { fieldId?: string; table?: string } | null | undefined): string | null => {
    if (!f || !safeId(f.fieldId)) return null
    const col = wrap(f.fieldId as string)
    if (f.table && safeId(f.table)) {
      return `${wrap(f.table)}.${col}`
    }
    return col
  }
  const selectParts: string[] = []
  const groupByParts: string[] = []
  ;[...xDimensions.value, ...breakdowns.value].forEach((d: any) => {
    const expr = qualify(d)
    if (expr) {
      selectParts.push(`${expr} AS ${wrap(d.fieldId)}`)
      groupByParts.push(expr)
    }
  })
  yMetrics.value.forEach((m: any) => {
    const expr = qualify(m)
    if (!expr) return
    let agg = (m.aggregation || (m.isNumeric ? 'SUM' : 'COUNT')).toUpperCase()
    if (!['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'].includes(agg)) agg = m.isNumeric ? 'SUM' : 'COUNT'
    const alias = `${agg.toLowerCase()}_${m.fieldId}`
    selectParts.push(`${agg}(${expr}) AS ${wrap(alias)}`)
  })
  if (!selectParts.length) return ''
  const limit = 100
  return [
    'SELECT',
    selectParts.join(', '),
    'FROM',
    table,
    groupByParts.length ? 'GROUP BY ' + groupByParts.join(', ') : '',
    'LIMIT ' + limit
  ].filter(Boolean).join(' ')
})

onMounted(async () => {
  connectionsLoading.value = true
  connections.value = await listConnections()
  connectionsLoading.value = false
  
  // Seed from URL if present
  const url = new URL(window.location.href)
  const cid = url.searchParams.get('data_connection_id')
  const chartIdParam = url.searchParams.get('chartId')
  const dashboardIdParam = url.searchParams.get('dashboard_id')

  if (cid) {
    connectionId.value = Number(cid)
    setSelectedConnectionId(connectionId.value)
  }

  if (dashboardIdParam) {
    dashboardId.value = dashboardIdParam
  }

  // Load chart if chartId is provided
  if (chartIdParam) {
    try {
      editingChartId.value = Number(chartIdParam)
      const chart = await getChart(editingChartId.value)
      if (chart?.state) {
        // Include chart name from the main chart object
        chartName.value = chart.name || null
        await loadChartFromState({...chart.state, chartName: chart.name})
      }
    } catch (error) {
      console.error('Failed to load chart:', error)
      editingChartId.value = null
    }
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



