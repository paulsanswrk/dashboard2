<template>
  <div class="p-6">
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <UButton color="orange" @click="navigateTo('/integration-wizard')" class="w-fit cursor-pointer hover:bg-orange-600 ">
          <Icon name="i-heroicons-plus" class="w-4 h-4 mr-2"/>
          add data source
        </UButton>
        <div class="text-sm text-gray-600 text-center sm:text-right">{{ connections.length }} / 20 DATA SOURCES USED</div>
      </div>
    </div>

    <div class="max-w-2xl mx-auto">
      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <Icon name="i-heroicons-magnifying-glass" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
          <UInput 
            placeholder="Search" 
            class="pl-10 w-full"
            v-model="searchQuery"
          />
        </div>
      </div>

      <div class="space-y-6">
        <!-- Databases Section (from DB) -->
        <div>
          <h3 class="text-lg font-medium mb-4 text-primary">DATABASES</h3>
          <div v-if="loadingConnections" class="text-sm text-gray-500">Loading connections...</div>
          <template v-else>
            <UCard
              v-for="c in filteredConnections"
              :key="c.id"
              class="hover:shadow-md transition-shadow mb-4 cursor-pointer"
              @click="goToBuilder(c.id)"
            >
              <div class="flex items-start justify-between p-4">
                <div class="flex items-center gap-4">
                  <Icon name="i-heroicons-circle-stack" class="w-8 h-8 text-gray-400"/>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <NuxtLink :to="`/reporting/builder?data_connection_id=${c.id}`" class="font-medium truncate hover:text-primary hover:underline" @click.stop>
                        {{ c.internal_name }}
                      </NuxtLink>
                      <!-- Sync Status Badge -->
                      <UBadge
                          v-if="getSyncStatus(c.id)"
                          :color="getSyncStatusColor(getSyncStatus(c.id)!) as any"
                          variant="soft"
                          size="xs"
                      >
                        <Icon v-if="getSyncStatus(c.id) === 'syncing'" name="i-heroicons-arrow-path" class="w-3 h-3 mr-1 animate-spin"/>
                        {{ getSyncStatusLabel(getSyncStatus(c.id)!) }}
                      </UBadge>
                    </div>
                    <p class="text-sm text-gray-600 truncate">{{ c.database_type?.toUpperCase?.() }} • {{ c.host }}:{{ c.port }}</p>
                    <!-- Usage info -->
                    <p v-if="getUsageText(c)" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <Icon name="i-heroicons-exclamation-triangle" class="w-3 h-3 inline mr-1"/>
                      {{ getUsageText(c) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2" @click.stop>
                  <NuxtLink 
                    v-if="!c.is_immutable"
                    :to="`/integration-wizard?id=${c.id}`" 
                    class="inline-flex items-center px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    @click.stop
                  >
                    <Icon name="i-heroicons-pencil-square" class="w-4 h-4 mr-1"/>
                    Edit
                  </NuxtLink>
                  <UButton v-if="!c.is_immutable" size="xs" variant="outline" color="gray" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="openRenameModal(c)">
                    <Icon name="i-heroicons-squares-2x2" class="w-4 h-4 mr-1"/>
                    Rename
                  </UButton>
                  <template v-if="!c.is_immutable">
                    <UTooltip v-if="isDeleteDisabled(c)" text="Connection in use. Only Admins can delete.">
                      <UButton 
                        size="xs" 
                        color="red" 
                        class="opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <Icon name="i-heroicons-trash" class="w-4 h-4 mr-1"/>
                        Delete
                      </UButton>
                    </UTooltip>
                    <UButton 
                      v-else
                      size="xs" 
                      color="red" 
                      class="bg-red-500 hover:bg-red-600 text-white cursor-pointer" 
                      @click="openDeleteModal(c)"
                    >
                      <Icon name="i-heroicons-trash" class="w-4 h-4 mr-1"/>
                      Delete
                    </UButton>
                  </template>
                  <NuxtLink 
                    :to="`/reporting/builder?data_connection_id=${c.id}`" 
                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md cursor-pointer"
                    @click.stop
                  >
                    Open
                  </NuxtLink>
                </div>
              </div>
            </UCard>
            <div v-if="!filteredConnections.length" class="text-sm text-gray-500">No data sources found.</div>
          </template>
        </div>

        <!-- Demo Data Sources Section -->
        <div v-if="false">
          <h3 class="text-lg font-medium mb-4 text-primary">DEMO DATA SOURCES</h3>
          <div v-if="loadingDemos" class="text-sm text-gray-500">Loading demos...</div>
          <template v-else>
            <UCard 
              v-for="d in filteredDemos" 
              :key="d.id"
              class="hover:shadow-md transition-shadow cursor-pointer mb-4"
              @click="importDemo(d)"
            >
              <div class="flex items-center gap-4 p-4">
                <Icon name="i-heroicons-bookmark" class="w-8 h-8 text-gray-400"/>
                <div>
                  <h4 class="font-medium">{{ d.label }}</h4>
                  <p class="text-sm text-gray-600">{{ d.description }}</p>
                </div>
              </div>
            </UCard>
            <div v-if="!filteredDemos.length" class="text-sm text-gray-500">No demos available.</div>
          </template>
        </div>

        <!-- Flat Files Section (hidden temporarily) -->
        <div v-if="false"></div>
      </div>
    </div>

    <!-- Rename Connection Modal -->
    <RenameConnectionModal
        v-model:is-open="showRenameModal"
        :connection="selectedConnection"
        :loading="renameLoading"
        @close-modal="closeRenameModal"
        @confirm-rename="handleRename"
    />

    <!-- Delete Connection Modal -->
    <DeleteConnectionModal
        v-model:is-open="showDeleteModal"
        :connection="selectedConnection"
        :usage="selectedConnectionUsage"
        :user-role="userProfile?.role"
        :loading="deleteLoading"
        :deletion-result="deletionResult"
        @close-modal="closeDeleteModal"
        @confirm-delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import {useAuth} from '~/composables/useAuth'
// Modal components
import RenameConnectionModal from '~/components/RenameConnectionModal.vue'
import DeleteConnectionModal from '~/components/DeleteConnectionModal.vue'

const { userProfile } = useAuth()

const searchQuery = ref('')

interface ConnectionWithUsage {
  id: number
  internal_name: string
  database_name: string
  database_type: string
  host: string
  port: number
  organization_id: string
  storage_location?: string
  is_immutable?: boolean
  chartsCount: number
  dashboardsCount: number
  filtersCount: number
}

interface ConnectionUsage {
  connectionId: number
  isUsed: boolean
  charts: { count: number; items: Array<{ id: number; name: string }> }
  dashboards: { count: number; items: Array<{ id: string; name: string }> }
  filters: { count: number }
}

interface DeletionResult {
  success: boolean
  deletedCharts: number
  deletedWidgets: number
  clearedFilters: number
}

const connections = ref<ConnectionWithUsage[]>([])
const demos = ref<Array<{ id: string; label: string; description?: string }>>([])

const loadingConnections = ref(true)
const loadingDemos = ref(true)

// Modal states
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const selectedConnection = ref<any>(null)
const selectedConnectionUsage = ref<ConnectionUsage | null>(null)
const renameLoading = ref(false)
const deleteLoading = ref(false)
const deletionResult = ref<DeletionResult | null>(null)

// Sync status for each connection
const syncStatuses = ref<Record<number, string>>({})

const filteredConnections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return connections.value
  return connections.value.filter(c =>
    c.internal_name.toLowerCase().includes(q) ||
    (c.host || '').toLowerCase().includes(q)
  )
})

const filteredDemos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return demos.value
  return demos.value.filter(d =>
    (d.label || '').toLowerCase().includes(q) ||
    (d.description || '').toLowerCase().includes(q)
  )
})

function getUsageText(conn: ConnectionWithUsage): string | null {
  if (conn.chartsCount === 0 && conn.dashboardsCount === 0 && conn.filtersCount === 0) return null
  
  const parts: string[] = []
  if (conn.chartsCount > 0) {
    parts.push(`${conn.chartsCount} chart${conn.chartsCount !== 1 ? 's' : ''}`)
  }
  if (conn.filtersCount > 0) {
    parts.push(`${conn.filtersCount} filter${conn.filtersCount !== 1 ? 's' : ''}`)
  }
  if (conn.dashboardsCount > 0) {
    parts.push(`${conn.dashboardsCount} dashboard${conn.dashboardsCount !== 1 ? 's' : ''}`)
  }
  
  return `Used by ${parts.join(', ')}`
}

function isDeleteDisabled(conn: ConnectionWithUsage): boolean {
  const isUsed = conn.chartsCount > 0 || conn.dashboardsCount > 0 || conn.filtersCount > 0
  if (!isUsed) return false
  
  // Editors cannot delete connections in use
  const role = userProfile.value?.role
  return role === 'EDITOR'
}

async function loadConnections() {
  try {
    connections.value = await $fetch<ConnectionWithUsage[]>('/api/reporting/connections')
    // Load sync status for connections with internal storage
    for (const conn of connections.value) {
      if (conn.storage_location === 'internal') {
        loadSyncStatus(conn.id)
      }
    }
  } finally {
    loadingConnections.value = false
  }
}

async function loadSyncStatus(connectionId: number) {
  try {
    const response = await $fetch('/api/data-transfer/status', {
      params: {connectionId}
    })
    if (response.syncStatus && response.syncStatus !== 'no_sync') {
      syncStatuses.value[connectionId] = response.syncStatus
    }
  } catch (e) {
    // Silently fail - connection may not have sync configured
  }
}

function getSyncStatus(connectionId: number): string | null {
  return syncStatuses.value[connectionId] || null
}

function getSyncStatusColor(status: string): string {
  switch (status) {
    case 'syncing':
    case 'queued':
      return 'blue'
    case 'completed':
      return 'green'
    case 'error':
      return 'red'
    case 'idle':
      return 'gray'
    default:
      return 'gray'
  }
}

function getSyncStatusLabel(status: string): string {
  switch (status) {
    case 'syncing':
      return 'Syncing'
    case 'queued':
      return 'Queued'
    case 'completed':
      return 'Synced'
    case 'error':
      return 'Error'
    case 'idle':
      return 'Scheduled'
    default:
      return status
  }
}

async function loadDemos() {
  try {
    demos.value = await $fetch('/api/data-sources/demos')
  } finally {
    loadingDemos.value = false
  }
}

function goToBuilder(connectionId: number) {
  navigateTo(`/reporting/builder?data_connection_id=${connectionId}`)
}

function editConnection(connectionId: number) {
  navigateTo(`/integration-wizard?id=${connectionId}`)
}

function openRenameModal(connection: any) {
  selectedConnection.value = connection
  showRenameModal.value = true
}

async function openDeleteModal(connection: ConnectionWithUsage) {
  selectedConnection.value = connection
  deletionResult.value = null
  showDeleteModal.value = true
  
  // Fetch detailed usage info for the modal (need chart/dashboard names)
  if (connection.chartsCount > 0 || connection.dashboardsCount > 0) {
    try {
      const usage = await $fetch<ConnectionUsage>(`/api/reporting/connections/${connection.id}/usage`)
      selectedConnectionUsage.value = usage
    } catch (e) {
      console.warn('Failed to fetch detailed usage:', e)
      // Fallback to basic info from the connection
      selectedConnectionUsage.value = {
        connectionId: connection.id,
        isUsed: true,
        charts: { count: connection.chartsCount, items: [] },
        dashboards: { count: connection.dashboardsCount, items: [] },
        filters: { count: 0 }
      }
    }
  } else {
    selectedConnectionUsage.value = null
  }
}

function closeRenameModal() {
  showRenameModal.value = false
  selectedConnection.value = null
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedConnection.value = null
  selectedConnectionUsage.value = null
  deletionResult.value = null
}

async function handleRename({id, newName}: { id: number; newName: string }) {
  renameLoading.value = true
  try {
    await $fetch('/api/reporting/connections', {
      method: 'PUT',
      params: {id},
      body: {internal_name: newName}
    })
    await loadConnections()
    closeRenameModal()
  } catch (e) {
    console.error('Failed to rename connection', e)
  } finally {
    renameLoading.value = false
  }
}

async function handleDelete(cascadeDelete: boolean = false) {
  if (!selectedConnection.value) return

  deleteLoading.value = true
  try {
    const result = await $fetch<DeletionResult>('/api/reporting/connections', {
      method: 'DELETE',
      params: { 
        id: selectedConnection.value.id,
        cascadeDelete: cascadeDelete ? 'true' : 'false'
      }
    })
    
    deletionResult.value = result
    
    // If deletion succeeded, refresh the list
    if (result.success) {
      await loadConnections()
    }
  } catch (e: any) {
    console.error('Failed to delete connection', e)
    // Show error in the modal
    deletionResult.value = {
      success: false,
      deletedCharts: 0,
      deletedWidgets: 0,
      clearedFilters: 0
    }
  } finally {
    deleteLoading.value = false
  }
}

async function importDemo(demo: any) {
  try {
    const res = await $fetch<{ connectionId?: number }>('/api/data-sources/import', { method: 'POST', body: { id: demo.id } })
    if (res?.connectionId) {
      await loadConnections()
      goToBuilder(res.connectionId)
    }
  } catch (e) {
    console.error('Failed to import demo:', e)
  }
}

onMounted(() => {
  loadConnections()
  loadDemos()
})
</script>
