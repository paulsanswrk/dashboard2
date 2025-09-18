<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton variant="ghost" @click="goBack" class="p-2">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </UButton>
        <div>
          <h1 class="text-2xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">
            {{ organization?.name || 'Organization Details' }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organization ID: {{ organization?.id }}
          </p>
        </div>
      </div>
    </div>

    <ClientOnly>
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p class="text-gray-500 dark:text-gray-400">Loading organization details...</p>
        </div>
      </div>

      <!-- Organization Details -->
      <div v-else-if="organization" class="space-y-6">
        <!-- Organization Overview -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              Organization Overview
            </h3>
          </template>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-3">
                <Icon name="heroicons:users" class="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.user_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
            </div>
            
            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-3">
                <Icon name="heroicons:user-group" class="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.profile_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Internal Users</div>
            </div>
            
            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-3">
                <Icon name="heroicons:eye" class="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.viewer_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Viewers</div>
            </div>
            
            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full mx-auto mb-3">
                <Icon name="heroicons:chart-bar" class="w-6 h-6 text-orange-600 dark:text-orange-300" />
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
                  {{ formatDate(organization.created_at) }}
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <UBadge :color="organization.status === 'active' ? 'green' : 'gray'" variant="soft">
                  {{ organization.status || 'Active' }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Users Section -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              Internal Users ({{ organization.profiles?.length || 0 }})
            </h3>
          </template>
          
          <div v-if="organization.profiles?.length > 0" class="space-y-3">
            <div v-for="profile in organization.profiles" :key="profile.user_id" 
                 class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <Icon name="heroicons:user" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(profile.created_at, true) }}
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <Icon name="heroicons:user-group" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">No internal users found</p>
          </div>
        </UCard>

        <!-- Viewers Section -->
        <UCard class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              Viewers ({{ organization.viewers?.length || 0 }})
            </h3>
          </template>
          
          <div v-if="organization.viewers?.length > 0" class="space-y-3">
            <div v-for="viewer in organization.viewers" :key="viewer.user_id" 
                 class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <Icon name="heroicons:eye" class="w-4 h-4 text-purple-600 dark:text-purple-300" />
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
              <div class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(viewer.created_at, true) }}
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <Icon name="heroicons:eye" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">No viewers found</p>
          </div>
        </UCard>

        <!-- License Management Card -->
        <UCard class="bg-white dark:bg-gray-800">
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
        <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Organization not found</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">The organization you're looking for doesn't exist or you don't have permission to view it.</p>
        <UButton @click="goBack" color="orange">
          <Icon name="heroicons:arrow-left" class="w-4 h-4 mr-1" />
          Go Back
        </UButton>
      </div>

      <template #fallback>
        <!-- Server-side fallback -->
        <div class="flex justify-center items-center py-12">
          <div class="text-center">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
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
const { userProfile } = useAuth()

// State
const organization = ref(null)
const isLoading = ref(false)
const isUpdating = ref(false)

// Form data
const licensesForm = ref({
  licenses: 0
})

// Computed
const availableLicenses = computed(() => {
  if (!organization.value) return 0
  return (organization.value.licenses || 0) - (organization.value.viewer_count || 0)
})

// Get access token for API calls
const getAccessToken = async () => {
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
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
      organization.value = { ...organization.value, ...response.organization }
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
  if (short) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  return new Date(dateString).toLocaleDateString('en-US', {
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

// Load organization details on mount
onMounted(() => {
  loadOrganizationDetails()
})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
