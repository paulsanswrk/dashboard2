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
        <Icon name="i-heroicons-users" class="w-4 h-4 mr-2"/>
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
        <UButton
            size="sm"
            @click="openAddUserModal"
            class="w-full sm:w-auto cursor-pointer hover:bg-green-600"
            color="green"
        >
          <Icon name="i-heroicons-user-plus" class="w-4 h-4 mr-2"/>
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
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
          </button>
        </div>
        <div class="flex gap-2" v-if="selectedUsers.size > 0">
          <UButton variant="outline" size="sm" @click="addToGroup" :disabled="loading">
            <Icon name="i-heroicons-user-group" class="w-4 h-4 mr-1"/>
            add to group
          </UButton>
          <UButton color="red" variant="outline" size="sm" @click="confirmBulkDelete" :disabled="loading">
            <Icon name="i-heroicons-trash" class="w-4 h-4 mr-1"/>
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
        <Icon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto mb-4 text-red-500"/>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <UButton @click="refresh" variant="outline">
          Try Again
        </UButton>
      </div>

      <!-- Users Table -->
      <div v-else-if="users.length > 0">
        <UsersList
          :users="filteredUsers"
          :search-query="searchQuery"
          :selected-users="selectedUsers"
          @select-user="selectUser"
          @toggle-select-all="toggleSelectAll"
          @toggle-user-selection="toggleUserSelection"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <Icon name="i-heroicons-users" class="w-12 h-12 mx-auto mb-4 text-gray-300"/>
        <p class="text-gray-500 mb-4">No users found</p>
        <UButton @click="openAddUserModal" color="green">
          Add First User
        </UButton>
      </div>
    </div>

    <!-- User Details -->
    <div class="flex-1 p-4 lg:p-6">
      <UserDetails
        :selected-user="selectedUser"
        :loading="loading"
        @close-mobile-panel="closeMobilePanel"
        @save-user="saveUser"
        @confirm-delete-user="confirmDeleteUser"
        @resend-invitation="resendInvitation"
      />
    </div>

    <!-- Add User Modal -->
    <AddUserModal
      v-model:is-open="showAddUserModal"
      :loading="loading"
      :error="error"
      @close-modal="closeAddUserModal"
      @add-user="addUser"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteUserModal
      v-model:is-open="showDeleteConfirmModal"
      :user-to-delete="userToDelete"
      :loading="loading"
      @close-modal="showDeleteConfirmModal = false"
      @confirm-delete="deleteUser"
    />

    <!-- Bulk Delete Confirmation Modal -->
    <UsersBulkDeleteModal
      v-model:is-open="showBulkDeleteConfirm"
      :selected-count="selectedUsers.size"
      :loading="loading"
      @close-modal="showBulkDeleteConfirm = false"
      @confirm-delete="bulkDeleteUsers"
    />
  </div>
</template>

<script setup>
// Determine scope based on user role
const {userProfile} = useAuth()
const scope = computed(() => {
  return userProfile.value?.role === 'SUPERADMIN' ? 'admin' : 'organization'
})

const {
  selectedUser,
  showAddUserModal,
  showDeleteConfirmModal,
  showBulkDeleteConfirm,
  userToDelete,
  mobilePanel,
  loading,
  error,
  searchQuery,
  selectedUsers,
  pending,
  users,
  totalUsers,
  filteredUsers,
  newUser,
  refresh,
  toggleMobilePanel,
  closeMobilePanel,
  selectUser,
  openAddUserModal,
  closeAddUserModal,
  addUser,
  saveUser,
  confirmDeleteUser,
  deleteUser,
  addToGroup,
  confirmBulkDelete,
  bulkDeleteUsers,
  toggleSelectAll,
  toggleUserSelection,
  resendInvitation
} = useUsersManagement(scope.value)

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>