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
    
    <div class="flex justify-between items-center">
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

      <!-- Recent Activity -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">Recent Activity</h3>
        </template>
        
        <div class="space-y-4">
          <div v-for="activity in recentActivities" :key="activity.id" class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <Icon :name="activity.icon" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ activity.action }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-300">{{ activity.user }}</p>
              </div>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ activity.time }}</span>
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
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Manage All Users
            </UButton>
            <div class="space-y-1">
              <div v-for="user in recentUsers" :key="user.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="heroicons:user" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Manage All Viewers
            </UButton>
            <div class="space-y-1">
              <div v-for="viewer in recentViewers" :key="viewer.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="heroicons:eye" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Manage Organizations
            </UButton>
            <div class="space-y-1">
              <div v-for="org in recentOrganizations" :key="org.id" class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="heroicons:building-office" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
              <Icon name="heroicons:cog-6-tooth" class="w-4 h-4 mr-2" />
              Account Settings
            </UButton>
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" @click="navigateTo('/billing')">
              <Icon name="heroicons:credit-card" class="w-4 h-4 mr-2" />
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

// Organization statistics (mock data for now)
const organizationStats = ref({
  charts: 1247,
  dashboards: 89,
  users: 12,
  viewers: 45
})

// Recent activities (mock data)
const recentActivities = ref([
  { id: 1, action: 'New user added', user: 'John Smith', time: '2 min ago', icon: 'heroicons:user-plus' },
  { id: 2, action: 'Dashboard shared', user: 'Sarah Johnson', time: '15 min ago', icon: 'heroicons:share' },
  { id: 3, action: 'Viewer invited', user: 'Mike Chen', time: '1 hour ago', icon: 'heroicons:eye' },
  { id: 4, action: 'Organization updated', user: 'Admin', time: '2 hours ago', icon: 'heroicons:building-office' }
])

// Recent users (mock data)
const recentUsers = ref([
  { id: 1, name: 'John Smith' },
  { id: 2, name: 'Sarah Johnson' },
  { id: 3, name: 'Mike Chen' }
])

// Recent viewers (mock data)
const recentViewers = ref([
  { id: 1, name: 'Viewer 1' },
  { id: 2, name: 'Viewer 2' },
  { id: 3, name: 'Viewer 3' }
])

// Recent organizations (mock data)
const recentOrganizations = computed(() => [
  { id: 1, name: organization.value?.name || 'Current Org' }
])

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
