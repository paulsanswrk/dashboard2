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
        <UButton color="orange" variant="outline" @click="navigateTo('/my-dashboard')">
          <Icon name="heroicons:chart-bar" class="w-4 h-4 mr-1" />
          My Desk
        </UButton>
        <UButton color="orange" @click="navigateTo('/data-sources')">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-1" />
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

      <!-- Recent Activity -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">Recent Activity</h3>
        </template>
        
        <div class="space-y-4">
          <div v-for="activity in recentActivities" :key="activity.id" class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <Icon :name="activity.icon" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ activity.action }}</p>
              <p class="text-xs text-gray-600 dark:text-gray-300">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- My Data Sources -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">My Data Sources</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/data-sources')">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Connect New Source
            </UButton>
            <div class="space-y-1">
              <div v-for="source in myDataSources" :key="source.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon :name="source.icon" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span class="text-sm text-gray-700 dark:text-gray-200">{{ source.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- My Dashboards -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">My Dashboards</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/my-dashboard')">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Create Dashboard
            </UButton>
            <div class="space-y-1">
              <div v-for="dashboard in myDashboards" :key="dashboard.id" class="p-2 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                {{ dashboard.name }}
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Insights -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Insights</h3>
          <div class="h-32 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-600">
            <Icon name="heroicons:chart-bar-square" class="w-8 h-8" style="color: rgb(194, 65, 12);" />
          </div>
          <p class="text-xs mt-2 text-center text-gray-600 dark:text-gray-300">Create Smart Insights from your data</p>
        </div>
      </UCard>

      <!-- Alarms & Reports -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Alarms +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              New Alert
            </UButton>
            <div class="p-2 rounded bg-gray-100 dark:bg-gray-600">
              <span class="text-sm text-gray-700 dark:text-gray-200">Demo larm</span>
            </div>
          </div>
          <div class="mt-4">
            <h4 class="text-sm font-medium mb-2 text-gray-900 dark:text-white">Reports +</h4>
            <UButton size="sm" class="w-full bg-green-600 hover:bg-green-700 text-white">
              Create report
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

// Check if this is a new user (from query params)
const route = useRoute()
if (route.query.welcome === 'true') {
  showWelcomeMessage.value = true
}

// Recent activities (user-focused)
const recentActivities = ref([
  { id: 1, action: 'Created new chart', time: '2 hours ago', icon: 'heroicons:chart-bar' },
  { id: 2, action: 'Updated dashboard', time: '1 day ago', icon: 'heroicons:pencil' },
  { id: 3, action: 'Connected data source', time: '2 days ago', icon: 'heroicons:circle-stack' },
  { id: 4, action: 'Shared report', time: '3 days ago', icon: 'heroicons:share' }
])

// My data sources
const myDataSources = ref([
  { id: 1, name: 'Sales Database', icon: 'heroicons:circle-stack' },
  { id: 2, name: 'Analytics API', icon: 'heroicons:cloud' },
  { id: 3, name: 'CSV Upload', icon: 'heroicons:document' }
])

// My dashboards
const myDashboards = ref([
  { id: 1, name: 'Sales Overview' },
  { id: 2, name: 'Marketing Metrics' },
  { id: 3, name: 'Customer Analytics' }
])

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
