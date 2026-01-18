<template>
  <div v-if="selectedUser">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold">User Details</h2>
      <button
          @click="$emit('closeMobilePanel')"
          class="lg:hidden p-1 hover:bg-gray-200 rounded"
      >
        <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
      </button>
    </div>
    <UCard>
      <div class="p-4 lg:p-6 space-y-4">
        
        <!-- User Header with Avatar -->
        <div class="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div class="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {{ getUserInitials(selectedUser.firstName, selectedUser.lastName) }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {{ selectedUser.firstName || '' }} {{ selectedUser.lastName || '' }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ selectedUser.email }}</p>
            <div class="flex items-center gap-2 mt-1">
              <UBadge :color="getRoleBadgeColor(selectedUser.role)" variant="soft" size="xs">
                {{ selectedUser.role }}
              </UBadge>
              <UBadge v-if="selectedUser.organizationName" color="gray" variant="soft" size="xs">
                {{ selectedUser.organizationName }}
              </UBadge>
            </div>
          </div>
        </div>
        
        <UFormField label="First Name">
          <UInput v-model="selectedUser.firstName"
                  class="w-full"
          />
        </UFormField>

        <UFormField label="Last Name">
          <UInput v-model="selectedUser.lastName"
                  class="w-full"
          />
        </UFormField>

        <UFormField label="Email">
          <UInput v-model="selectedUser.email" disabled
                  class="w-full"
          />
        </UFormField>

        <UFormField label="Role" v-if="canEditRole">
          <USelect
              v-model="selectedUser.role"
              :items="availableRoles"
              :disabled="loading"
              placeholder="Select role"
              required
              class="w-full"
          />
        </UFormField>

        <div class="flex flex-col sm:flex-row gap-2 pt-4">
          <button
              @click="$emit('saveUser')"
              :disabled="loading"
              class="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            Save Changes
          </button>
          <UButton color="red" variant="outline" @click="$emit('confirmDeleteUser')" :disabled="loading" class="w-full sm:w-auto hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer">
            Delete User
          </UButton>
        </div>
      </div>
    </UCard>
  </div>

  <div v-else class="flex items-center justify-center h-full text-gray-500">
    <div class="text-center">
      <Icon name="i-heroicons-user" class="w-12 h-12 mx-auto mb-4 text-gray-300"/>
      <p>Select a user to view details</p>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useAuth} from '~/composables/useAuth'

const props = defineProps({
  selectedUser: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['closeMobilePanel', 'saveUser', 'confirmDeleteUser'])

// Get current user auth state
const {userProfile} = useAuth()

// Role hierarchy (higher number = higher privileges)
const roleHierarchy = {
  'VIEWER': 1,
  'EDITOR': 2,
  'ADMIN': 3,
  'SUPERADMIN': 4
}

// Check if current user can edit roles
const canEditRole = computed(() => {
  if (!userProfile.value?.role) return false

  // Only ADMIN and SUPERADMIN can change roles
  return userProfile.value.role === 'ADMIN' || userProfile.value.role === 'SUPERADMIN'
})

// Get available roles based on current user's permissions
const availableRoles = computed(() => {
  if (!canEditRole.value) return []

  const currentUserRole = userProfile.value.role
  const currentUserLevel = roleHierarchy[currentUserRole]

  // Define all possible roles
  const allRoles = [
    {label: 'Viewer', value: 'VIEWER'},
    {label: 'Editor', value: 'EDITOR'},
    {label: 'Administrator', value: 'ADMIN'},
    {label: 'Super Administrator', value: 'SUPERADMIN'}
  ]

  // Filter roles based on hierarchy (can only assign roles equal to or lower than own role)
  return allRoles.filter(role => roleHierarchy[role.value] <= currentUserLevel)
})

// Helper function to get user initials
const getUserInitials = (firstName, lastName) => {
  const first = (firstName || '')[0] || ''
  const last = (lastName || '')[0] || ''
  return (first + last).toUpperCase() || '?'
}

// Helper function to get role badge color
const getRoleBadgeColor = (role) => {
  const colors = {
    'SUPERADMIN': 'red',
    'ADMIN': 'orange',
    'EDITOR': 'blue',
    'VIEWER': 'gray'
  }
  return colors[role] || 'gray'
}
</script>
