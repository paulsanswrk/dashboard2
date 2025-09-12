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
      <h1 class="text-2xl font-heading font-bold tracking-tight">
        Welcome back, {{ userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'User' }}
      </h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Account Overview -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">Account overview</h3>
        </template>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">632</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Charts</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">64</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Dashboards</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">2</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Users</p>
          </div>
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">34</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">Viewers</p>
          </div>
        </div>
      </UCard>

      <!-- Activity Levels -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">Activity levels</h3>
        </template>
        
        <div class="space-y-4">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-200">Dashboards opened</span>
            <span class="font-medium text-gray-900 dark:text-white">247</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-200">Charts created</span>
            <span class="font-medium text-gray-900 dark:text-white">89</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Data Sources -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Datasources +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              New Datasource
            </UButton>
            <div class="space-y-1">
              <div class="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-600">
                <Icon name="heroicons:circle-stack" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span class="text-sm text-gray-700 dark:text-gray-200">BoK1</span>
              </div>
              <div class="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-700">
                <Icon name="heroicons:circle-stack" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span class="text-sm text-gray-700 dark:text-gray-200">insta800.net</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Dashboards -->
      <UCard class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <div class="p-4">
          <h3 class="font-medium mb-2 text-gray-900 dark:text-white">Dashboards +</h3>
          <div class="space-y-2">
            <UButton variant="ghost" size="sm" class="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              New dashboard
            </UButton>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="name in dashboardNames" :key="name" class="p-2 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                {{ name }}
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
            <UButton size="sm" class="w-full bg-orange-600 hover:bg-orange-700 text-white">
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
const { userProfile, organization } = useAuth()

// Welcome message state
const showWelcomeMessage = ref(false)

// Check if this is a new user (from query params)
const route = useRoute()
if (route.query.welcome === 'true') {
  showWelcomeMessage.value = true
}

const dashboardNames = ['Avideliing 110', 'Avideliing 15', 'Avideliing 18', 'Avideliing 200', 'Avideliing 210']

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
