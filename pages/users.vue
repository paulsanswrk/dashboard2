<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
    <!-- Mobile Users Toggle -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('users')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="heroicons:users" class="w-4 h-4 mr-2" />
        Users ({{ users.length }})
      </UButton>
    </div>

    <!-- Users List -->
    <div 
      :class="[
        'border-r p-4 lg:p-6 transition-all duration-300',
        'w-full lg:w-1/2',
        mobilePanel === 'users' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 class="text-xl font-bold">Users ({{ filteredUsers.length }} / {{ totalUsers }})</h2>
        <UButton size="sm" @click="openAddUserModal" class="w-full sm:w-auto" color="green">
          <Icon name="heroicons:user-plus" class="w-4 h-4 mr-2" />
          Add User
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
        <div class="flex gap-2" v-if="selectedUsers.size > 0">
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

      <!-- Users Table -->
      <div v-else-if="users.length > 0" class="space-y-0">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b">
          <div class="col-span-1">
            <UCheckbox 
              :model-value="isAllSelected" 
              @update:model-value="toggleSelectAll"
            />
          </div>
          <div class="col-span-5 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Email
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
          <div class="col-span-6 font-medium text-gray-700 dark:text-gray-300">
            <div class="flex items-center gap-1">
              Name
              <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
            </div>
          </div>
        </div>

        <!-- Table Rows -->
        <div 
          v-for="user in filteredUsers" 
          :key="user.id"
          class="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer border-b last:border-b-0"
          @click="selectUser(user)"
        >
          <div class="col-span-1 flex items-center">
            <UCheckbox 
              :model-value="selectedUsers.has(user.id)"
              @update:model-value="(checked) => toggleUserSelection(user.id, checked)"
              @click.stop
            />
          </div>
          <div class="col-span-5 text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ user.email }}
          </div>
          <div class="col-span-6 text-sm text-gray-900 dark:text-gray-100 truncate">
            {{ user.name || 'No name' }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <Icon name="heroicons:users" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-gray-500 mb-4">No users found</p>
        <UButton @click="openAddUserModal" color="green">
          Add First User
        </UButton>
      </div>
    </div>

    <!-- User Details -->
    <div class="flex-1 p-4 lg:p-6">
      <div v-if="selectedUser">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">User Details</h2>
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
              <UInput v-model="selectedUser.firstName" />
            </UFormGroup>
            
            <UFormGroup label="Last Name">
              <UInput v-model="selectedUser.lastName" />
            </UFormGroup>
            
            <UFormGroup label="Email">
              <UInput v-model="selectedUser.email" disabled />
            </UFormGroup>
            
            <div class="flex flex-col sm:flex-row gap-2 pt-4">
              <UButton @click="saveUser" :loading="loading" :disabled="loading" class="w-full sm:w-auto">
                Save Changes
              </UButton>
              <UButton color="red" variant="outline" @click="confirmDeleteUser" :disabled="loading" class="w-full sm:w-auto">
                Delete User
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
      
      <div v-else class="flex items-center justify-center h-full text-gray-500">
        <div class="text-center">
          <Icon name="heroicons:user" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a user to view details</p>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <UModal v-model="showAddUserModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add New User</h3>
        </template>
        
        <form @submit.prevent="addUser" class="space-y-4">
          <UFormGroup label="Email" required>
            <UInput v-model="newUser.email" placeholder="user@company.com" type="email" required />
          </UFormGroup>
          
          <UFormGroup label="First Name">
            <UInput v-model="newUser.firstName" placeholder="John" />
          </UFormGroup>
          
          <UFormGroup label="Last Name">
            <UInput v-model="newUser.lastName" placeholder="Doe" />
          </UFormGroup>
          
          <div v-if="error" class="text-red-600 text-sm">
            {{ error }}
          </div>
          
          <div class="flex justify-end gap-2 pt-4">
            <UButton type="button" variant="outline" @click="closeAddUserModal" :disabled="loading">
              Cancel
            </UButton>
            <UButton type="submit" :loading="loading" :disabled="loading" color="green">
              Add User
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteConfirmModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">Delete User</h3>
        </template>
        
        <div class="space-y-4">
          <p class="text-gray-700">
            Are you sure you want to delete <strong>{{ userToDelete?.name || 'this user' }}</strong>? 
            This action cannot be undone.
          </p>
          
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showDeleteConfirmModal = false" :disabled="loading">
              Cancel
            </UButton>
            <UButton color="red" @click="deleteUser" :loading="loading" :disabled="loading">
              Delete User
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Bulk Delete Confirmation Modal -->
    <UModal v-model="showBulkDeleteConfirm">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">Delete Users</h3>
        </template>
        
        <div class="space-y-4">
          <p class="text-gray-700">
            Are you sure you want to delete <strong>{{ selectedUsers.size }} user(s)</strong>? 
            This action cannot be undone.
          </p>
          
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showBulkDeleteConfirm = false" :disabled="loading">
              Cancel
            </UButton>
            <UButton color="red" @click="bulkDeleteUsers" :loading="loading" :disabled="loading">
              Delete {{ selectedUsers.size }} User(s)
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
const selectedUser = ref(null)
const showAddUserModal = ref(false)
const showDeleteConfirmModal = ref(false)
const showBulkDeleteConfirm = ref(false)
const userToDelete = ref(null)
const mobilePanel = ref(null)
const loading = ref(false)
const error = ref(null)

// Search and selection state
const searchQuery = ref('')
const selectedUsers = ref(new Set())

// Reactive data for users
const usersData = ref(null)
const pending = ref(false)
const fetchError = ref(null)

// Mock data for now - will be replaced with API calls
const users = ref([
  { 
    id: 1, 
    name: 'John Smith', 
    email: 'john@company.com', 
    firstName: 'John',
    lastName: 'Smith'
  },
  { 
    id: 2, 
    name: 'Sarah Johnson', 
    email: 'sarah@company.com', 
    firstName: 'Sarah',
    lastName: 'Johnson'
  },
  { 
    id: 3, 
    name: 'Mike Chen', 
    email: 'mike@company.com', 
    firstName: 'Mike',
    lastName: 'Chen'
  }
])

const totalUsers = computed(() => users.value.length)

// Search functionality
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) {
    return users.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user => 
    user.name?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query)
  )
})

// Selection functionality
const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && 
         filteredUsers.value.every(user => selectedUsers.value.has(user.id))
})

const toggleSelectAll = (checked) => {
  if (checked) {
    filteredUsers.value.forEach(user => {
      selectedUsers.value.add(user.id)
    })
  } else {
    filteredUsers.value.forEach(user => {
      selectedUsers.value.delete(user.id)
    })
  }
}

const toggleUserSelection = (userId, checked) => {
  if (checked) {
    selectedUsers.value.add(userId)
  } else {
    selectedUsers.value.delete(userId)
  }
}

const newUser = ref({
  email: '',
  firstName: '',
  lastName: ''
})

// API functions
const fetchUsers = async () => {
  try {
    pending.value = true
    fetchError.value = null
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No valid session found')
    }
    const response = await $fetch('/api/users', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    if (response.success) {
      users.value = response.users
    }
  } catch (err) {
    fetchError.value = err
    console.error('Error fetching users:', err)
  } finally {
    pending.value = false
  }
}

// Watch for user authentication
const user = useSupabaseUser()
watch(user, async (newUser) => {
  if (newUser) {
    await fetchUsers()
  } else {
    users.value = []
  }
}, { immediate: true })

// Refresh function
const refresh = () => fetchUsers()

// Watch for fetch errors
watch(fetchError, (newError) => {
  if (newError) {
    error.value = newError.data?.statusMessage || newError.message || 'Failed to load users'
  }
}, { immediate: true })

// Mobile panel functions
const toggleMobilePanel = (panel) => {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

const closeMobilePanel = () => {
  mobilePanel.value = null
}

// User selection
const selectUser = (user) => {
  selectedUser.value = { ...user }
  // Close mobile panel after selection
  closeMobilePanel()
}

// Add user functions
const openAddUserModal = () => {
  error.value = null
  showAddUserModal.value = true
}

const closeAddUserModal = () => {
  showAddUserModal.value = false
  newUser.value = {
    email: '',
    firstName: '',
    lastName: ''
  }
}

const addUser = async () => {
  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch('/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        email: newUser.value.email,
        firstName: newUser.value.firstName,
        lastName: newUser.value.lastName
      }
    })

    if (response.success) {
      // Reload the users list to get fresh data
      await refresh()
      closeAddUserModal()
      console.log('User added:', response.user)
    }
  } catch (err) {
    error.value = err.data?.error || err.data?.statusMessage || 'Failed to add user'
    console.error('Error adding user:', err)
  } finally {
    loading.value = false
  }
}

// Save user function
const saveUser = async () => {
  if (!selectedUser.value) return

  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch(`/api/users/${selectedUser.value.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        firstName: selectedUser.value.firstName,
        lastName: selectedUser.value.lastName
      }
    })

    if (response.success) {
      // Reload the users list to get fresh data
      await refresh()
      
      // Update the selected user with the response data
      selectedUser.value = { ...response.user }
      
      console.log('User saved successfully:', response.user)
    }
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to save user'
    console.error('Error saving user:', err)
  } finally {
    loading.value = false
  }
}

// Delete user functions
const confirmDeleteUser = () => {
  if (selectedUser.value) {
    userToDelete.value = selectedUser.value
    showDeleteConfirmModal.value = true
  }
}

const deleteUser = async () => {
  if (!userToDelete.value) return

  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    const response = await $fetch(`/api/users/${userToDelete.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (response.success) {
      // Reload the users list to get fresh data
      await refresh()
      
      // Clear selection if deleted user was selected
      if (selectedUser.value?.id === userToDelete.value.id) {
        selectedUser.value = null
      }
      
      // Clear selection from selected users
      selectedUsers.value.clear()
      
      // Close modals
      showDeleteConfirmModal.value = false
      userToDelete.value = null
      
      console.log('User deleted successfully')
    }
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to delete user'
    console.error('Error deleting user:', err)
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
  if (selectedUsers.value.size > 0) {
    showBulkDeleteConfirm.value = true
  }
}

const bulkDeleteUsers = async () => {
  if (selectedUsers.value.size === 0) return

  try {
    loading.value = true
    error.value = null

    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No valid session found')
    }

    // Delete each selected user
    const deletePromises = Array.from(selectedUsers.value).map(userId => 
      $fetch(`/api/users/${userId}`, {
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
      error.value = `${failures.length} user(s) could not be deleted`
    }

    // Check for any successful deletions
    const successfulDeletions = results.filter(result => result.status === 'fulfilled' && result.value.success)
    
    if (successfulDeletions.length > 0) {
      // Reload the users list to get fresh data
      await refresh()
      
      // Clear selection
      selectedUsers.value.clear()
      
      // Clear selected user if it was deleted
      const deletedIds = successfulDeletions.map(result => result.value.userId)
      if (selectedUser.value && deletedIds.includes(selectedUser.value.id)) {
        selectedUser.value = null
      }
      
      console.log(`Successfully deleted ${successfulDeletions.length} user(s)`)
    }
    
    // Close modal
    showBulkDeleteConfirm.value = false
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Failed to delete users'
    console.error('Error bulk deleting users:', err)
  } finally {
    loading.value = false
  }
}
</script>