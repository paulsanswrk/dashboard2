<template>
  <UModal v-model:open="isOpen" size="5xl" class="w-full max-w-4xl mx-4">
    <template #header>
      <h3 class="text-lg font-semibold">Share "{{ dashboardName }}"</h3>
    </template>

    <template #body>
      <div class="space-y-6">

        <!-- Error Display -->
        <div v-if="error && !loading" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div class="flex items-center">
            <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400 mr-2"/>
            <span class="text-red-800 dark:text-red-200 font-medium">{{ error }}</span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav class="flex gap-6 min-w-max px-1">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                :class="[
                '!w-auto !flex-none py-2 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors duration-200 whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="min-h-[400px]">
          <!-- Users Tab -->
          <div v-if="activeTab === 'users'" class="space-y-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              This is the list of users in your organization. They have access to this dashboard.
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-8">
              <div class="flex items-center space-x-2">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin"/>
                <span class="text-sm text-gray-600 dark:text-gray-400">Loading users...</span>
              </div>
            </div>

            <!-- Users List -->
            <div v-else class="space-y-3 max-h-96 overflow-y-auto">

              <div
                  v-for="(user, index) in organizationUsers"
                  :key="user.userId || index"
                  class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium">{{ user.firstName }} {{ user.lastName }}</h4>
                    <span
                        :class="[
                        'px-2 py-1 text-xs rounded-full font-medium',
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        user.role === 'EDITOR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      ]"
                    >
                      {{ user.role }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500">{{ user.email }}</p>
                </div>
                <div class="flex items-center gap-3 ml-4">
                  <span class="text-sm text-gray-500">
                    {{ user.hasAccess ? 'Can access' : 'No access' }}
                  </span>
                  <USwitch
                      :model-value="user.hasAccess"
                      @update:model-value="user.role !== 'ADMIN' && toggleUserAccess(user)"
                      class="data-[state=checked]:!bg-orange-500"
                      :disabled="user.role === 'ADMIN'"
                  />
                  <span class="text-xs text-gray-400 w-12">
                    {{ user.role === 'ADMIN' ? 'Always' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Viewers Tab -->
          <div v-if="activeTab === 'viewers'" class="space-y-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Here you can share a dashboard privately with a viewer or a group of viewers. To add a viewer or a group of viewers please visit the Viewers page in Settings.
            </div>

            <div class="space-y-4">
              <UFormField label="Add Viewer or Group">
                <USelectMenu
                    v-model="selectedViewerId"
                    :items="viewerOptions"
                    value-key="id"
                    placeholder="Choose a viewer or group..."
                    class="w-full"
                />
              </UFormField>

              <div v-if="dashboardViewers.length > 0" class="space-y-2">
                <h4 class="font-medium text-sm">Viewers with Access:</h4>
                <div
                    v-for="viewer in dashboardViewers"
                    :key="viewer.id"
                    class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div class="min-w-0 flex-1">
                    <h4 class="font-medium">{{ viewer.name }}</h4>
                    <p class="text-sm text-gray-500">{{ viewer.email }}</p>
                  </div>
                  <UButton
                      color="red"
                      variant="ghost"
                      size="xs"
                      @click="removeViewerAccess(viewer)"
                      :disabled="loading"
                  >
                    <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Public URL Tab -->
          <div v-if="activeTab === 'public'" class="space-y-4">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Share this dashboard outside your organization to anyone that has the link below (if activated). Please be aware that all active dashboard filters will be applied.
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Public Access</span>
                <USwitch
                    v-model="isPublic"
                    @change="updatePublicAccess"
                    class="data-[state=checked]:!bg-orange-500"
                />
              </div>

              <div v-if="isPublic" class="space-y-4">
                <UFormField label="Public URL">
                  <div class="flex flex-col sm:flex-row gap-2">
                    <UInput
                        :value="publicUrl"
                        readonly
                        class="flex-1 font-mono text-sm"
                    />
                    <UButton
                        size="sm"
                        variant="outline"
                        class="w-full sm:w-auto"
                        @click="copyToClipboard(publicUrl)"
                    >
                      <Icon name="i-heroicons-clipboard-document" class="w-4 h-4 mr-1"/>
                      Copy
                    </UButton>
                  </div>
                </UFormField>

                <div class="flex items-center gap-4">
                  <UCheckbox v-model="isPasswordProtected" @change="handlePasswordToggle" label="Password protected">
                    Password protected
                  </UCheckbox>
                </div>

                <div v-if="isPasswordProtected" class="space-y-2">
                  <UFormField :label="`Password ${hasExistingPassword ? '(change password)' : ''}`.trim()">
                    <UInput
                        v-model="publicPassword"
                        type="password"
                        :placeholder="hasExistingPassword ? 'Enter new password' : 'Enter password'"
                        class="w-full"
                        @blur="updatePassword"
                    />
                  </UFormField>
                </div>

                <UFormField label="Embed Code">
                  <div class="space-y-2">
                    <UTextarea
                        :value="embedCode"
                        readonly
                        :rows="3"
                        class="font-mono text-xs w-full"
                    />
                    <UButton
                        size="sm"
                        variant="outline"
                        @click="copyToClipboard(embedCode)"
                    >
                      <Icon name="i-heroicons-clipboard-document" class="w-4 h-4 mr-1"/>
                      Copy Embed Code
                    </UButton>
                  </div>
                </UFormField>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton variant="outline" @click="closeModal" class="!w-auto">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  dashboardId: {
    type: String,
    required: true
  },
  dashboardName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:open'])

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Tab management
const activeTab = ref('users')
const tabs = [
  { key: 'users', label: 'Users' },
  { key: 'viewers', label: 'Viewers' },
  { key: 'public', label: 'Public URL' }
]

// State management
const {userProfile} = useAuth()
const loading = ref(false)
const error = ref('')

// Note: User profile changes are handled by the modal open/close logic
// No need for separate userProfile watch as data is loaded when modal opens
const organizationUsers = ref([])
const organizationViewers = ref([])
const dashboardViewers = ref([])
const selectedViewerId = ref('')
const isPublic = ref(false)
const isPasswordProtected = ref(false)
const hasExistingPassword = ref(false)
const publicPassword = ref('')
const publicUrl = ref('')

// Computed properties
const viewerOptions = computed(() => {
  const options = []

  // Individual viewers
  organizationViewers.value.forEach(viewer => {
    options.push({
      id: `viewer-${viewer.userId}`,
      label: `${viewer.firstName} ${viewer.lastName} (${viewer.viewerType || 'Viewer'})`,
      value: viewer.userId,
      email: viewer.email,
      type: 'viewer'
    })
  })

  // Viewer groups (if they exist)
  const groups = {}
  organizationViewers.value.forEach(viewer => {
    if (viewer.groupName) {
      if (!groups[viewer.groupName]) {
        groups[viewer.groupName] = []
      }
      groups[viewer.groupName].push(viewer)
    }
  })

  Object.keys(groups).forEach(groupName => {
    options.push({
      id: `group-${groupName}`,
      label: `${groupName} (${groups[groupName].length} viewers)`,
      value: groupName,
      type: 'group'
    })
  })

  return options
})

const selectedViewer = computed(() => {
  if (!selectedViewerId.value) return null
  return viewerOptions.value.find(option => option.id === selectedViewerId.value) || null
})


const embedCode = computed(() => {
  return `<iframe src="${publicUrl.value}" width="100%" height="400" frameborder="0"></iframe>`
})

// Methods
async function loadData() {
  loading.value = true

  // Wait for user profile to be loaded if it's not available yet
  if (!userProfile.value) {
    // Wait up to 3 seconds for profile to load
    let attempts = 0
    while (!userProfile.value && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    if (!userProfile.value) {
      error.value = 'User profile not loaded'
      loading.value = false
      return
    }
  }

  try {
    if (!userProfile.value?.organizationId) {
      if (userProfile.value?.role === 'SUPERADMIN') {
        throw new Error('Super admins cannot share dashboards - please use an organization account')
      } else {
        throw new Error('User organization not found')
      }
    }

    // Load organization users with dashboard access in a single efficient query
    const response = await $fetch(`/api/organizations/${userProfile.value.organizationId}/users?dashboardId=${props.dashboardId}`)

    if (response && response.users) {
      // Process users - the API already includes access information
      organizationUsers.value = response.users.map(user => ({
        ...user,
        user_id: user.userId, // Ensure compatibility
      }))

      organizationViewers.value = response.viewers.map(viewer => ({
        ...viewer,
        user_id: viewer.userId, // Ensure compatibility
      }))


      // Load dashboard-specific settings (public access, viewers)
      await loadDashboardAccess()
    } else {
      console.error('❌ Invalid API response:', response)
    }
  } catch (error) {
    console.error('❌ Failed to load sharing data:', error)
    error.value = error.message || 'Failed to load sharing data'
  } finally {
    loading.value = false
  }
}

async function loadDashboardAccess() {
  try {
    const {data: accessData} = await $fetch(`/api/dashboards/${props.dashboardId}/access`)
    if (accessData) {
      // Update viewer access (users are now loaded from organizations endpoint)
      dashboardViewers.value = accessData.viewerAccess || []

      // Update public access settings
      isPublic.value = accessData.isPublic || false
      isPasswordProtected.value = !!accessData.password
      hasExistingPassword.value = !!accessData.password
      // Don't populate publicPassword from API for security - user must enter new password
      publicUrl.value = accessData.publicUrl || ''
    }
  } catch (error) {
    console.error('Failed to load dashboard access:', error)
  }
}

async function toggleUserAccess(user: any) {
  // Don't allow toggling admin access
  if (user.role === 'ADMIN') {
    return
  }

  const newAccessState = !user.hasAccess
  const oldAccessState = user.hasAccess

  // Optimistically update UI
  user.hasAccess = newAccessState

  try {
    await $fetch(`/api/dashboards/${props.dashboardId}/access/users`, {
      method: 'POST',
      body: {
        userId: user.user_id,
        hasAccess: newAccessState,
        accessLevel: newAccessState ? 'edit' : undefined
      }
    })
  } catch (error) {
    console.error('Failed to update user access:', error)
    // Revert on error
    user.hasAccess = oldAccessState
  }
}

async function addViewerAccess() {
  const viewer = selectedViewer.value
  if (!viewer) return false

  try {
    // If it's an individual viewer, grant access like a regular user
    if (viewer.type === 'viewer') {
      await $fetch(`/api/dashboards/${props.dashboardId}/access/users`, {
        method: 'POST',
        body: {
          userId: viewer.value,
          hasAccess: true,
          accessLevel: 'read' // Viewers typically get read-only access
        }
      })
    } else if (viewer.type === 'group') {
      // TODO: Implement group access if needed
      return false
    }

    // Reload dashboard access to update the UI
    await loadDashboardAccess()
    return true
  } catch (error) {
    console.error('Failed to add viewer access:', error)
    return false
  }
}

async function removeViewerAccess(viewer: any) {
  try {
    await $fetch(`/api/dashboards/${props.dashboardId}/access/users`, {
      method: 'POST',
      body: {
        userId: viewer.id,
        hasAccess: false
      }
    })

    // Reload dashboard access to update the UI
    await loadDashboardAccess()
  } catch (error) {
    console.error('Failed to remove viewer access:', error)
  }
}


async function updatePublicAccess() {
  try {
    const response = await $fetch(`/api/dashboards/${props.dashboardId}/access/public`, {
      method: 'POST',
      body: {
        isPublic: isPublic.value,
        password: isPasswordProtected.value ? publicPassword.value : null
      }
    })

    // Update the public URL from the API response
    if (response.publicUrl) {
      publicUrl.value = response.publicUrl
    } else if (!isPublic.value) {
      publicUrl.value = ''
    }
  } catch (error) {
    console.error('Failed to update public access:', error)
    // Revert on error
    isPublic.value = !isPublic.value
  }
}

function handlePasswordToggle() {
  if (!isPasswordProtected.value) {
    publicPassword.value = ''
    hasExistingPassword.value = false
  }
  updatePublicAccess()
}

function updatePassword() {
  // Only update if we have a password or are clearing it
  if (isPasswordProtected.value) {
    // Use nextTick to ensure v-model has updated the reactive variable
    nextTick(() => {
      updatePublicAccess()
    })
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    // TODO: Show success toast
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

function closeModal() {
  isOpen.value = false
  activeTab.value = 'users'
  selectedViewer.value = null
}

// Watchers
watch(isOpen, (open) => {
  if (open) {
    error.value = '' // Clear any previous errors
    loadData()
  }
})

// Automatically add viewer access when selected
watch(selectedViewerId, async (newId, oldId) => {
  // Only add if it's a new selection (not clearing)
  if (newId && newId !== oldId) {
    const success = await addViewerAccess()
    if (success !== false) { // If not explicitly failed
      selectedViewerId.value = '' // Clear selection after adding
    }
  }
})

// Clear selected viewer when modal closes
watch(isOpen, (open) => {
  if (!open) {
    selectedViewerId.value = ''
  }
})
</script>
