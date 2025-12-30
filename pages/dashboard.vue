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
          <template v-if="organization?.name">
            Working in <span class="font-medium">{{ organization.name }}</span>
            <span class="mx-1.5 text-gray-400">•</span>
            <span class="px-2 py-0.5 text-xs font-medium rounded-full" :class="roleClasses">{{ roleLabel }}</span>
          </template>
          <template v-else>
            Your personal workspace
          </template>
        </p>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">

      <!-- Organizations (Superadmin only) -->
      <UCard v-if="isSuperAdmin" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">Organizations <span class="text-gray-500 text-sm font-normal">({{ organizationsList.length }})</span></h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/organizations')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Manage
            </UButton>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div v-if="loadingOrganizations" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400"/>
            </div>
            <div v-else-if="organizationsList.length === 0" class="text-sm text-gray-500 text-center py-4">No organizations found</div>
            <div v-else class="space-y-1">
              <div v-for="org in organizationsList" :key="org.id" class="p-2 rounded bg-gray-100 dark:bg-gray-600 flex justify-between items-center text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors cursor-pointer" @click="navigateTo(`/organizations/${org.id}`)">
                <span class="font-medium truncate text-gray-700 dark:text-gray-200">{{ org.name }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ org.user_count }} users</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Users Management (Admin/Superadmin) -->
      <UCard v-if="(isAdmin || isSuperAdmin) && (usersList.length > 0 || loadingUsers)" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">Users <span class="text-gray-500 text-sm font-normal">({{ usersList.length }})</span></h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/users')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Manage
            </UButton>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div v-if="loadingUsers" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400"/>
            </div>
            <div v-else class="space-y-1">
              <div v-for="user in usersList" :key="user.id" class="p-2 rounded bg-gray-100 dark:bg-gray-600 flex items-center gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                <UAvatar :alt="user.name" size="2xs"/>
                <div class="flex-1 min-w-0">
                  <p class="truncate font-medium text-gray-700 dark:text-gray-200">{{ user.name }}</p>
                  <p class="truncate text-xs text-gray-500 mb-0">{{ user.email }}</p>
                </div>
                <UBadge size="xs" :color="user.role === 'SUPERADMIN' ? 'purple' : 'blue'" variant="soft">{{ user.role }}</UBadge>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Viewers Management (Admin/Superadmin) -->
      <UCard v-if="(isAdmin || isSuperAdmin) && (viewersList.length > 0 || loadingViewers)" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">Viewers <span class="text-gray-500 text-sm font-normal">({{ viewersList.length }})</span></h3>
            <UButton
                size="sm"
                color="orange"
                class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
                @click="navigateTo('/viewers')"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Manage
            </UButton>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div v-if="loadingViewers" class="flex justify-center py-4">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400"/>
            </div>
            <div v-else class="space-y-1">
              <div v-for="viewer in viewersList" :key="viewer.id" class="p-2 rounded bg-gray-100 dark:bg-gray-600 flex items-center gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-500 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                  {{ viewer.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="truncate font-medium text-gray-700 dark:text-gray-200">{{ viewer.name }}</p>
                  <p class="truncate text-xs text-gray-500 mb-0">{{ viewer.email }}</p>
                </div>
                <span class="text-xs text-gray-500">{{ viewer.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- My Data Sources (Admin/Editor only) -->
      <UCard v-if="isAdmin || isEditor" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium text-gray-900 dark:text-white">
              My Data Sources
              <span class="ml-1 text-gray-500 text-sm font-normal">({{ myDataSources.length }})</span>
            </h3>
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
            <h3 class="font-medium text-gray-900 dark:text-white">
              My Dashboards
              <span class="ml-1 text-gray-500 text-sm font-normal">({{ userStats.dashboards }})</span>
            </h3>
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
            <h3 class="font-medium text-gray-900 dark:text-white">
              My Reports
              <span class="ml-1 text-gray-500 text-sm font-normal">({{ userStats.reports }})</span>
            </h3>
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

<script setup lang="ts">
// Authentication
const {userProfile, isAdmin, isSuperAdmin, isEditor} = useAuth()

// Dashboard service
const {listDashboards} = useDashboardsService()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

// Role display helpers
const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    'SUPERADMIN': 'Superadmin',
    'ADMIN': 'Admin',
    'EDITOR': 'Editor',
    'VIEWER': 'Viewer'
  }
  return roleMap[userProfile.value?.role || ''] || userProfile.value?.role || ''
})

const roleClasses = computed(() => {
  const role = userProfile.value?.role
  switch (role) {
    case 'SUPERADMIN':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    case 'ADMIN':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    case 'EDITOR':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'VIEWER':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  }
})

// User stats
const userStats = ref({
  dashboards: 0,
  reports: 0,
  connections: 0
})

// Fetch user stats
const fetchUserStats = async () => {
  try {
    const response = await $fetch('/api/user/stats')
    if (response.success) {
      userStats.value = response.stats
    }
  } catch (err) {
    console.error('Error fetching user stats:', err)
  }
}

// Lists for cards
const organizationsList = ref([])
const loadingOrganizations = ref(false)
const usersList = ref([])
const loadingUsers = ref(false)
const viewersList = ref([])
const loadingViewers = ref(false)

const fetchOrganizations = async () => {
  if (!isSuperAdmin.value) return
  loadingOrganizations.value = true
  try {
    const supabase = useSupabaseClient()
    const {data: {session}} = await supabase.auth.getSession()
    if (!session?.access_token) return

    const response = await $fetch('/api/organizations', {
      headers: {Authorization: `Bearer ${session.access_token}`}
    })

    if (response.success) {
      organizationsList.value = response.organizations
    }
  } catch (err) {
    console.error('Error fetching organizations:', err)
  } finally {
    loadingOrganizations.value = false
  }
}

const fetchUsers = async () => {
  if (!isAdmin.value && !isSuperAdmin.value) return
  loadingUsers.value = true
  try {
    const supabase = useSupabaseClient()
    const {data: {session}} = await supabase.auth.getSession()
    if (!session?.access_token) return

    const response = await $fetch('/api/users', {
      headers: {Authorization: `Bearer ${session.access_token}`}
    })

    if (response.success) {
      usersList.value = response.users
    }
  } catch (err) {
    console.error('Error fetching users:', err)
  } finally {
    loadingUsers.value = false
  }
}

const fetchViewers = async () => {
  if (!isAdmin.value && !isSuperAdmin.value) return
  loadingViewers.value = true
  try {
    const supabase = useSupabaseClient()
    const {data: {session}} = await supabase.auth.getSession()
    if (!session?.access_token) return

    const response = await $fetch('/api/viewers', {
      headers: {Authorization: `Bearer ${session.access_token}`}
    })

    if (response.success) {
      viewersList.value = response.viewers
    }
  } catch (err) {
    console.error('Error fetching viewers:', err)
  } finally {
    loadingViewers.value = false
  }
}

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
  loadingReports.value = true
  try {
    const data = await $fetch('/api/reports')
    myReports.value = data
  } catch (error) {
    console.error('Failed to load reports:', error)
    myReports.value = []
  } finally {
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
  loadingDataSources.value = true
  try {
    const data = await $fetch('/api/reporting/connections')
    myDataSources.value = data.map(connection => ({
      id: connection.id,
      name: connection.internal_name,
      icon: getConnectionIcon(connection.database_type)
    }))
  } catch (error) {
    console.error('Failed to load data sources:', error)
    myDataSources.value = []
  } finally {
    loadingDataSources.value = false
  }
}

// Load data on mount
onMounted(() => {
  loadDashboards()
  loadReports()
  if (isAdmin.value || isEditor.value) {
    loadDataSources()
  }
  fetchUserStats()

  // Load admin/superadmin data
  if (isSuperAdmin.value) {
    fetchOrganizations()
  }
  if (isAdmin.value || isSuperAdmin.value) {
    fetchUsers()
    fetchViewers()
  }
})

// Watch for admin status changes and load data sources when user becomes admin
watch([isAdmin, isEditor, isSuperAdmin], () => {
  if ((isAdmin.value || isEditor.value) && myDataSources.value.length === 0) {
    loadDataSources()
  }
  fetchUserStats()

  if (isSuperAdmin.value) {
    fetchOrganizations()
  }
  if (isAdmin.value || isSuperAdmin.value) {
    fetchUsers()
    fetchViewers()
  }
})

// Page meta
definePageMeta({
  middleware: 'auth',
  alias: ['/']
})
</script>
