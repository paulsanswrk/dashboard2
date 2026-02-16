<template>
  <div class="p-4 lg:p-6 max-w-5xl mx-auto">
    <!-- Back Link -->
    <button @click="navigateTo('/optiqoflow-sync/demo')" class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 cursor-pointer transition-colors">
      <Icon name="i-heroicons-arrow-left" class="w-4 h-4"/>
      Back to Sync Demo
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-400 animate-spin mr-2"/>
      <span class="text-gray-500 dark:text-gray-400">Loading tenant configuration...</span>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <Icon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400 mx-auto mb-2"/>
      <p class="text-red-800 dark:text-red-200">{{ fetchError }}</p>
    </div>

    <!-- Main Content -->
    <template v-else-if="tenant">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          Demo Sync — {{ tenant.name }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">Select which tables to synchronize for this tenant.</p>
      </div>

      <!-- Tables Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <!-- Header with actions -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Icon name="i-heroicons-circle-stack" class="w-5 h-5 text-gray-500 dark:text-gray-400"/>
              <span class="text-lg font-semibold text-gray-900 dark:text-white">Tables to Sync</span>
              <UBadge color="gray" variant="subtle" class="gap-1">
                <Icon name="i-heroicons-table-cells" class="w-3 h-3"/>
                {{ formData.tables_to_sync.length }} / {{ SYNCABLE_TABLES.length }} tables
              </UBadge>
            </div>
            <div class="flex gap-2">
              <button @click="selectAllTables" class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                Select All
              </button>
              <button @click="deselectAllTables" class="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                Deselect All
              </button>
              <span class="border-l border-gray-300 dark:border-gray-600 mx-1"></span>
              <button @click="expandAllCategories" class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                Expand All
              </button>
              <button @click="collapseAllCategories" class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                Collapse All
              </button>
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div class="p-4 space-y-3">
          <div v-for="(tables, category) in tablesByCategory" :key="category" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <!-- Category Header -->
            <div class="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50">
              <button
                @click="toggleCategoryExpanded(category)"
                class="flex-1 flex items-center gap-3 text-left cursor-pointer"
              >
                <Icon
                  :name="expandedCategories.has(category) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                  class="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0"
                />
                <span class="text-base font-semibold text-gray-900 dark:text-white">{{ category }}</span>
                <UBadge
                  :color="getCategoryBadgeColor(tables)"
                  variant="subtle"
                  class="ml-1"
                >
                  {{ getCategorySelectedCount(tables) }}/{{ tables.length }} tables
                </UBadge>
              </button>
              <input
                type="checkbox"
                :checked="isCategoryAllSelected(tables)"
                :indeterminate="isCategorySomeSelected(tables)"
                @change="toggleCategoryTables(category)"
                class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 cursor-pointer"
              />
            </div>

            <!-- Category Tables -->
            <div v-show="expandedCategories.has(category)" class="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              <label
                v-for="table in tables"
                :key="table.name"
                class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
                :class="formData.tables_to_sync.includes(table.name)
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'"
              >
                <input
                  type="checkbox"
                  :checked="formData.tables_to_sync.includes(table.name)"
                  @change="toggleTable(table.name)"
                  class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ table.label }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ table.name }}</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="mt-6 flex items-center justify-end gap-3">
        <button
          @click="handleFullSync"
          :disabled="formData.tables_to_sync.length === 0"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="i-heroicons-arrow-path" class="w-4 h-4"/>
          Sync
        </button>
        <button
          @click="navigateTo('/optiqoflow-sync/demo')"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          @click="handleSave"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
          {{ tenant.sync_config ? 'Save Changes' : 'Create Configuration' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { userProfile } = useAuth()

// ── Types ──
interface SyncConfig {
  id: string
  tenant_id: string
  tables_to_sync: string[]
  columns_to_sync: Record<string, string[] | null>
  is_active: boolean
  sync_deletes: boolean
}

interface TenantWithSync {
  id: string
  name: string
  sync_config: SyncConfig | null
}

// ── Syncable Tables ──
const SYNCABLE_TABLES = [
  { name: 'tenants', label: 'Tenant Info (id, name)', category: 'Organization' },
  { name: 'profiles', label: 'Profiles', category: 'Organization' },
  { name: 'teams', label: 'Teams', category: 'Organization' },
  { name: 'team_members', label: 'Team Members', category: 'Organization' },
  { name: 'customers', label: 'Customers', category: 'Organization' },
  { name: 'contracts', label: 'Contracts', category: 'Organization' },
  { name: 'devices', label: 'Devices', category: 'Devices' },
  { name: 'device_tenants', label: 'Device-Tenant Links', category: 'Devices' },
  { name: 'device_models', label: 'Device Models', category: 'Devices' },
  { name: 'sites', label: 'Sites', category: 'Locations' },
  { name: 'rooms', label: 'Rooms', category: 'Locations' },
  { name: 'work_orders', label: 'Work Orders', category: 'Operations' },
  { name: 'quality_inspections', label: 'Quality Inspections', category: 'Operations' },
  { name: 'inspection_rooms', label: 'Inspection Rooms', category: 'Operations' },
  { name: 'shifts', label: 'Shifts', category: 'Operations' },
  { name: 'work_entries', label: 'Work Entries', category: 'Operations' },
  { name: 'healthcare_metrics', label: 'Healthcare Metrics', category: 'Healthcare' },
  { name: 'sustainability_metrics', label: 'Sustainability Metrics', category: 'Sustainability' },
  { name: 'chemical_usage', label: 'Chemical Usage', category: 'Sustainability' },
  { name: 'notifications', label: 'Notifications', category: 'System' },
  { name: 'activity_log', label: 'Activity Log', category: 'System' },
] as const

// ── State ──
const loading = ref(true)
const fetchError = ref<string | null>(null)
const saving = ref(false)
const tenant = ref<TenantWithSync | null>(null)
const expandedCategories = ref(new Set<string>())

const formData = ref({
  tables_to_sync: [] as string[],
  columns_to_sync: {} as Record<string, string[] | null>,
})

// ── Computed ──
const tablesByCategory = computed(() => {
  const grouped: Record<string, typeof SYNCABLE_TABLES[number][]> = {}
  SYNCABLE_TABLES.forEach(table => {
    if (!grouped[table.category]) {
      grouped[table.category] = []
    }
    grouped[table.category].push(table)
  })
  return grouped
})

// ── Fetch tenant data ──
onMounted(async () => {
  if (userProfile.value && userProfile.value.role !== 'SUPERADMIN') {
    fetchError.value = 'Access denied. Only superadmins can access sync configuration.'
    loading.value = false
    return
  }

  try {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      fetchError.value = 'Not authenticated'
      return
    }

    const data = await $fetch('/api/optiqoflow-sync/tenants-with-config', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })

    const tenantId = route.params.id as string
    const found = (data as any).tenants.find((t: TenantWithSync) => t.id === tenantId)

    if (!found) {
      fetchError.value = 'Tenant not found'
      return
    }

    tenant.value = found

    // Pre-fill form
    if (found.sync_config) {
      formData.value = {
        tables_to_sync: [...(found.sync_config.tables_to_sync || [])],
        columns_to_sync: { ...(found.sync_config.columns_to_sync || {}) },
      }
    }
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || err.message || 'Failed to load tenant'
  } finally {
    loading.value = false
  }
})

// ── Save ──
async function handleSave() {
  if (!tenant.value) return
  saving.value = true
  try {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const payload: any = {
      tables_to_sync: formData.value.tables_to_sync,
      columns_to_sync: formData.value.columns_to_sync,
    }

    if (tenant.value.sync_config) {
      payload.id = tenant.value.sync_config.id
    } else {
      payload.tenant_id = tenant.value.id
    }

    await $fetch('/api/optiqoflow-sync/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: payload,
    })

    toast.add({
      title: 'Success',
      description: `Sync configuration ${tenant.value.sync_config ? 'updated' : 'created'} for ${tenant.value.name}`,
      color: 'green'
    })

    navigateTo('/optiqoflow-sync/demo')
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.data?.statusMessage || 'Failed to save configuration',
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}

// ── Demo-only sync ──
// ── Demo-only sync ──
async function handleFullSync() {
  if (!tenant.value) return
  
  const tables = formData.value.tables_to_sync
  if (tables.length === 0) return

  loading.value = true
  try {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await $fetch('/api/optiqoflow-sync/run-demo-sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        tenantId: tenant.value.id,
        tables
      }
    })

    toast.add({
      title: 'Sync Complete',
      description: `Successfully synced ${tables.length} tables from demo source.`,
      color: 'green'
    })
  } catch (err: any) {
    console.error('Sync error:', err)
    toast.add({
      title: 'Sync Failed',
      description: err.data?.statusMessage || 'Failed to sync demo data',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

// ── Table selection helpers ──
function toggleTable(tableName: string) {
  const idx = formData.value.tables_to_sync.indexOf(tableName)
  if (idx >= 0) {
    formData.value.tables_to_sync.splice(idx, 1)
  } else {
    formData.value.tables_to_sync.push(tableName)
  }
}

function selectAllTables() {
  formData.value.tables_to_sync = SYNCABLE_TABLES.map(t => t.name)
  formData.value.columns_to_sync = {}
}

function deselectAllTables() {
  formData.value.tables_to_sync = []
  formData.value.columns_to_sync = {}
}

function toggleCategoryTables(category: string) {
  const categoryTables = tablesByCategory.value[category] || []
  const allSelected = categoryTables.every(t => formData.value.tables_to_sync.includes(t.name))

  if (allSelected) {
    formData.value.tables_to_sync = formData.value.tables_to_sync.filter(
      t => !categoryTables.some(ct => ct.name === t)
    )
  } else {
    const newTables = categoryTables.map(t => t.name).filter(n => !formData.value.tables_to_sync.includes(n))
    formData.value.tables_to_sync.push(...newTables)
  }
}

function toggleCategoryExpanded(category: string) {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
  expandedCategories.value = new Set(expandedCategories.value)
}

function expandAllCategories() {
  expandedCategories.value = new Set(Object.keys(tablesByCategory.value))
}

function collapseAllCategories() {
  expandedCategories.value = new Set()
}

function getCategorySelectedCount(tables: readonly { name: string }[]) {
  return tables.filter(t => formData.value.tables_to_sync.includes(t.name)).length
}

function isCategoryAllSelected(tables: readonly { name: string }[]) {
  return tables.length > 0 && tables.every(t => formData.value.tables_to_sync.includes(t.name))
}

function isCategorySomeSelected(tables: readonly { name: string }[]) {
  const count = getCategorySelectedCount(tables)
  return count > 0 && count < tables.length
}

function getCategoryBadgeColor(tables: readonly { name: string }[]) {
  if (isCategoryAllSelected(tables)) return 'green'
  if (isCategorySomeSelected(tables)) return 'blue'
  return 'gray'
}
</script>
