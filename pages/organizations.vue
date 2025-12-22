<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-heading font-bold tracking-tight">Organizations</h1>
      <UButton color="orange" class="bg-orange-500 cursor-pointer hover:bg-orange-600 text-white dark:text-black" @click="openCreateOrganizationModal">
        <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
        New Organization
      </UButton>
    </div>

    <!-- Organizations Table -->
    <UCard class="bg-white dark:bg-gray-800">
      <template #header>
        <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">All Organizations</h3>
      </template>
      
      <ClientOnly>
        <!-- Loading State -->
        <div v-if="isLoading && organizations.length === 0" class="flex justify-center items-center py-12">
          <div class="text-center">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
            <p class="text-gray-500 dark:text-gray-400">Loading organizations...</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!isLoading && organizations.length === 0" class="text-center py-12">
          <Icon name="i-heroicons-building-office" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No organizations found</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first organization.</p>
          <UButton color="orange" @click="openCreateOrganizationModal">
            <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
            Create Organization
          </UButton>
        </div>

        <!-- Organizations Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Users</th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Licenses</th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
                <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                <th class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="org in organizations" :key="org.id" 
                  class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="py-3 px-4 cursor-pointer" @click="viewOrganizationDetails(org)">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <Icon name="i-heroicons-building-office" class="w-4 h-4 text-gray-600 dark:text-gray-300"/>
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ org.name }}</div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">{{ org.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 cursor-pointer" @click="viewOrganizationDetails(org)">
                  <div class="flex items-center gap-2">
                    <Icon name="i-heroicons-users" class="w-4 h-4 text-gray-400"/>
                    <span class="text-gray-900 dark:text-white">{{ org.user_count || 0 }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 cursor-pointer" @click="viewOrganizationDetails(org)">
                  <div class="flex items-center gap-2">
                    <Icon name="i-heroicons-key" class="w-4 h-4 text-gray-400"/>
                    <span class="text-gray-900 dark:text-white">{{ org.licenses || 0 }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-gray-900 dark:text-white cursor-pointer" @click="viewOrganizationDetails(org)">
                  {{ formatDate(org.created_at) }}
                </td>
                <td class="py-3 px-4 cursor-pointer" @click="viewOrganizationDetails(org)">
                  <UBadge :color="org.status === 'active' ? 'success' : 'neutral'" variant="soft">
                    {{ org.status || 'Active' }}
                  </UBadge>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-2">
                    <UButton 
                      variant="ghost" 
                      size="sm" 
                      color="red" 
                      @click.stop="deleteOrganization(org)" 
                      :disabled="isLoading"
                      :loading="isDeleting && deletingOrgId === org.id"
                    >
                      <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <template #fallback>
          <!-- Server-side fallback -->
          <div class="flex justify-center items-center py-12">
            <div class="text-center">
              <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
              <p class="text-gray-500 dark:text-gray-400">Loading organizations...</p>
            </div>
          </div>
        </template>
      </ClientOnly>
    </UCard>

    <!-- Create/Edit Organization Modal -->
    <UModal v-model:open="isCreateModalOpen">
      <template #header>
        <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
          {{ editingOrganization ? 'Edit Organization' : 'Create New Organization' }}
        </h3>
      </template>

      <template #body>
        <form @submit.prevent="saveOrganization" class="space-y-4">
          <UFormField label="Organization Name" required>
            <UInput v-model="organizationForm.name" placeholder="Enter organization name" class="w-full"/>
          </UFormField>

          <UFormField label="Description">
            <UTextarea v-model="organizationForm.description" placeholder="Enter organization description"
                       class="w-full"/>
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="closeCreateModal">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white dark:text-black cursor-pointer" :loading="isLoading">
              {{ editingOrganization ? 'Update' : 'Create' }} Organization
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-heading font-semibold tracking-tight text-red-600 dark:text-red-400">
          Delete Organization
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
                Are you sure you want to delete "<span class="font-semibold">{{ organizationToDelete?.name }}</span>"?
              </p>
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p class="text-sm text-red-800 dark:text-red-200 font-medium mb-1">This action will permanently delete:</p>
                <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• The organization and all its data</li>
                  <li>• All internal users ({{ organizationToDelete?.profile_count || 0 }})</li>
                  <li>• All viewers ({{ organizationToDelete?.viewer_count || 0 }})</li>
                  <li>• All dashboards created by organization users</li>
                </ul>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" @click="cancelDelete" :disabled="isDeleting">
              Cancel
            </UButton>
            <UButton
                color="red"
              @click="confirmDelete"
              :loading="isDeleting"
            >
              Delete Organization
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
// Authentication
const { userProfile } = useAuth()

// State
const organizations = ref([])
const isLoading = ref(false)
const isCreateModalOpen = ref(false)
const editingOrganization = ref(null)
const isDeleting = ref(false)
const deletingOrgId = ref(null)
const showDeleteModal = ref(false)
const organizationToDelete = ref(null)

// Form data
const organizationForm = ref({
  name: '',
  description: ''
})


// Get access token for API calls
const getAccessToken = async () => {
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

// Load organizations
const loadOrganizations = async () => {
  try {
    isLoading.value = true
    
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }
    
    const response = await $fetch('/api/organizations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.success) {
      organizations.value = response.organizations
    } else {
      throw new Error('Failed to load organizations')
    }
  } catch (error) {
    console.error('Error loading organizations:', error)
    
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
      description: 'Failed to load organizations. Please try again.',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Modal functions
const openCreateOrganizationModal = () => {
  editingOrganization.value = null
  organizationForm.value = { name: '', description: '' }
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
  editingOrganization.value = null
  organizationForm.value = { name: '', description: '' }
}

const viewOrganizationDetails = (org) => {
  navigateTo(`/admin/organizations/${org.id}`)
}

// Delete organization
const deleteOrganization = (org) => {
  organizationToDelete.value = org
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!organizationToDelete.value) return
  
  try {
    isDeleting.value = true
    deletingOrgId.value = organizationToDelete.value.id
    const toast = useToast()
    
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }
    
    const response = await $fetch(`/api/organizations/${organizationToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.success) {
      // Remove the organization from the list
      const index = organizations.value.findIndex(o => o.id === organizationToDelete.value.id)
      if (index !== -1) {
        organizations.value.splice(index, 1)
      }
      
      toast.add({
        title: 'Success',
        description: `Organization "${organizationToDelete.value.name}" and all associated users have been deleted successfully`,
        color: 'green'
      })
    } else {
      throw new Error(response.message || 'Failed to delete organization')
    }
  } catch (error) {
    console.error('Error deleting organization:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete organization. Please try again.',
      color: 'red'
    })
  } finally {
    isDeleting.value = false
    deletingOrgId.value = null
    showDeleteModal.value = false
    organizationToDelete.value = null
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  organizationToDelete.value = null
}

// Save organization
const saveOrganization = async () => {
  try {
    isLoading.value = true
    const toast = useToast()
    
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    }
    
    if (editingOrganization.value) {
      // Update existing organization
      const response = await $fetch(`/api/organizations/${editingOrganization.value.id}`, {
        method: 'PUT',
        headers,
        body: organizationForm.value
      })
      
      if (response.success) {
        // Update the organization in the list
        const index = organizations.value.findIndex(org => org.id === editingOrganization.value.id)
        if (index !== -1) {
          organizations.value[index] = { ...organizations.value[index], ...response.organization }
        }
        toast.add({
          title: 'Success',
          description: 'Organization updated successfully',
          color: 'green'
        })
      } else {
        throw new Error(response.message || 'Failed to update organization')
      }
    } else {
      // Create new organization
      const response = await $fetch('/api/organizations', {
        method: 'POST',
        headers,
        body: organizationForm.value
      })
      
      if (response.success) {
        organizations.value.unshift(response.organization)
        toast.add({
          title: 'Success',
          description: 'Organization created successfully',
          color: 'green'
        })
      } else {
        throw new Error(response.message || 'Failed to create organization')
      }
    }
    
    closeCreateModal()
  } catch (error) {
    console.error('Error saving organization:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save organization. Please try again.',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}


// Load organizations on mount
onMounted(() => {
  loadOrganizations()
})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
