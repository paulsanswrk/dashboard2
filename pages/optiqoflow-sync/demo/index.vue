<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">OptiqoFlow Sync Demo</h1>
      <p class="text-gray-600 dark:text-gray-400">View and manage data synchronization for each tenant.</p>
    </div>

    <!-- Access Denied -->
    <div v-if="accessDenied" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <Icon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400 mx-auto mb-2"/>
      <p class="text-red-800 dark:text-red-200 font-medium">Access Denied</p>
      <p class="text-red-600 dark:text-red-300 text-sm">Only superadmins can access sync configuration.</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex items-center justify-center py-20">
      <Icon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-400 animate-spin mr-2"/>
      <span class="text-gray-500 dark:text-gray-400">Loading tenant sync configuration...</span>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <Icon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400 mx-auto mb-2"/>
      <p class="text-red-800 dark:text-red-200">{{ fetchError }}</p>
      <button @click="fetchTenants" class="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 cursor-pointer transition-colors">
        Retry
      </button>
    </div>

    <!-- Tenant Table -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2">
          <Icon name="i-heroicons-circle-stack" class="w-5 h-5 text-gray-500 dark:text-gray-400"/>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tenant Sync Status (Demo)</h2>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage data synchronization settings for each tenant.</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th class="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tenant</th>
              <th class="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tables</th>
              <th class="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Last Sync</th>
              <th class="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in tenants" :key="tenant.id" class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ tenant.name }}</td>
              <td class="px-4 py-3">
                <UBadge v-if="tenant.sync_config?.is_active" color="green" variant="subtle" class="gap-1">
                  <Icon name="i-heroicons-cloud" class="w-3 h-3"/>
                  Active
                </UBadge>
                <UBadge v-else-if="tenant.sync_config" color="gray" variant="subtle" class="gap-1">
                  <Icon name="i-heroicons-cloud-arrow-down" class="w-3 h-3"/>
                  Inactive
                </UBadge>
                <UBadge v-else color="neutral" variant="outline" class="gap-1">
                  Not Configured
                </UBadge>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ tenant.sync_config?.tables_to_sync?.length || 0 }} tables
              </td>
              <td class="px-4 py-3">
                <span v-if="tenant.sync_config?.last_sync_at" class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Icon v-if="tenant.sync_config.last_error" name="i-heroicons-exclamation-circle" class="w-4 h-4 text-red-500"/>
                  <Icon v-else name="i-heroicons-check-circle" class="w-4 h-4 text-green-500"/>
                  {{ formatTimeAgo(tenant.sync_config.last_sync_at) }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2 text-right">
                  <button
                    v-if="tenant.sync_config"
                    @click="resetSync(tenant.id)"
                    :disabled="resettingTenant === tenant.id"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear database and reset sync status"
                  >
                    <Icon v-if="resettingTenant === tenant.id" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
                    <Icon v-else name="i-heroicons-arrow-path-rounded-square" class="w-4 h-4"/>
                    Reset
                  </button>
                  <button
                    @click="navigateTo(`/optiqoflow-sync/demo/${tenant.id}`)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <Icon name="i-heroicons-cog-6-tooth" class="w-4 h-4"/>
                    Configure
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { userProfile } = useAuth()

interface SyncConfig {
  id: string
  tenant_id: string
  tables_to_sync: string[]
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
}

interface TenantWithSync {
  id: string
  name: string
  sync_config: SyncConfig | null
}

const accessDenied = ref(false)
const loading = ref(true)
const fetchError = ref<string | null>(null)
const tenants = ref<TenantWithSync[]>([])
const resettingTenant = ref<string | null>(null)

watch(() => userProfile.value, (profile) => {
  if (profile) {
    if (profile.role !== 'SUPERADMIN') {
      accessDenied.value = true
      loading.value = false
    } else {
      fetchTenants()
    }
  }
}, { immediate: true })

async function fetchTenants() {
  loading.value = true
  fetchError.value = null
  try {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      accessDenied.value = true
      return
    }

    const data = await $fetch('/api/optiqoflow-sync/tenants-with-config', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    tenants.value = (data as any).tenants
  } catch (err: any) {
    fetchError.value = err.data?.statusMessage || err.message || 'Failed to load tenants'
  } finally {
    loading.value = false
  }
}

async function resetSync(tenantId: string) {
  if (!confirm('Are you sure you want to clear all synced data and reset sync status for this tenant? This action cannot be undone.')) return

  resettingTenant.value = tenantId
  try {
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    await $fetch('/api/optiqoflow-sync/reset-demo-sync', {
      method: 'POST',
      body: { tenantId },
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    
    // Refresh the list to show updated status
    await fetchTenants()
  } catch (err: any) {
    alert(err.data?.statusMessage || err.message || 'Failed to reset sync')
  } finally {
    resettingTenant.value = null
  }
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
</script>
