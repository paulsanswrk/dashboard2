<template>
  <div class="p-6 space-y-6">
    <!-- Welcome Message -->
    <UAlert
      v-if="showWelcomeMessage"
      color="green"
      variant="soft"
      title="Welcome to Optiqo Admin!"
      description="You have admin access to manage your organization's data and users."
      class="mb-6"
      @close="showWelcomeMessage = false"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-600 dark:text-gray-300"/>
      <span class="ml-2 text-gray-600 dark:text-gray-300">Loading dashboard data...</span>
    </div>

    <!-- Error State -->
    <UAlert
        v-if="error && !loading"
        color="red"
        variant="soft"
        title="Error Loading Dashboard"
        :description="error"
        class="mb-6"
    />

    <!-- Main Content -->
    <div v-if="!loading && !error" class="flex justify-between items-center">
      <h1 class="text-2xl font-heading font-bold tracking-tight">
        Admin Dashboard - {{ userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Admin' }}
      </h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Organization Overview -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">Organization Overview</h3>
        </template>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ organizationStats.charts }}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Total Charts</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ organizationStats.dashboards }}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Dashboards</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ organizationStats.users }}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Users</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ organizationStats.viewers }}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Viewers</p>
          </div>
        </div>
      </UCard>

    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Users Management -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Users +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/admin/users')">
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-2"/>
              Manage All Users
            </UButton>
            <div class="space-y-1">
              <div v-for="user in recentUsers" :key="user.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="i-heroicons-user" class="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                <span class="text-sm text-gray-700 dark:text-gray-200">{{ user.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Viewers Management -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Viewers +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/admin/viewers')">
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-2"/>
              Manage All Viewers
            </UButton>
            <div class="space-y-1">
              <div v-for="viewer in recentViewers" :key="viewer.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="i-heroicons-eye" class="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                <span class="text-sm text-gray-700 dark:text-gray-200">{{ viewer.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Organizations Management -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Organizations +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/organizations')">
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-2"/>
              Manage Organizations
            </UButton>
            <div class="space-y-1">
              <div v-for="org in recentOrganizations" :key="org.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="i-heroicons-building-office" class="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                <span class="text-sm text-gray-700 dark:text-gray-200">{{ org.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- System Settings -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">System Settings</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/account')">
              <Icon name="i-heroicons-cog-6-tooth" class="w-4 h-4 mr-2"/>
              Account Settings
            </UButton>
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/billing')">
              <Icon name="i-heroicons-credit-card" class="w-4 h-4 mr-2"/>
              Billing
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Authentication
const { userProfile } = useAuth()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

// Welcome message state
const showWelcomeMessage = ref(false)

// Check if this is a new admin user (from query params)
const route = useRoute()
if (route.query.welcome === 'true') {
  showWelcomeMessage.value = true
}

// Organization statistics
const organizationStats = ref({
  charts: 0,
  dashboards: 0,
  users: 0,
  viewers: 0
})

// Recent activities
const recentActivities = ref([])

// Recent users
const recentUsers = ref([])

// Recent viewers
const recentViewers = ref([])

// Recent organizations
const recentOrganizations = ref([])

// Loading and error states
const loading = ref(true)
const error = ref(null)

// Fetch admin dashboard data
const fetchDashboardData = async () => {
  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const {data: {session}} = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch('/api/admin/dashboard', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (response.success) {
      organizationStats.value = response.data.organizationStats
      recentActivities.value = response.data.recentActivities
      recentUsers.value = response.data.recentUsers
      recentViewers.value = response.data.recentViewers
      recentOrganizations.value = response.data.recentOrganizations
    } else {
      throw new Error(response.error || 'Failed to fetch dashboard data')
    }
  } catch (err) {
    error.value = err.message || 'Failed to load dashboard data'
    console.error('Error fetching dashboard data:', err)
  } finally {
    loading.value = false
  }
}

// Watch for user authentication and fetch data
const user = useSupabaseUser()
watch(user, async (newUser) => {
  if (newUser) {
    await fetchDashboardData()
  } else {
    // Reset data when user logs out
    organizationStats.value = {charts: 0, dashboards: 0, users: 0, viewers: 0}
    recentActivities.value = []
    recentUsers.value = []
    recentViewers.value = []
    recentOrganizations.value = []
  }
}, {immediate: true})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
