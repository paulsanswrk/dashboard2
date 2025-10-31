<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        @click.self="$emit('close')"
      >
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div class="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 class="text-xl font-semibold text-gray-900">Select Board</h2>
              <button
                @click="$emit('close')"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-6">
              <!-- Save as Section -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Save as</label>
                <input
                  v-model="saveAsName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Untitled"
                />
              </div>

              <!-- Save chart to Section -->
              <div class="space-y-3">
                <label class="block text-sm font-medium text-gray-700">Save chart to</label>

                <!-- Selection Tiles -->
                <div class="grid grid-cols-3 gap-3">
                  <!-- New Dashboard Tile -->
                  <div
                    @click="selectedDestination = 'new'"
                    class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300"
                    :class="selectedDestination === 'new' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
                  >
                    <div class="flex flex-col items-center space-y-2">
                      <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span class="text-xs text-center text-gray-700">New Dashboard</span>
                    </div>
                  </div>

                  <!-- Existing Dashboard Tile -->
                  <div
                    @click="selectedDestination = 'existing'"
                    class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300"
                    :class="selectedDestination === 'existing' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
                  >
                    <div class="flex flex-col items-center space-y-2">
                      <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span class="text-xs text-center text-gray-700">Existing Dashboard</span>
                    </div>
                  </div>

                  <!-- My Desk Tile (Disabled) -->
                  <div
                    class="p-4 border-2 rounded-lg opacity-50 cursor-not-allowed bg-gray-100"
                  >
                    <div class="flex flex-col items-center space-y-2">
                      <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M9 9h6" />
                        </svg>
                      </div>
                      <span class="text-xs text-center text-gray-700">My Desk</span>
                    </div>
                  </div>
                </div>

                <!-- Dashboard Selector (only visible when existing is selected) -->
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-96"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 max-h-96"
                  leave-to-class="opacity-0 max-h-0"
                >
                  <div v-if="isExistingSelected" class="relative">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Dashboard</label>
                    <!-- Dropdown Button -->
                    <button
                      @click="toggleDropdown"
                      class="w-full px-4 py-3 pr-10 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      :class="{ 'border-blue-500': isDropdownOpen }"
                    >
                      <span :class="{ 'text-gray-500': !selectedDashboard, 'text-gray-900': selectedDashboard }">
                        {{ selectedDashboard ? selectedDashboard.name : 'Choose a dashboard...' }}
                      </span>
                      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          class="w-5 h-5 text-gray-400 transition-transform"
                          :class="{ 'rotate-180': isDropdownOpen }"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    <!-- Dropdown Menu -->
                    <Transition
                      enter-active-class="transition duration-200 ease-out"
                      enter-from-class="opacity-0 scale-95"
                      enter-to-class="opacity-100 scale-100"
                      leave-active-class="transition duration-150 ease-in"
                      leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-95"
                    >
                      <div
                        v-if="isDropdownOpen"
                        class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                      >
                        <!-- Search Input -->
                        <div class="p-2 border-b border-gray-200">
                          <input
                            v-model="dashboardSearch"
                            type="text"
                            placeholder="Search dashboards..."
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            @click.stop
                          />
                        </div>

                        <!-- Dashboard List -->
                        <div v-if="filteredDashboards.length > 0" class="py-1">
                          <button
                            v-for="dashboard in filteredDashboards"
                            :key="dashboard.id"
                            @click="selectDashboard(dashboard)"
                            class="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
                          >
                            <div class="flex items-center justify-between">
                              <span class="text-sm text-gray-900 truncate">{{ dashboard.name }}</span>
                              <span v-if="dashboard.is_public" class="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                Public
                              </span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                              Created {{ new Date(dashboard.created_at).toLocaleDateString() }}
                            </div>
                          </button>
                        </div>

                        <!-- No Results -->
                        <div v-else class="py-4 px-3 text-center text-sm text-gray-500">
                          {{ dashboardSearch ? 'No dashboards found' : 'No dashboards available' }}
                        </div>
                      </div>
                    </Transition>

                    <!-- Click outside to close -->
                    <div
                      v-if="isDropdownOpen"
                      @click="isDropdownOpen = false"
                      class="fixed inset-0 -z-10"
                    ></div>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                @click="$emit('close')"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="handleSave"
                :disabled="isSaveDisabled"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSaving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useDashboardsService, type Dashboard } from '~/composables/useDashboardsService'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  save: [data: { saveAsName: string; selectedDestination: string; selectedDashboardId?: string }]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const saveAsName = ref('Untitled')
const selectedDestination = ref<'new' | 'existing' | 'desk'>('existing')
const dashboards = ref<Dashboard[]>([])
const selectedDashboardId = ref<string>('')
const dashboardSearch = ref('')
const isDropdownOpen = ref(false)
const isSaving = ref(false)

// Computed properties
const isExistingSelected = computed(() => selectedDestination.value === 'existing')
const filteredDashboards = computed(() => {
  if (!dashboardSearch.value) return dashboards.value
  return dashboards.value.filter(dashboard =>
    dashboard.name.toLowerCase().includes(dashboardSearch.value.toLowerCase())
  )
})
const selectedDashboard = computed(() =>
  dashboards.value.find(d => d.id === selectedDashboardId.value)
)
const isSaveDisabled = computed(() => {
  return isSaving.value || (selectedDestination.value === 'existing' && !selectedDashboardId.value)
})

// Methods
const { listDashboards } = useDashboardsService()

const fetchDashboards = async () => {
  try {
    dashboards.value = await listDashboards()
  } catch (error) {
    console.error('Failed to fetch dashboards:', error)
    dashboards.value = []
  }
}

const selectDashboard = (dashboard: Dashboard) => {
  selectedDashboardId.value = dashboard.id
  dashboardSearch.value = dashboard.name
  isDropdownOpen.value = false
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handleSave = () => {
  // Validation: require dashboard selection when saving to existing dashboard
  if (selectedDestination.value === 'existing' && !selectedDashboardId.value) {
    // Could add error handling here, but for now just don't save
    return
  }

  isSaving.value = true
  
  // Emit save event - parent will close the modal when done
  emit('save', {
    saveAsName: saveAsName.value,
    selectedDestination: selectedDestination.value,
    selectedDashboardId: selectedDestination.value === 'existing' ? selectedDashboardId.value : undefined
  })
}

// Watch for modal opening to fetch dashboards
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await fetchDashboards()
    // Reset selected dashboard when modal opens
    selectedDashboardId.value = ''
    dashboardSearch.value = ''
    isDropdownOpen.value = false
    isSaving.value = false
  }
})
</script>
