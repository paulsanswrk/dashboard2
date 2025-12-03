<template>
  <UModal v-model:open="visible" class="w-full max-w-md mx-4">
    <template #header>
      <h2 class="text-lg font-semibold">Select Board</h2>
    </template>

    <template #body>
      <UForm :state="{ saveAsName, newDashboardName }" class="space-y-6">
        <!-- Save as Section -->
        <UFormField label="Save as" required>
          <UInput
              v-model="saveAsName"
              placeholder="Untitled"
              class="w-full"
          />
        </UFormField>

        <!-- New Dashboard Name Section -->
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
        >
          <UFormField v-if="isNewSelected" label="Dashboard name" required>
            <UInput
                v-model="newDashboardName"
                placeholder="My Dashboard"
            />
          </UFormField>
        </Transition>

        <!-- Save chart to Section -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">Save chart to</label>
          <!-- Selection Options -->
          <div class="grid grid-cols-3 gap-3">
            <!-- New Dashboard Option -->
            <div
                @click="selectedDestination = 'new'"
                class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary-300"
                :class="selectedDestination === 'new' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
            >
              <div class="flex flex-col items-center space-y-2">
                <UIcon name="i-heroicons-plus-circle" class="w-8 h-8 text-gray-600"/>
                <span class="text-xs text-center text-gray-700">New Dashboard</span>
              </div>
            </div>

            <!-- Existing Dashboard Option -->
            <div
                @click="selectedDestination = 'existing'"
                class="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary-300"
                :class="selectedDestination === 'existing' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
            >
              <div class="flex flex-col items-center space-y-2">
                <UIcon name="i-heroicons-squares-2x2" class="w-8 h-8 text-gray-600"/>
                <span class="text-xs text-center text-gray-700">Existing Dashboard</span>
              </div>
            </div>

            <!-- My Desk Option (Disabled) -->
            <div class="p-4 border-2 rounded-lg opacity-50 cursor-not-allowed bg-gray-100">
              <div class="flex flex-col items-center space-y-2">
                <UIcon name="i-heroicons-computer-desktop" class="w-8 h-8 text-gray-600"/>
                <span class="text-xs text-center text-gray-700">My Desk</span>
              </div>
            </div>
          </div>

          <!-- Dashboard Selector -->
          <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0 mt-4"
              enter-to-class="opacity-100 max-h-96 mt-4"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 max-h-96 mt-4"
              leave-to-class="opacity-0 max-h-0 mt-4"
          >
            <div v-if="isExistingSelected" class="space-y-4 mt-6">
              <!-- Dashboard Selection -->
              <UFormField label="Select Dashboard" required>
                <USelectMenu
                    v-model="selectedDashboard"
                    :items="filteredDashboards.map(d => ({
                    id: d.id,
                    label: d.name,
                    value: d,
                    avatar: { src: '', fallback: d.name.charAt(0).toUpperCase() },
                    suffix: d.is_public ? 'Public' : null
                  }))"
                    searchable
                    searchable-placeholder="Search dashboards..."
                    placeholder="Choose a dashboard..."
                    @update:model-value="onDashboardChange"
                    class="w-full"
                />
              </UFormField>

              <!-- Tab Selection -->
              <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-96"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 max-h-96"
                  leave-to-class="opacity-0 max-h-0"
              >
                <UFormField v-if="selectedDashboard" label="Select Tab" required>
                  <USelectMenu
                      v-model="selectedTab"
                      :items="filteredTabs.map(t => ({
                      id: t.id,
                      label: t.name,
                      value: t,
                      suffix: `Position ${t.position}`
                    }))"
                      searchable
                      searchable-placeholder="Search tabs..."
                      placeholder="Choose a tab..."
                      class="w-full"
                  />
                </UFormField>
              </Transition>
            </div>
          </Transition>
        </div>
      </UForm>

      <div class="flex justify-end space-x-3 pt-4">
        <UButton variant="outline" @click="handleClose">
          Cancel
        </UButton>
        <UButton
            @click="handleSave"
            :loading="isSaving"
            :disabled="isSaveDisabled"
        >
          Save
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {type Dashboard, useDashboardsService} from '~/composables/useDashboardsService'

interface Props {
  open: boolean
}

interface Emits {
  close: []
  save: [data: { saveAsName: string; selectedDestination: string; selectedDashboardId?: string; selectedTabId?: string; newDashboardName?: string }]
  'update:open': [boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

// Reactive state
const saveAsName = ref('Untitled')
const selectedDestination = ref<'new' | 'existing' | 'desk'>('existing')
const dashboards = ref<Dashboard[]>([])
const selectedDashboard = ref<Dashboard | null>(null)
const isSaving = ref(false)
const newDashboardName = ref('My Dashboard')

// Tab-related state
const tabs = ref<Array<{ id: string; name: string; position: number }>>([])
const selectedTab = ref<{ id: string; name: string; position: number } | null>(null)

// Computed properties
const isExistingSelected = computed(() => selectedDestination.value === 'existing')
const isNewSelected = computed(() => selectedDestination.value === 'new')
const filteredDashboards = computed(() => dashboards.value)
const filteredTabs = computed(() => tabs.value)
const isSaveDisabled = computed(() => {
  return isSaving.value ||
      (selectedDestination.value === 'existing' && (!selectedDashboard.value || !selectedTab.value)) ||
      (selectedDestination.value === 'new' && !newDashboardName.value.trim())
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

const fetchTabs = async (dashboardId: string) => {
  try {
    const response = await $fetch<{ tabs: Array<{ id: string; name: string; position: number }> }>(`/api/dashboards/${dashboardId}/tabs`)
    tabs.value = response.tabs
    // Auto-select the first tab if available
    if (tabs.value.length > 0 && !selectedTab.value) {
      selectedTab.value = tabs.value[0]
    }
  } catch (error) {
    console.error('Failed to fetch tabs:', error)
    tabs.value = []
  }
}

const onDashboardChange = async (dashboard: Dashboard | null) => {
  selectedDashboard.value = dashboard
  if (dashboard) {
    // Reset tab selection when dashboard changes
    selectedTab.value = null
    // Fetch tabs for the selected dashboard
    await fetchTabs(dashboard.id)
  } else {
    // Clear tabs when no dashboard is selected
    tabs.value = []
    selectedTab.value = null
  }
}

const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleSave = () => {
  // Validation
  if (selectedDestination.value === 'existing' && (!selectedDashboard.value || !selectedTab.value)) {
    return
  }
  if (selectedDestination.value === 'new' && !newDashboardName.value.trim()) {
    return
  }

  isSaving.value = true

  // Emit save event
  emit('save', {
    saveAsName: saveAsName.value,
    selectedDestination: selectedDestination.value,
    selectedDashboardId: selectedDestination.value === 'existing' ? selectedDashboard.value?.id : undefined,
    selectedTabId: selectedDestination.value === 'existing' ? selectedTab.value?.id : undefined,
    newDashboardName: selectedDestination.value === 'new' ? newDashboardName.value : undefined
  })

  // Close modal after save
  handleClose()
}

// Watch for modal opening to fetch dashboards
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await fetchDashboards()
    // Reset state when modal opens
    selectedDashboard.value = null
    tabs.value = []
    selectedTab.value = null
    isSaving.value = false
  }
})

// Watch for destination changes to reset selections
watch(selectedDestination, () => {
  selectedDashboard.value = null
  tabs.value = []
  selectedTab.value = null
})
</script>
