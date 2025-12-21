<template>
  <div class="p-6 space-y-6">
    <!-- Welcome Message -->
    <UAlert
      v-if="showWelcomeMessage"
      color="green"
      variant="soft"
      title="Welcome to Optiqo!"
      description="Your account has been created successfully. You can now start building your first dashboard."
      class="mb-6"
      @close="showWelcomeMessage = false"
    />
    
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-heading font-bold tracking-tight">
          Welcome back, {{ userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User' }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300 mt-1">
          {{ organization?.name ? `Working in ${organization.name}` : 'Your personal workspace' }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton color="orange" @click="navigateTo('/data-sources')">
          <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
          Connect Data
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- My Workspace Overview -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">My Workspace</h3>
        </template>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">12</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">My Charts</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">3</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">My Dashboards</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">5</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Data Sources</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">8</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Reports</p>
          </div>
        </div>
      </UCard>

    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- My Data Sources (Admin only) -->
      <UCard v-if="isAdmin" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">My Data Sources</h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/integration-wizard')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              New
            </UButton>
          </div>
          <div class="space-y-2">
            <div v-if="loadingDataSources" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400"/>
            </div>
            <div v-else-if="myDataSources.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No data sources yet. Connect your first one!
            </div>
            <div v-else class="space-y-1">
              <div
                  v-for="source in myDataSources.slice(0, 5)"
                  :key="source.id"
                  class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 cursor-pointer transition-colors"
                  @click="navigateTo(`/reporting/builder?data_connection_id=${source.id}`)"
              >
                <Icon :name="source.icon" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span class="text-sm text-gray-700 dark:text-gray-200">{{ source.name }}</span>
              </div>
              <div v-if="myDataSources.length > 5" class="text-center pt-2">
                <UButton
                    variant="link"
                    size="xs"
                    class="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                    @click="navigateTo('/data-sources')"
                >
                  View all {{ myDataSources.length }} data sources
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- My Dashboards -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">My Dashboards</h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/dashboards')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              New
            </UButton>
          </div>
          <div class="space-y-2">
            <div v-if="loadingDashboards" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400"/>
            </div>
            <div v-else-if="myDashboards.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No dashboards yet. Create your first one!
            </div>
            <div v-else class="space-y-1">
              <div
                  v-for="dashboard in myDashboards.slice(0, 5)"
                  :key="dashboard.id"
                  class="p-2 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 cursor-pointer transition-colors"
                  @click="navigateTo(`/dashboards/${dashboard.id}`)"
              >
                {{ dashboard.name }}
              </div>
              <div v-if="myDashboards.length > 5" class="text-center pt-2">
                <UButton
                    variant="link"
                    size="xs"
                    class="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                    @click="navigateTo('/dashboards')"
                >
                  View all {{ myDashboards.length }} dashboards
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>


      <!-- My Reports -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">My Reports</h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/reports/create')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              New
            </UButton>
          </div>
          <div class="space-y-2">
            <div v-if="loadingReports" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400"/>
            </div>
            <div v-else-if="myReports.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No reports yet. Create your first one!
            </div>
            <div v-else class="space-y-1">
              <div
                  v-for="report in myReports.slice(0, 5)"
                  :key="report.id"
                  class="p-2 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 cursor-pointer transition-colors"
                  @click="navigateTo(`/reports/edit/${report.id}`)"
              >
                {{ report.name }}
              </div>
              <div v-if="myReports.length > 5" class="text-center pt-2">
                <UButton
                    variant="link"
                    size="xs"
                    class="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                    @click="navigateTo('/reports')"
                >
                  View all {{ myReports.length }} reports
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Authentication
const {userProfile, isAdmin} = useAuth()

// Dashboard service
const {listDashboards} = useDashboardsService()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

// Welcome message state
const showWelcomeMessage = ref(false)

// Check if this is a new user (from query params)
const route = useRoute()
if (route.query.welcome === 'true') {
  showWelcomeMessage.value = true
}

// Recent activities (user-focused)
const recentActivities = ref([
  {id: 1, action: 'Created new chart', time: '2 hours ago', icon: 'i-heroicons-chart-bar'},
  {id: 2, action: 'Updated dashboard', time: '1 day ago', icon: 'i-heroicons-pencil'},
  {id: 3, action: 'Connected data source', time: '2 days ago', icon: 'i-heroicons-circle-stack'},
  {id: 4, action: 'Shared report', time: '3 days ago', icon: 'i-heroicons-share'}
])

// My data sources
const myDataSources = ref([])
const loadingDataSources = ref(true)

// My dashboards
const myDashboards = ref([])
const loadingDashboards = ref(true)

// My reports
const myReports = ref([])
const loadingReports = ref(true)

// Load dashboards
async function loadDashboards() {
  loadingDashboards.value = true
  try {
    myDashboards.value = await listDashboards()
  } catch (error) {
    console.error('Failed to load dashboards:', error)
    myDashboards.value = []
  } finally {
    loadingDashboards.value = false
  }
}

// Load reports
async function loadReports() {
  console.log('Loading reports...')
  loadingReports.value = true
  try {
    const data = await $fetch('/api/reports')
    console.log('Reports loaded:', data)
    myReports.value = data
  } catch (error) {
    console.error('Failed to load reports:', error)
    myReports.value = []
  } finally {
    console.log('Setting loadingReports to false')
    loadingReports.value = false
  }
}

// Helper function to get connection icon based on database type
const getConnectionIcon = (databaseType) => {
  const iconMap = {
    postgresql: 'i-heroicons-circle-stack',
    mysql: 'i-heroicons-circle-stack',
    mongodb: 'i-heroicons-circle-stack',
    sqlite: 'i-heroicons-circle-stack',
    snowflake: 'i-heroicons-cloud',
    bigquery: 'i-heroicons-cloud',
    redshift: 'i-heroicons-cloud',
    csv: 'i-heroicons-document',
    excel: 'i-heroicons-document'
  }
  return iconMap[databaseType?.toLowerCase()] || 'i-heroicons-circle-stack'
}

// Load data sources
async function loadDataSources() {
  console.log('Loading data sources...')
  loadingDataSources.value = true
  try {
    const data = await $fetch('/api/reporting/connections')
    console.log('Data sources loaded:', data)
    myDataSources.value = data.map(connection => ({
      id: connection.id,
      name: connection.internal_name,
      icon: getConnectionIcon(connection.database_type)
    }))
    console.log('Mapped data sources:', myDataSources.value)
  } catch (error) {
    console.error('Failed to load data sources:', error)
    myDataSources.value = []
  } finally {
    console.log('Setting loadingDataSources to false')
    loadingDataSources.value = false
  }
}

// Load data on mount
onMounted(() => {
  console.log('onMounted - isAdmin:', isAdmin.value)
  loadDashboards()
  loadReports()
  if (isAdmin.value) {
    loadDataSources()
  }
})

// Watch for admin status changes and load data sources when user becomes admin
watch(isAdmin, (newIsAdmin) => {
  console.log('isAdmin changed to:', newIsAdmin)
  if (newIsAdmin && myDataSources.value.length === 0) {
    loadDataSources()
  }
})

// Page meta
definePageMeta({
  middleware: 'auth',
  alias: ['/']
})
</script>
