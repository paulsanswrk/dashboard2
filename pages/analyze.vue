<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
    <!-- Mobile Fields Toggle -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('fields')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="i-heroicons-list-bullet" class="w-4 h-4 mr-2"/>
        Fields ({{ availableFields.length }})
      </UButton>
    </div>

    <!-- Fields Sidebar -->
    <div 
      :class="[
        'bg-gray-100 border-r p-4 transition-all duration-300',
        'w-full lg:w-64',
        mobilePanel === 'fields' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium">Fields</h3>
        <button 
          @click="closeMobilePanel"
          class="lg:hidden p-1 hover:bg-gray-200 rounded"
        >
          <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
        </button>
      </div>
      <div class="space-y-2">
        <div 
          v-for="field in availableFields" 
          :key="field"
          class="p-2 bg-white rounded cursor-pointer hover:bg-gray-50 border"
          @click="selectField(field)"
        >
          {{ field }}
        </div>
      </div>
    </div>

    <!-- Main Analysis Area -->
    <div class="flex-1 p-4 lg:p-6 flex flex-col">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 class="text-xl sm:text-2xl font-bold">Analysis</h1>
        <UButton @click="openCreateReportModal" class="w-full sm:w-auto" color="green">
          Save
        </UButton>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1">
        <!-- Sales by Region Chart -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Sales by Region</h3>
          </template>
          <div class="chart-placeholder h-48">
            <Icon name="i-heroicons-chart-bar" class="w-16 h-16 text-gray-400"/>
          </div>
        </UCard>

        <!-- Revenue Distribution Chart -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Revenue Distribution</h3>
          </template>
          <div class="chart-placeholder h-48">
            <Icon name="i-heroicons-chart-pie" class="w-16 h-16 text-gray-400"/>
          </div>
        </UCard>
      </div>

      <!-- Chart Configuration -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Y-AXIS</h3>
          </template>
          <div class="space-y-2">
            <div 
              v-for="field in yAxisFields" 
              :key="field"
              class="p-2 bg-blue-50 rounded border border-blue-200"
            >
              {{ field }}
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">BREAK DOWN BY</h3>
          </template>
          <div class="space-y-2">
            <div 
              v-for="field in breakdownFields" 
              :key="field"
              class="p-2 bg-orange-50 rounded border border-orange-200"
            >
              {{ field }}
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Mobile Settings Toggle -->
    <div class="lg:hidden p-4 border-t bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('settings')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="i-heroicons-cog-6-tooth" class="w-4 h-4 mr-2"/>
        Settings
      </UButton>
    </div>

    <!-- Settings Sidebar -->
    <div 
      :class="[
        'bg-gray-100 border-l p-4 transition-all duration-300',
        'w-full lg:w-64',
        mobilePanel === 'settings' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium">Settings</h3>
        <button 
          @click="closeMobilePanel"
          class="lg:hidden p-1 hover:bg-gray-200 rounded"
        >
          <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <h4 class="text-sm font-medium mb-2">Chart Area</h4>
          <div class="space-y-1">
            <div class="text-xs text-gray-600">Width: 100%</div>
            <div class="text-xs text-gray-600">Height: 400px</div>
          </div>
        </div>
        <div>
          <h4 class="text-sm font-medium mb-2">Data</h4>
          <div class="space-y-1">
            <div class="text-xs text-gray-600">Source: insta800.net</div>
            <div class="text-xs text-gray-600">Rows: 1,234</div>
          </div>
        </div>
        <div>
          <h4 class="text-sm font-medium mb-2">Chart Type</h4>
          <USelect 
            v-model="selectedChartType"
            :options="chartTypes"
            placeholder="Select chart type"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const mobilePanel = ref(null)

const availableFields = ref(['Sales', 'Revenue', 'Date', 'Region', 'Product', 'Customer'])
const yAxisFields = ref(['Sales'])
const breakdownFields = ref(['Region'])

const selectedChartType = ref('')
const chartTypes = [
  { label: 'Bar Chart', value: 'bar' },
  { label: 'Line Chart', value: 'line' },
  { label: 'Pie Chart', value: 'pie' },
  { label: 'Area Chart', value: 'area' }
]

const toggleMobilePanel = (panel) => {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

const closeMobilePanel = () => {
  mobilePanel.value = null
}

const selectField = (field) => {
  // Handle field selection logic
  console.log('Selected field:', field)
}

const openCreateReportModal = () => {
  // Handle opening create report modal
  console.log('Opening create report modal')
}
</script>
