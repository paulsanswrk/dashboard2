<template>
  <div class="p-6">
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
    
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-heading font-bold tracking-tight">My Dashboard</h1>
      <div class="flex gap-2">
        <UButton color="orange" variant="outline" @click="openShareModal">
          <Icon name="heroicons:share" class="w-4 h-4 mr-1" />
          Share
        </UButton>
        <UButton color="orange" @click="openCreateReportModal">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-1" />
          New report
        </UButton>
      </div>
    </div>

    <!-- Dashboard Title -->
    <div class="mb-6">
      <h2 class="text-xl font-heading font-semibold text-gray-800 dark:text-white tracking-tight">Dashboard - Driftsansvarlig - VIP Center</h2>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Performance Gauge -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Performance Gauge</h3>
        </template>
        <div class="chart-placeholder h-48">
          <Icon name="heroicons:chart-bar-square" class="w-16 h-16 text-gray-400" />
        </div>
      </UCard>

      <!-- Monthly Sales -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Monthly Sales</h3>
        </template>
        <div class="chart-placeholder h-48">
          <Icon name="heroicons:chart-bar" class="w-16 h-16 text-gray-400" />
        </div>
      </UCard>

      <!-- Activity Overview -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Activity Overview</h3>
        </template>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Active Users</span>
            <span class="font-medium">1,234</span>
          </div>
          <div class="flex justify-between">
            <span>Total Views</span>
            <span class="font-medium">5,678</span>
          </div>
          <div class="flex justify-between">
            <span>Conversion Rate</span>
            <span class="font-medium">3.4%</span>
          </div>
        </div>
      </UCard>

      <!-- Revenue Chart -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Revenue Trend</h3>
        </template>
        <div class="chart-placeholder h-48">
          <Icon name="heroicons:chart-line" class="w-16 h-16 text-gray-400" />
        </div>
      </UCard>

      <!-- Customer Satisfaction -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Customer Satisfaction</h3>
        </template>
        <div class="chart-placeholder h-48">
          <Icon name="heroicons:chart-pie" class="w-16 h-16 text-gray-400" />
        </div>
      </UCard>

      <!-- Data Table -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Recent Activity</h3>
        </template>
        <div class="space-y-2">
          <div v-for="activity in recentActivities" :key="activity.id" class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <div class="font-medium text-sm">{{ activity.action }}</div>
              <div class="text-xs text-gray-600">{{ activity.user }}</div>
            </div>
            <div class="text-xs text-gray-500">{{ activity.time }}</div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Dashboard Actions -->
    <div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
      <UButton color="orange" variant="outline" @click="editDashboard" class="w-full sm:w-auto">
        <Icon name="heroicons:pencil" class="w-4 h-4 mr-1" />
        Edit Dashboard
      </UButton>
      <UButton color="orange" variant="outline" @click="duplicateDashboard" class="w-full sm:w-auto">
        <Icon name="heroicons:document-duplicate" class="w-4 h-4 mr-1" />
        Duplicate
      </UButton>
      <UButton color="red" variant="outline" @click="deleteDashboard" class="w-full sm:w-auto">
        <Icon name="heroicons:trash" class="w-4 h-4 mr-1" />
        Delete
      </UButton>
    </div>
  </div>
</template>

<script setup>
// Check for welcome message from query params
const route = useRoute()
const showWelcomeMessage = ref(false)

// Show welcome message if coming from signup
if (route.query.welcome === 'true') {
  showWelcomeMessage.value = true
}

const recentActivities = ref([
  { id: 1, action: 'Chart Updated', user: 'John Smith', time: '2 min ago' },
  { id: 2, action: 'Data Refreshed', user: 'Sarah Johnson', time: '15 min ago' },
  { id: 3, action: 'Dashboard Shared', user: 'Mike Chen', time: '1 hour ago' },
  { id: 4, action: 'New Chart Added', user: 'John Smith', time: '2 hours ago' }
])

const openShareModal = () => {
  // Handle opening share modal
  console.log('Opening share modal')
}

const openCreateReportModal = () => {
  // Handle opening create report modal
  console.log('Opening create report modal')
}

const editDashboard = () => {
  // Handle edit dashboard
  console.log('Edit dashboard')
}

const duplicateDashboard = () => {
  // Handle duplicate dashboard
  console.log('Duplicate dashboard')
}

const deleteDashboard = () => {
  // Handle delete dashboard
  console.log('Delete dashboard')
}
</script>
