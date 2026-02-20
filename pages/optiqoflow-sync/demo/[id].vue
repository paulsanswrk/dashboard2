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
        <p class="text-gray-600 dark:text-gray-400">Select which tables and columns to synchronize for this tenant.</p>
      </div>

      <!-- Tables Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <!-- Header with actions -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <Icon name="i-heroicons-circle-stack" class="w-5 h-5 text-gray-500 dark:text-gray-400"/>
              <span class="text-lg font-semibold text-gray-900 dark:text-white">Tables to Sync</span>
              <UBadge color="gray" variant="subtle" class="gap-1">
                <Icon name="i-heroicons-table-cells" class="w-3 h-3"/>
                {{ formData.tables_to_sync.length }} / {{ SYNCABLE_TABLES.length }} tables
              </UBadge>
            </div>
            
            <div class="flex flex-col gap-2">
              <!-- Quick Actions -->
              <div class="flex gap-2 justify-end">
                 <button 
                  @click="applyPreset('acme')"
                  class="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-colors"
                  title="Apply Acme Cleaning Co preset"
                >
                  Acme Preset
                </button>
                <button 
                  @click="applyPreset('beta')"
                  class="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer transition-colors"
                  title="Apply Beta Facilities preset"
                >
                  Beta Preset
                </button>
              </div>

              <!-- Standard Actions -->
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
            <div v-show="expandedCategories.has(category)" class="p-3 space-y-2">
              <div
                v-for="table in tables"
                :key="table.name"
                class="rounded-lg border transition-colors"
                :class="formData.tables_to_sync.includes(table.name)
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'"
              >
                <!-- Table Row -->
                <div class="flex items-center gap-3 p-2.5">
                  <input
                    type="checkbox"
                    :checked="formData.tables_to_sync.includes(table.name)"
                    @change="toggleTable(table.name)"
                    class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <div
                    class="flex-1 min-w-0 cursor-pointer"
                    @click="handleRowClick(table.name)"
                  >
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ table.label }}</p>
                    <div class="flex items-center gap-1.5">
                      <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ table.name }}</p>
                      <span
                        v-if="rowCounts[table.name] !== undefined"
                        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        :class="rowCounts[table.name] > 0
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
                      >
                        {{ rowCounts[table.name].toLocaleString() }} {{ rowCounts[table.name] === 1 ? 'row' : 'rows' }}
                      </span>
                      <!-- Column count badge -->
                      <span
                        v-if="formData.tables_to_sync.includes(table.name) && allColumns[table.name]"
                        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        :class="getColumnBadgeClass(table.name)"
                      >
                        {{ getColumnCountLabel(table.name) }}
                      </span>
                    </div>
                  </div>
                  <!-- Expand columns button (only for selected tables with columns) -->
                  <button
                    v-if="formData.tables_to_sync.includes(table.name) && allColumns[table.name]"
                    @click.stop="toggleColumnPanel(table.name)"
                    class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    :title="expandedColumnTables.has(table.name) ? 'Hide columns' : 'Choose columns'"
                  >
                    <Icon
                      :name="expandedColumnTables.has(table.name) ? 'i-heroicons-chevron-up' : 'i-heroicons-view-columns'"
                      class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    />
                  </button>
                </div>

                <!-- Column Picker (expandable) -->
                <div
                  v-if="formData.tables_to_sync.includes(table.name) && expandedColumnTables.has(table.name) && allColumns[table.name]"
                  class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-3 py-2.5"
                >
                  <!-- Column controls -->
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Columns</span>
                    <div class="flex items-center gap-2">
                      <button
                        @click="selectAllColumns(table.name)"
                        class="text-[11px] px-2 py-0.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        All
                      </button>
                      <button
                        @click="deselectAllColumns(table.name)"
                        class="text-[11px] px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <!-- Column grid -->
                  <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1">
                    <label
                      v-for="col in allColumns[table.name]"
                      :key="col.name"
                      class="flex items-center gap-2 px-2 py-1.5 rounded transition-colors group"
                      :class="[
                        isColumnSelected(table.name, col.name) ? 'bg-blue-50/50 dark:bg-blue-900/10' : '',
                        isMandatoryColumn(col.name) ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40'
                      ]"
                    >
                      <input
                        type="checkbox"
                        :checked="isColumnSelected(table.name, col.name)"
                        :disabled="isMandatoryColumn(col.name)"
                        @change="toggleColumn(table.name, col.name)"
                        class="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-100"
                        :class="isMandatoryColumn(col.name) ? 'cursor-default' : 'cursor-pointer'"
                      />
                      <span 
                        class="text-xs font-mono truncate"
                        :class="isMandatoryColumn(col.name) ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-800 dark:text-gray-200'"
                      >
                        {{ col.name }}
                      </span>
                      <Icon 
                        v-if="isMandatoryColumn(col.name)" 
                        name="i-heroicons-lock-closed" 
                        class="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0"
                        title="Mandatory column"
                      />
                      <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0 group-hover:hidden">{{ col.type }}</span>
                    </label>
                  </div>
                </div>
              </div>
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

interface ColumnMeta {
  name: string
  type: string
  nullable: boolean
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
const rowCounts = ref<Record<string, number>>({})
const allColumns = ref<Record<string, ColumnMeta[]>>({})
const expandedCategories = ref(new Set<string>())
const expandedColumnTables = ref(new Set<string>())

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

    const [data, countsData, columnsData] = await Promise.all([
      $fetch('/api/optiqoflow-sync/tenants-with-config', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }),
      $fetch('/api/optiqoflow-sync/table-row-counts', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).catch(() => ({ counts: {} })),
      $fetch('/api/optiqoflow-sync/table-columns', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }).catch(() => ({ columns: {} }))
    ])

    rowCounts.value = (countsData as any).counts || {}
    allColumns.value = (columnsData as any).columns || {}

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
      
      // Ensure mandatory columns are present in explicit lists
      Object.keys(formData.value.columns_to_sync).forEach(table => {
        ensureMandatoryColumns(table)
      })
    }
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || err.message || 'Failed to load tenant'
  } finally {
    loading.value = false
  }
})

// Ensure mandatory columns are always present in column arrays
function ensureMandatoryColumns(tableName: string) {
  const selected = formData.value.columns_to_sync[tableName]
  if (Array.isArray(selected)) {
    const tableCols = allColumns.value[tableName]
    if (!tableCols) return
    
    const mandatoryNames = tableCols
      .map(c => c.name)
      .filter(name => isMandatoryColumn(name))
      
    mandatoryNames.forEach(name => {
      if (!selected.includes(name)) {
        selected.push(name)
      }
    })
  }
}

// ── Presets ──
function applyPreset(preset: 'acme' | 'beta') {
  deselectAllTables()

  if (preset === 'acme') {
    const tables = [
      'tenants', 'profiles', 'teams', 'team_members', 'customers',
      'devices', 'device_tenants', 'device_models',
      'sites', 'rooms', 'work_orders'
    ]
    formData.value.tables_to_sync = tables

    // Tenants: Restricted columns
    if (allColumns.value['tenants']) {
      formData.value.columns_to_sync['tenants'] = ['id', 'name', 'created_at', 'updated_at']
    }

    // Rooms: Exclude healthcare columns
    if (allColumns.value['rooms']) {
      const excluded = ['patient_status', 'last_patient_checkout_at', 'requires_infection_cleaning', 'hygiene_code', 'bed_count']
      formData.value.columns_to_sync['rooms'] = allColumns.value['rooms']
        .map(c => c.name)
        .filter(n => !excluded.includes(n))
    }

    // Work Orders: Exclude healthcare columns
    if (allColumns.value['work_orders']) {
      const excluded = ['patient_checkout_time', 'infection_protocol_required', 'room_bed_number']
      formData.value.columns_to_sync['work_orders'] = allColumns.value['work_orders']
        .map(c => c.name)
        .filter(n => !excluded.includes(n))
    }
  } else if (preset === 'beta') {
    const tables = [
      'tenants', 'profiles', 'sites', 'rooms', 'healthcare_metrics', 'shifts'
    ]
    formData.value.tables_to_sync = tables

    // Tenants: Restricted columns
    if (allColumns.value['tenants']) {
      formData.value.columns_to_sync['tenants'] = ['id', 'name', 'created_at', 'updated_at']
    }
    
    // Others: Default is all columns (null/undefined in columns_to_sync means all)
  }

  // Ensure mandatory columns are present for all selected tables
  tables.forEach(t => ensureMandatoryColumns(t))

  toast.add({
    title: 'Preset Applied',
    description: `Applied ${preset === 'acme' ? 'Acme Cleaning Co' : 'Beta Facilities'} configuration preset.`,
    color: 'green'
  })
}

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
function handleRowClick(tableName: string) {
  if (formData.value.tables_to_sync.includes(tableName)) {
    // Already selected -> toggle columns if available
    if (allColumns.value[tableName]) {
      toggleColumnPanel(tableName)
    }
  } else {
    // Not selected -> select it
    toggleTable(tableName)
    // Auto-expand columns if available
    if (allColumns.value[tableName]) {
      expandedColumnTables.value.add(tableName)
      expandedColumnTables.value = new Set(expandedColumnTables.value)
    }
  }
}

function toggleTable(tableName: string) {
  const idx = formData.value.tables_to_sync.indexOf(tableName)
  if (idx >= 0) {
    formData.value.tables_to_sync.splice(idx, 1)
    // Clean up column selection when table is deselected
    delete formData.value.columns_to_sync[tableName]
    expandedColumnTables.value.delete(tableName)
    expandedColumnTables.value = new Set(expandedColumnTables.value)
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
  expandedColumnTables.value = new Set()
}

function toggleCategoryTables(category: string) {
  const categoryTables = tablesByCategory.value[category] || []
  const allSelected = categoryTables.every(t => formData.value.tables_to_sync.includes(t.name))

  if (allSelected) {
    formData.value.tables_to_sync = formData.value.tables_to_sync.filter(
      t => !categoryTables.some(ct => ct.name === t)
    )
    // Clean up column selections for deselected tables
    categoryTables.forEach(ct => {
      delete formData.value.columns_to_sync[ct.name]
      expandedColumnTables.value.delete(ct.name)
    })
    expandedColumnTables.value = new Set(expandedColumnTables.value)
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

// ── Column selection helpers ──
function toggleColumnPanel(tableName: string) {
  if (expandedColumnTables.value.has(tableName)) {
    expandedColumnTables.value.delete(tableName)
  } else {
    expandedColumnTables.value.add(tableName)
  }
  expandedColumnTables.value = new Set(expandedColumnTables.value)
}

function isColumnSelected(tableName: string, columnName: string): boolean {
  if (isMandatoryColumn(columnName)) return true
  const cols = formData.value.columns_to_sync[tableName]
  // null or undefined = all columns selected
  if (cols === null || cols === undefined) return true
  return cols.includes(columnName)
}

function isMandatoryColumn(columnName: string): boolean {
  const mandatory = ['id', 'tenant_id', 'created_at', 'updated_at']
  return mandatory.includes(columnName) || columnName.endsWith('_id')
}

function toggleColumn(tableName: string, columnName: string) {
  if (isMandatoryColumn(columnName)) return

  const tableCols = allColumns.value[tableName]
  if (!tableCols) return

  let selected = formData.value.columns_to_sync[tableName]

  // If null/undefined (= all), switching to explicit list minus this column
  if (selected === null || selected === undefined) {
    selected = tableCols.map(c => c.name).filter(n => n !== columnName)
  } else {
    const idx = selected.indexOf(columnName)
    if (idx >= 0) {
      selected.splice(idx, 1)
    } else {
      selected.push(columnName)
    }
  }

  // If all columns are selected (including mandatory ones which are always present in tableCols), reset to null (= all)
  if (selected.length === tableCols.length) {
    formData.value.columns_to_sync[tableName] = null
  } else {
    formData.value.columns_to_sync[tableName] = [...selected]
  }
}

function selectAllColumns(tableName: string) {
  // null means all columns
  formData.value.columns_to_sync[tableName] = null
}

function deselectAllColumns(tableName: string) {
  const tableCols = allColumns.value[tableName]
  if (!tableCols) {
    formData.value.columns_to_sync[tableName] = []
    return
  }

  // Only keep mandatory columns
  formData.value.columns_to_sync[tableName] = tableCols
    .map(c => c.name)
    .filter(name => isMandatoryColumn(name))
}

// Watch for changes to ensure mandatory columns are never lost
watch(() => formData.value.columns_to_sync, (newVal) => {
  Object.keys(newVal).forEach(table => {
    ensureMandatoryColumns(table)
  })
}, { deep: true })

function getColumnCountLabel(tableName: string): string {
  const total = allColumns.value[tableName]?.length || 0
  const cols = formData.value.columns_to_sync[tableName]
  if (cols === null || cols === undefined) return `${total} cols`
  return `${cols.length}/${total} cols`
}

function getColumnBadgeClass(tableName: string): string {
  const cols = formData.value.columns_to_sync[tableName]
  if (cols === null || cols === undefined) {
    // All selected
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
  }
  if (cols.length === 0) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }
  // Partial selection
  return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
}
</script>
