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
        'w-full lg:w-1/3',
        mobilePanel === 'users' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 class="text-xl font-bold">Users</h2>
        <UButton size="sm" class="w-full sm:w-auto">
          <Icon name="heroicons:user-plus" class="w-4 h-4 mr-2" />
          Add User
        </UButton>
      </div>
      
      <div class="space-y-2">
        <UCard 
          v-for="user in users" 
          :key="user.id"
          class="cursor-pointer transition-colors"
          :class="{ 'bg-blue-50 border-blue-200': selectedUser?.id === user.id }"
          @click="selectUser(user)"
        >
          <div class="p-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <Icon name="heroicons:user" class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="font-medium truncate">{{ user.name }}</h4>
                <p class="text-sm text-gray-600 truncate">{{ user.role }}</p>
              </div>
            </div>
          </div>
        </UCard>
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
            <UFormGroup label="Name">
              <UInput v-model="selectedUser.name" />
            </UFormGroup>
            
            <UFormGroup label="Email">
              <UInput v-model="selectedUser.email" />
            </UFormGroup>
            
            <UFormGroup label="Role">
              <USelect 
                v-model="selectedUser.role"
                :options="roleOptions"
              />
            </UFormGroup>
            
            <UFormGroup label="Last Login">
              <UInput v-model="selectedUser.lastLogin" readonly />
            </UFormGroup>
            
            <div class="flex flex-col sm:flex-row gap-2 pt-4">
              <UButton @click="saveUser" class="w-full sm:w-auto">
                Save Changes
              </UButton>
              <UButton color="red" variant="outline" @click="deleteUser" class="w-full sm:w-auto">
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
  </div>
</template>

<script setup>
const selectedUser = ref(null)
const mobilePanel = ref(null)

const users = ref([
  { 
    id: 1, 
    name: 'John Smith', 
    email: 'john@company.com', 
    role: 'Admin', 
    lastLogin: '2024-01-09' 
  },
  { 
    id: 2, 
    name: 'Sarah Johnson', 
    email: 'sarah@company.com', 
    role: 'Editor', 
    lastLogin: '2024-01-08' 
  },
  { 
    id: 3, 
    name: 'Mike Chen', 
    email: 'mike@company.com', 
    role: 'Viewer', 
    lastLogin: '2024-01-09' 
  }
])

const roleOptions = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Editor', value: 'Editor' },
  { label: 'Viewer', value: 'Viewer' }
]

const toggleMobilePanel = (panel) => {
  mobilePanel.value = mobilePanel.value === panel ? null : panel
}

const closeMobilePanel = () => {
  mobilePanel.value = null
}

const selectUser = (user) => {
  selectedUser.value = { ...user }
  // Close mobile panel after selection
  closeMobilePanel()
}

const saveUser = () => {
  if (selectedUser.value) {
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (userIndex !== -1) {
      users.value[userIndex] = { ...selectedUser.value }
    }
    console.log('User saved:', selectedUser.value)
  }
}

const deleteUser = () => {
  if (selectedUser.value) {
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (userIndex !== -1) {
      users.value.splice(userIndex, 1)
      selectedUser.value = null
    }
    console.log('User deleted')
  }
}
</script>
