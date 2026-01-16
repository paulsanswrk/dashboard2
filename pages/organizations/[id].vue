<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton variant="ghost" @click="goBack" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
          <Icon name="i-heroicons-arrow-left" class="w-5 h-5"/>
        </UButton>
        <div>
          <h1 class="text-2xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">
            {{ organization?.name || 'Organization Details' }}
          </h1>
        </div>
      </div>
    </div>

    <ClientOnly>
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
          <p class="text-gray-500 dark:text-gray-400">Loading organization details...</p>
        </div>
      </div>

      <!-- Organization Details -->
      <div v-else-if="organization" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">
        <!-- Organization Overview -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              Organization Overview
            </h3>
          </template>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">


            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-user-group" class="w-6 h-6 text-green-600 dark:text-green-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.profile_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Internal Users</div>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-eye" class="w-6 h-6 text-purple-600 dark:text-purple-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.viewer_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Viewers</div>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-chart-bar" class="w-6 h-6 text-orange-600 dark:text-orange-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.dashboards_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Dashboards</div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Name
                </label>
                <div class="text-gray-900 dark:text-white font-medium">
                  {{ organization.name }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization ID
                </label>
                <div class="text-gray-500 dark:text-gray-400 font-mono text-sm">
                  {{ organization.id }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Created Date
                </label>
                <div class="text-gray-900 dark:text-white">
                  {{ formatDate(organization.createdAt) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <UBadge :color="organization.status === 'active' ? 'success' : 'neutral'" variant="soft">
                  {{ organization.status || 'Active' }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Users Section -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
                Internal Users ({{ internalUsers?.length || 0 }})
              </h3>
              <UButton
                  color="orange"
                  size="sm"
                  class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                  @click="openAddUserModal"
                  :disabled="isLoading"
              >
                <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
                Add User
              </UButton>
            </div>
          </template>

          <div v-if="internalUsers?.length > 0" class="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div v-for="profile in internalUsers" :key="profile.userId"
                 class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <Icon name="i-heroicons-user" class="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                </div>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ profile.first_name }} {{ profile.last_name }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ profile.role }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(profile.createdAt, true) }}
                </div>
                <UButton
                    variant="ghost"
                    size="sm"
                    color="red"
                    class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
                    @click="deleteUser(profile)"
                    :disabled="isDeletingUser"
                    :loading="isDeletingUser && deletingUserId === profile.userId"
                >
                  <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                </UButton>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="i-heroicons-user-group" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400">No internal users found</p>
          </div>
        </UCard>

        <!-- Viewers Section -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
                Viewers ({{ allViewers?.length || 0 }})
              </h3>
              <UButton
                  color="purple"
                  size="sm"
                  class="bg-purple-500 hover:bg-purple-600 text-white cursor-pointer"
                  @click="openAddViewerModal"
                  :disabled="isLoading"
              >
                <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
                Add Viewer
              </UButton>
            </div>
          </template>

          <div v-if="allViewers?.length > 0" class="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div v-for="viewer in allViewers" :key="viewer.user_id"
                 class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Icon name="i-heroicons-eye" class="w-4 h-4 text-purple-600 dark:text-purple-300"/>
                </div>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ viewer.first_name }} {{ viewer.last_name }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ viewer.viewer_type || 'Viewer' }}
                    <span v-if="viewer.group_name" class="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                      {{ viewer.group_name }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(viewer.createdAt, true) }}
                </div>
                <UButton
                    variant="ghost"
                    size="sm"
                    color="red"
                    class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
                    @click="deleteViewer(viewer)"
                    :disabled="isDeletingViewer"
                    :loading="isDeletingViewer && deletingViewerId === viewer.userId"
                >
                  <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                </UButton>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="i-heroicons-eye" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400">No viewers found</p>
          </div>
        </UCard>

        <!-- License Management Card -->
        <UCard v-if="false" class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              License Management
            </h3>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Licenses
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Set the maximum number of viewer licenses for this organization
                </p>
              </div>
              <div class="flex items-center gap-3">
                <UInput
                    v-model="licensesForm.licenses"
                    type="number"
                    min="0"
                    class="w-24 text-center"
                    :disabled="isUpdating"
                />
                <UButton
                    color="orange"
                    class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                    @click="updateLicenses"
                    :loading="isUpdating"
                    :disabled="licensesForm.licenses === organization.licenses"
                >
                  Update
                </UButton>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Current Licenses:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ organization.licenses || 0 }}</span>
              </div>
              <div class="flex items-center justify-between text-sm mt-1">
                <span class="text-gray-600 dark:text-gray-400">Used by Viewers:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ organization.viewer_count || 0 }}</span>
              </div>
              <div class="flex items-center justify-between text-sm mt-1">
                <span class="text-gray-600 dark:text-gray-400">Available:</span>
                <span class="font-medium" :class="availableLicenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ availableLicenses }}
                </span>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error State -->
      <div v-else class="text-center py-12">
        <Icon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-400 mx-auto mb-4"/>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Organization not found</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">The organization you're looking for doesn't exist or you don't have permission to view it.</p>
        <UButton @click="goBack" color="orange">
          <Icon name="i-heroicons-arrow-left" class="w-4 h-4 mr-1"/>
          Go Back
        </UButton>
      </div>

      <!-- Add User Modal -->
      <UModal v-model:open="showAddUserModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            Add New User
          </h3>
        </template>

        <template #body>
          <form @submit.prevent="addUser" class="space-y-4">
            <UFormField label="Email Address" required>
              <UInput v-model="userForm.email" type="email" placeholder="Enter email address" class="w-full"/>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name" required>
                <UInput v-model="userForm.firstName" placeholder="Enter first name" class="w-full"/>
              </UFormField>

              <UFormField label="Last Name" required>
                <UInput v-model="userForm.lastName" placeholder="Enter last name" class="w-full"/>
              </UFormField>
            </div>

            <UFormField label="Role">
              <USelect
                  v-model="userForm.role"
                  :items="userRoleOptions"
                  placeholder="Select role"
                  class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="closeAddUserModal">Cancel</UButton>
              <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white dark:text-black cursor-pointer" :loading="isAddingUser">
                Add User
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Add Viewer Modal -->
      <UModal v-model:open="showAddViewerModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            Add New Viewer
          </h3>
        </template>

        <template #body>
          <form @submit.prevent="addViewer" class="space-y-4">
            <UFormField label="Email Address" required>
              <UInput v-model="viewerForm.email" type="email" placeholder="Enter email address" class="w-full"/>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name" required>
                <UInput v-model="viewerForm.firstName" placeholder="Enter first name" class="w-full"/>
              </UFormField>

              <UFormField label="Last Name" required>
                <UInput v-model="viewerForm.lastName" placeholder="Enter last name" class="w-full"/>
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Viewer Type">
                <UInput v-model="viewerForm.type" placeholder="e.g., Viewer, Manager" class="w-full"/>
              </UFormField>

              <UFormField label="Group">
                <UInput v-model="viewerForm.group" placeholder="e.g., Sales, Marketing" class="w-full"/>
              </UFormField>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="closeAddViewerModal">Cancel</UButton>
              <UButton type="submit" color="purple" class="bg-purple-500 hover:bg-purple-600 text-white dark:text-black cursor-pointer" :loading="isAddingViewer">
                Add Viewer
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Delete User Confirmation Modal -->
      <UModal v-model:open="showDeleteUserModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-red-600 dark:text-red-400">
            Delete User
          </h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400"/>
              </div>
              <div class="space-y-2">
                <p class="text-gray-900 dark:text-white font-medium">
                  Are you sure you want to delete this user?
                </p>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p class="text-sm text-red-800 dark:text-red-200 font-medium mb-1">This will permanently delete:</p>
                  <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• User account and all associated data</li>
                    <li>• All dashboards created by this user</li>
                  </ul>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" @click="cancelDeleteUser" :disabled="isDeletingUser">
                Cancel
              </UButton>
              <UButton
                  color="red"
                  @click="confirmDeleteUser"
                  :loading="isDeletingUser"
              >
                Delete User
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Delete Viewer Confirmation Modal -->
      <UModal v-model:open="showDeleteViewerModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-red-600 dark:text-red-400">
            Delete Viewer
          </h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400"/>
              </div>
              <div class="space-y-2">
                <p class="text-gray-900 dark:text-white font-medium">
                  Are you sure you want to delete this viewer?
                </p>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p class="text-sm text-red-800 dark:text-red-200 font-medium mb-1">This will permanently delete:</p>
                  <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• Viewer account and all associated data</li>
                    <li>• Access to all shared dashboards</li>
                  </ul>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" @click="cancelDeleteViewer" :disabled="isDeletingViewer">
                Cancel
              </UButton>
              <UButton
                  color="red"
                  @click="confirmDeleteViewer"
                  :loading="isDeletingViewer"
              >
                Delete Viewer
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <template #fallback>
        <!-- Server-side fallback -->
        <div class="flex justify-center items-center py-12">
          <div class="text-center">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
            <p class="text-gray-500 dark:text-gray-400">Loading organization details...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
// Get organization ID from route
const route = useRoute()
const organizationId = route.params.id

// Authentication
const {userProfile} = useAuth()

// State
const organization = ref(null)
const isLoading = ref(false)
const isUpdating = ref(false)

// Modal states
const showAddUserModal = ref(false)
const showAddViewerModal = ref(false)
const showDeleteUserModal = ref(false)
const showDeleteViewerModal = ref(false)

// Loading states
const isAddingUser = ref(false)
const isAddingViewer = ref(false)
const isDeletingUser = ref(false)
const isDeletingViewer = ref(false)
const deletingUserId = ref(null)
const deletingViewerId = ref(null)

// Form data
const licensesForm = ref({
  licenses: 0
})

const userForm = ref({
  email: '',
  firstName: '',
  lastName: '',
  role: 'EDITOR'
})

const viewerForm = ref({
  email: '',
  firstName: '',
  lastName: '',
  type: 'Viewer',
  group: ''
})

// User to delete
const userToDelete = ref(null)
const viewerToDelete = ref(null)

// Role options
const userRoleOptions = [
  {label: 'Editor', value: 'EDITOR'},
  {label: 'Admin', value: 'ADMIN'}
]

// Computed
const availableLicenses = computed(() => {
  if (!organization.value) return 0
  return (organization.value.licenses || 0) - (organization.value.viewer_count || 0)
})

// Filter users by role
const internalUsers = computed(() => {
  if (!organization.value?.profiles) return []
  return organization.value.profiles.filter(profile =>
      profile.role === 'ADMIN' || profile.role === 'EDITOR'
  )
})

const allViewers = computed(() => {
  if (!organization.value) return []

  const viewersFromProfiles = (organization.value.profiles || [])
      .filter(profile => profile.role === 'VIEWER')
      .map(profile => ({
        userId: profile.userId,
        first_name: profile.first_name,
        last_name: profile.last_name,
        viewer_type: profile.viewer_type || 'Viewer',
        group_name: profile.group_name || null,
        createdAt: profile.createdAt
      }))

  const viewersFromViewersTable = organization.value.viewers || []

  // Combine both sources and remove duplicates
  const allViewers = [...viewersFromProfiles, ...viewersFromViewersTable]
  const uniqueViewers = allViewers.filter((viewer, index, self) =>
      index === self.findIndex(v => v.userId === viewer.userId)
  )

  return uniqueViewers
})

// Get access token for API calls
const getAccessToken = async () => {
  const supabase = useSupabaseClient()
  const {data: {session}} = await supabase.auth.getSession()
  return session?.access_token
}

// Load organization details
const loadOrganizationDetails = async () => {
  try {
    isLoading.value = true

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      organization.value = response.organization
      licensesForm.value.licenses = response.organization.licenses || 0
    } else {
      throw new Error('Failed to load organization details')
    }
  } catch (error) {
    console.error('Error loading organization details:', error)

    // Handle session expired errors
    if (error.message?.includes('Session expired') ||
        error.message?.includes('Please log in again') ||
        error.message?.includes('No access token available')) {
      const toast = useToast()
      toast.add({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
        color: 'red'
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        navigateTo('/login')
      }, 2000)
      return
    }

    // Show user-friendly error message for other errors
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: 'Failed to load organization details. Please try again.',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}

// Update licenses
const updateLicenses = async () => {
  try {
    isUpdating.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        licenses: parseInt(licensesForm.value.licenses)
      }
    })

    if (response.success) {
      organization.value = {...organization.value, ...response.organization}
      toast.add({
        title: 'Success',
        description: 'Licenses updated successfully',
        color: 'green'
      })
    } else {
      throw new Error(response.message || 'Failed to update licenses')
    }
  } catch (error) {
    console.error('Error updating licenses:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update licenses. Please try again.',
      color: 'red'
    })
  } finally {
    isUpdating.value = false
  }
}

// Format date
const formatDate = (dateString, short = false) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'

  if (short) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Navigation
const goBack = () => {
  navigateTo('/organizations')
}

// Modal functions
const openAddUserModal = () => {
  userForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'EDITOR'
  }
  showAddUserModal.value = true
}

const closeAddUserModal = () => {
  showAddUserModal.value = false
  userForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'EDITOR'
  }
}

const openAddViewerModal = () => {
  viewerForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    type: 'Viewer',
    group: ''
  }
  showAddViewerModal.value = true
}

const closeAddViewerModal = () => {
  showAddViewerModal.value = false
  viewerForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    type: 'Viewer',
    group: ''
  }
}

// Add user function
const addUser = async () => {
  try {
    isAddingUser.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        email: userForm.value.email,
        firstName: userForm.value.firstName,
        lastName: userForm.value.lastName,
        role: userForm.value.role
      }
    })

    if (response.success) {
      // Reload organization details to get updated user list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'User added successfully',
        color: 'green'
      })

      closeAddUserModal()
    } else {
      throw new Error(response.error || 'Failed to add user')
    }
  } catch (error) {
    console.error('Error adding user:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to add user. Please try again.',
      color: 'red'
    })
  } finally {
    isAddingUser.value = false
  }
}

// Add viewer function
const addViewer = async () => {
  try {
    isAddingViewer.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}/viewers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        email: viewerForm.value.email,
        firstName: viewerForm.value.firstName,
        lastName: viewerForm.value.lastName,
        type: viewerForm.value.type,
        group: viewerForm.value.group
      }
    })

    if (response.success) {
      // Reload organization details to get updated viewer list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'Viewer added successfully',
        color: 'green'
      })

      closeAddViewerModal()
    } else {
      throw new Error(response.error || 'Failed to add viewer')
    }
  } catch (error) {
    console.error('Error adding viewer:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to add viewer. Please try again.',
      color: 'red'
    })
  } finally {
    isAddingViewer.value = false
  }
}

// Delete user functions
const deleteUser = (profile) => {
  userToDelete.value = profile
  showDeleteUserModal.value = true
}

const confirmDeleteUser = async () => {
  if (!userToDelete.value) return

  try {
    isDeletingUser.value = true
    deletingUserId.value = userToDelete.value.userId
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/users/${userToDelete.value.userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      // Reload organization details to get updated user list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'User deleted successfully',
        color: 'green'
      })

      cancelDeleteUser()
    } else {
      throw new Error(response.error || 'Failed to delete user')
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete user. Please try again.',
      color: 'red'
    })
  } finally {
    isDeletingUser.value = false
    deletingUserId.value = null
  }
}

const cancelDeleteUser = () => {
  showDeleteUserModal.value = false
  userToDelete.value = null
}

// Delete viewer functions
const deleteViewer = (viewer) => {
  viewerToDelete.value = viewer
  showDeleteViewerModal.value = true
}

const confirmDeleteViewer = async () => {
  if (!viewerToDelete.value) return

  try {
    isDeletingViewer.value = true
    deletingViewerId.value = viewerToDelete.value.userId
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    // Use the existing viewers API endpoint which handles both types
    const response = await $fetch(`/api/viewers/${viewerToDelete.value.userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      // Reload organization details to get updated viewer list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'Viewer deleted successfully',
        color: 'green'
      })

      cancelDeleteViewer()
    } else {
      throw new Error(response.error || 'Failed to delete viewer')
    }
  } catch (error) {
    console.error('Error deleting viewer:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete viewer. Please try again.',
      color: 'red'
    })
  } finally {
    isDeletingViewer.value = false
    deletingViewerId.value = null
  }
}

const cancelDeleteViewer = () => {
  showDeleteViewerModal.value = false
  viewerToDelete.value = null
}

// Load organization details on mount
onMounted(() => {
  loadOrganizationDetails()
})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
