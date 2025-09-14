<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
    <!-- Mobile Viewers Toggle -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('viewers')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
        Viewers ({{ viewers.length }})
      </UButton>
    </div>

    <!-- Viewers List -->
    <div 
      :class="[
        'border-r p-4 lg:p-6 transition-all duration-300',
        'w-full lg:w-1/2',
        mobilePanel === 'viewers' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 class="text-xl font-bold">Viewers ({{ filteredViewers.length }} / {{ totalViewers }})</h2>
        <UButton size="sm" @click="openAddViewerModal" class="w-full sm:w-auto" color="green">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
          Add Viewer
        </UButton>
      </div>
      
      <!-- Search and Bulk Actions -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex-1 relative">
          <UInput 
            v-model="searchQuery" 
            placeholder="Type to search..." 
            class="w-full pr-8"
          />
          <button 
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
        <div class="flex gap-2" v-if="selectedViewers.size > 0">
          <UButton variant="outline" size="sm" @click="addToGroup" :disabled="loading">
            <Icon name="heroicons:user-group" class="w-4 h-4 mr-1" />
            add to group
          </UButton>
          <UButton color="red" variant="outline" size="sm" @click="confirmBulkDelete" :disabled="loading">
            <Icon name="heroicons:trash" class="w-4 h-4 mr-1" />
            delete
          </UButton>
        </div>
      </div>
      
      <!-- Loading state -->
      <div v-if="pending" class="space-y-2">
        <UCard v-for="i in 3" :key="i" class="animate-pulse">
          <div class="p-4">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div class="flex gap-2">
              <div class="h-5 bg-gray-200 rounded w-16"></div>
              <div class="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p class="text-red-600 mb-4">{{ error }}</p>
        <UButton @click="refresh" variant="outline">
          Try Again
        </UButton>
      </div>

      <!-- Viewers Table -->
      <div v-else-if="viewers.length > 0" class="space-y-0">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b">
          <div class="col-span-1">
            <UCheckbox 
              :model-value="isAllSelected" 
              @update:model-value="toggleSelectAll"
            />
          </div>
          <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Email
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
          <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Name
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
          <div class="col-span-2 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Viewer Type
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
          <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Group
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
        </div>

        <!-- Table Rows -->
        <div 
          v-for="viewer in filteredViewers" 
          :key="viewer.id"
          class="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer border-b last:border-b-0"
          @click="selectViewer(viewer)"
        >
          <div class="col-span-1 flex items-center">
            <UCheckbox 
              :model-value="selectedViewers.has(viewer.id)"
              @update:model-value="(checked) => toggleViewerSelection(viewer.id, checked)"
              @click.stop
            />
          </div>
          <div class="col-span-3 text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ viewer.email }}
          </div>
          <div class="col-span-3 text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ viewer.name || 'No name' }}
          </div>
          <div class="col-span-2">
            <UBadge v-if="viewer.type" :color="viewer.type === 'Admin' ? 'red' : 'blue'" size="xs">
              {{ viewer.type }}
            </UBadge>
          </div>
          <div class="col-span-3 text-sm text-gray-600 dark:text-gray-400 truncate">
            {{ viewer.group || '' }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <Icon name="heroicons:eye" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-gray-500 mb-4">No viewers found</p>
        <UButton @click="openAddViewerModal" size="sm" color="green">
          Add First Viewer
        </UButton>
      </div>
    </div>

    <!-- Viewer Details -->
    <div class="flex-1 p-4 lg:p-6">
      <div v-if="selectedViewer">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Viewer Details</h2>
          <button 
            @click="closeMobilePanel"
            class="lg:hidden p-1 hover:bg-gray-200 rounded"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
        <UCard>
          <div class="p-4 lg:p-6 space-y-4">
            <UFormGroup label="First Name">
              <UInput v-model="selectedViewer.firstName" />
            </UFormGroup>
            
            <UFormGroup label="Last Name">
              <UInput v-model="selectedViewer.lastName" />
            </UFormGroup>
            
            <UFormGroup label="Email">
              <UInput v-model="selectedViewer.email" disabled />
            </UFormGroup>
            
            <UFormGroup label="Viewer Type">
              <USelect 
                v-model="selectedViewer.type"
                :options="viewerTypeOptions"
              />
            </UFormGroup>
            
            <UFormGroup label="Group">
              <USelect 
                v-model="selectedViewer.group"
                :options="groupOptions"
              />
            </UFormGroup>
            
            <div class="flex flex-col sm:flex-row gap-2 pt-4">
              <UButton @click="saveViewer" :loading="loading" :disabled="loading" class="w-full sm:w-auto">
                Save Changes
              </UButton>
              <UButton color="red" variant="outline" @click="confirmDeleteViewer" :disabled="loading" class="w-full sm:w-auto">
                Delete Viewer
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
      
      <div v-else class="flex items-center justify-center h-full text-gray-500">
        <div class="text-center">
          <Icon name="heroicons:eye" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a viewer to view details</p>
        </div>
      </div>
    </div>

    <!-- Add Viewer Modal -->
    <UModal v-model="showAddViewerModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add Viewer</h3>
        </template>
        
        <form @submit.prevent="addViewer" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Email" required>
              <UInput placeholder="viewer@example.com" v-model="newViewer.email" type="email" required />
            </UFormGroup>
            <UFormGroup label="First Name">
              <UInput placeholder="First Name" v-model="newViewer.firstName" />
            </UFormGroup>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Last Name">
              <UInput placeholder="Last Name" v-model="newViewer.lastName" />
            </UFormGroup>
            <UFormGroup label="Language">
              <USelect 
                v-model="newViewer.language"
                :options="languageOptions"
                placeholder="English"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Viewer Type" required>
            <USelect 
              v-model="newViewer.type"
              :options="viewerTypeOptions"
              placeholder="Select type"
              required
            />
          </UFormGroup>

          <UFormGroup label="Groups">
            <USelect 
              v-model="newViewer.group"
              :options="groupOptions"
              placeholder="Select group"
            />
          </UFormGroup>

          <UFormGroup>
            <UCheckbox v-model="newViewer.sendInvitation" label="Send invitation emails" />
          </UFormGroup>

          <!-- Error display in modal -->
          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <div class="flex justify-end gap-2">
            <UButton type="button" variant="outline" @click="closeAddViewerModal" :disabled="loading">
              Cancel
            </UButton>
            <UButton type="submit" :loading="loading" :disabled="loading" color="green">
              Add Viewer
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteConfirmModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">Delete Viewer</h3>
        </template>
        
        <div class="space-y-4">
          <p class="text-gray-700">
            Are you sure you want to delete <strong>{{ viewerToDelete?.name || 'this viewer' }}</strong>? 
            This action cannot be undone.
          </p>
          
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showDeleteConfirmModal = false" :disabled="loading">
              Cancel
            </UButton>
            <UButton color="red" @click="deleteViewer" :loading="loading" :disabled="loading">
              Delete Viewer
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Bulk Delete Confirmation Modal -->
    <UModal v-model="showBulkDeleteConfirm">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">Delete Viewers</h3>
        </template>
        
        <div class="space-y-4">
          <p class="text-gray-700">
            Are you sure you want to delete <strong>{{ selectedViewers.size }} viewer(s)</strong>? 
            This action cannot be undone.
          </p>
          
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showBulkDeleteConfirm = false" :disabled="loading">
              Cancel
            </UButton>
            <UButton color="red" @click="bulkDeleteViewers" :loading="loading" :disabled="loading">
              Delete {{ selectedViewers.size }} Viewer(s)
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
const selectedViewer = ref(null)
const showAddViewerModal = ref(false)
const showDeleteConfirmModal = ref(false)
const viewerToDelete = ref(null)
const mobilePanel = ref(null)
const loading = ref(false)
const error = ref(null)

// Search and selection state
const searchQuery = ref('')
const selectedViewers = ref(new Set())
const showBulkDeleteConfirm = ref(false)

// Reactive data for viewers
const viewersData = ref(null)
const pending = ref(false)
const fetchError = ref(null)

// Fetch viewers data from API
const fetchViewers = async () => {
  try {
    pending.value = true
    fetchError.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch('/api/viewers', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    viewersData.value = response
  } catch (err) {
    fetchError.value = err
    console.error('Error fetching viewers:', err)
  } finally {
    pending.value = false
  }
}

// Watch for user authentication and fetch data
const user = useSupabaseUser()
watch(user, async (newUser) => {
  if (newUser) {
    await fetchViewers()
  } else {
    viewersData.value = null
  }
}, { immediate: true })

// Refresh function
const refresh = () => fetchViewers()

const viewers = computed(() => viewersData.value?.viewers || [])
const totalViewers = computed(() => viewersData.value?.total || 0)

// Search functionality
const filteredViewers = computed(() => {
  if (!searchQuery.value.trim()) {
    return viewers.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return viewers.value.filter(viewer => 
    viewer.name?.toLowerCase().includes(query) ||
    viewer.email?.toLowerCase().includes(query) ||
    viewer.type?.toLowerCase().includes(query) ||
    viewer.group?.toLowerCase().includes(query)
  )
})

// Selection functionality
const isAllSelected = computed(() => {
  return filteredViewers.value.length > 0 && 
         filteredViewers.value.every(viewer => selectedViewers.value.has(viewer.id))
})

const toggleSelectAll = (checked) => {
  if (checked) {
    filteredViewers.value.forEach(viewer => {
      selectedViewers.value.add(viewer.id)
    })
  } else {
    filteredViewers.value.forEach(viewer => {
      selectedViewers.value.delete(viewer.id)
    })
  }
}

const toggleViewerSelection = (viewerId, checked) => {
  if (checked) {
    selectedViewers.value.add(viewerId)
  } else {
    selectedViewers.value.delete(viewerId)
  }
}

// Watch for fetch errors
watch(fetchError, (newError) => {
  if (newError) {
    error.value = newError.data?.statusMessage || newError.message || 'Failed to load viewers'
  }
})

const newViewer = ref({
  email: '',
  firstName: '',
  lastName: '',
  language: '',
  type: '',
  group: '',
  sendInvitation: false
})

const viewerTypeOptions = [
  { label: 'Internal', value: 'Internal' },
  { label: 'External', value: 'External' }
]

const groupOptions = [
  { label: 'Sales', value: 'Sales' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Finance', value: 'Finance' }
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'German', value: 'de' },
  { label: 'French', value: 'fr' }
]

const toggleMobilePanel = (panel) => {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

const closeMobilePanel = () => {
  mobilePanel.value = null
}

const selectViewer = (viewer) => {
  selectedViewer.value = { ...viewer }
  // Debug: Log the selected viewer data
  console.log('Selected viewer:', {
    id: selectedViewer.value.id,
    firstName: selectedViewer.value.firstName,
    lastName: selectedViewer.value.lastName,
    type: selectedViewer.value.type,
    group: selectedViewer.value.group
  })
  // Close mobile panel after selection
  closeMobilePanel()
}

const openAddViewerModal = () => {
  error.value = null
  showAddViewerModal.value = true
}

const closeAddViewerModal = () => {
  showAddViewerModal.value = false
  newViewer.value = {
    email: '',
    firstName: '',
    lastName: '',
    language: '',
    type: '',
    group: '',
    sendInvitation: false
  }
}

const addViewer = async () => {
  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const response = await $fetch('/api/viewers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
    email: newViewer.value.email,
        firstName: newViewer.value.firstName,
        lastName: newViewer.value.lastName,
    type: newViewer.value.type,
        group: newViewer.value.group,
        sendInvitation: newViewer.value.sendInvitation
  }
    })
  
    if (response.success) {
      // Refresh the viewers list
      await refresh()
  closeAddViewerModal()
      console.log('Viewer added:', response.viewer)
    }
  } catch (err) {
    error.value = err.data?.statusMessage || 'Failed to add viewer'
    console.error('Error adding viewer:', err)
  } finally {
    loading.value = false
  }
}

const saveViewer = async () => {
  if (!selectedViewer.value) return

  try {
    loading.value = true
    error.value = null

    // Debug: Log the current selectedViewer values
    console.log('Saving viewer with data:', {
      id: selectedViewer.value.id,
      firstName: selectedViewer.value.firstName,
      lastName: selectedViewer.value.lastName,
      type: selectedViewer.value.type,
      group: selectedViewer.value.group
    })

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch(`/api/viewers/${selectedViewer.value.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        firstName: selectedViewer.value.firstName,
        lastName: selectedViewer.value.lastName,
        type: selectedViewer.value.type,
        group: selectedViewer.value.group
      }
    })

    if (response.success) {
      // Reload the viewers list to get fresh data
      await refresh()
      
      // Update the selected viewer with the response data
      selectedViewer.value = { ...response.viewer }
      
      console.log('Viewer saved successfully:', response.viewer)
    }
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to save viewer'
    console.error('Error saving viewer:', err)
  } finally {
    loading.value = false
  }
}

const confirmDeleteViewer = () => {
  if (selectedViewer.value) {
    viewerToDelete.value = selectedViewer.value
    showDeleteConfirmModal.value = true
  }
}

const deleteViewer = async () => {
  if (!viewerToDelete.value) return

  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch(`/api/viewers/${viewerToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (response.success) {
      // Reload the viewers list to get fresh data
      await refresh()
      
      // Clear selection if deleted viewer was selected
      if (selectedViewer.value?.id === viewerToDelete.value.id) {
        selectedViewer.value = null
      }
      
      // Clear selection from selected viewers
      selectedViewers.value.clear()
      
      // Close modals
      showDeleteConfirmModal.value = false
      viewerToDelete.value = null
      
      console.log('Viewer deleted successfully')
    }
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to delete viewer'
    console.error('Error deleting viewer:', err)
  } finally {
    loading.value = false
  }
}

// Bulk action functions
const addToGroup = () => {
  console.log('Add to group functionality - to be implemented')
  // TODO: Implement add to group functionality
}

const confirmBulkDelete = () => {
  if (selectedViewers.value.size > 0) {
    showBulkDeleteConfirm.value = true
  }
}

const bulkDeleteViewers = async () => {
  if (selectedViewers.value.size === 0) return

  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    // Delete each selected viewer
    const deletePromises = Array.from(selectedViewers.value).map(viewerId => 
      $fetch(`/api/viewers/${viewerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
    )

    const results = await Promise.allSettled(deletePromises)
    
    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some deletions failed:', failures)
      error.value = `${failures.length} viewer(s) could not be deleted`
    }

    // Check for any successful deletions
    const successfulDeletions = results.filter(result => result.status === 'fulfilled' && result.value.success)
    
    if (successfulDeletions.length > 0) {
      // Reload the viewers list to get fresh data
      await refresh()
      
      // Clear selection
      selectedViewers.value.clear()
      
      // Clear selected viewer if it was deleted
      const deletedIds = successfulDeletions.map(result => result.value.viewerId)
      if (selectedViewer.value && deletedIds.includes(selectedViewer.value.id)) {
        selectedViewer.value = null
      }
      
      console.log(`Successfully deleted ${successfulDeletions.length} viewer(s)`)
    }
    
    // Close modal
    showBulkDeleteConfirm.value = false
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to delete viewers'
    console.error('Error bulk deleting viewers:', err)
  } finally {
    loading.value = false
  }
}
</script>
