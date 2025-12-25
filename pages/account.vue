<template>
  <div class="p-4 lg:p-6 max-w-4xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">Account Settings</h1>
      <p class="text-gray-600 dark:text-gray-400">Manage your account information, security settings, and profile picture.</p>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="success" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-center">
        <Icon name="i-heroicons-check-circle" class="w-5 h-5 text-green-400 mr-2"/>
        <p class="text-green-800">{{ success }}</p>
      </div>
    </div>

    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <Icon name="i-heroicons-x-circle" class="w-5 h-5 text-red-400 mr-2"/>
        <p class="text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Organization Information Section -->
    <div v-if="userProfile?.organizationId || userProfile?.organization" class="mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <!-- Loading State -->
        <div v-if="orgLoading" class="flex items-center justify-center py-8">
          <Icon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-400 animate-spin mr-2"/>
          <span class="text-gray-500">Loading organization details...</span>
        </div>
        
        <!-- Error State -->
        <div v-else-if="orgError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div class="flex">
            <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2"/>
            <div>
              <h4 class="text-sm font-medium text-red-800 dark:text-red-200">Error loading organization</h4>
              <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ orgError }}</p>
            </div>
          </div>
        </div>
        
        <!-- Organization Details -->
        <div v-else-if="hasOrganization">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Organization Information</h3>
          <UButton
              variant="outline"
            size="sm"
            @click="navigateTo('/users')"
              v-if="userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN'"
            color="green"
              class="cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Icon name="i-heroicons-users" class="w-4 h-4 mr-2"/>
            Manage Users
          </UButton>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Organization Name -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization Name
              </label>
              <UButton
                  v-if="canEditOrgName"
                  size="xs"
                  variant="ghost"
                  @click="openOrgNameModal"
                  color="gray"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon name="i-heroicons-pencil" class="w-3 h-3 mr-1"/>
                Edit
              </UButton>
            </div>
            <div class="text-lg font-medium text-gray-900 dark:text-white">
              {{ organizationName }}
            </div>
          </div>
          
          <!-- Total Members -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Members
            </label>
            <div class="text-lg font-medium text-gray-900 dark:text-white">
              {{ totalMembers }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ userCount }} users, {{ viewerCount }} viewers
            </div>
          </div>
          
          <!-- Created Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Created
            </label>
            <div class="text-lg font-medium text-gray-900 dark:text-white">
              {{ formatDate(organizationDetails?.created_at) }}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Profile Picture Section -->
      <div class="lg:col-span-1">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Picture</h3>
          
          <div class="flex flex-col items-center">
            <!-- Avatar Display -->
            <div class="relative mb-4">
              <div class="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                   :class="userProfile?.avatar_url ? '' : 'bg-gray-100 dark:bg-gray-700'">
                <img 
                  v-if="userProfile?.avatar_url" 
                  :src="userProfile.avatar_url" 
                  :alt="`${userProfile.firstName} ${userProfile.lastName}`"
                  class="w-full h-full object-cover"
                />
                <Icon v-else name="i-heroicons-user" class="w-12 h-12 text-gray-400"/>
              </div>
              
              <!-- Upload Overlay -->
              <div class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                   @click="triggerFileInput">
                <Icon name="i-heroicons-camera" class="w-6 h-6 text-white"/>
              </div>
            </div>

            <!-- File Input (Hidden) -->
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              @change="handleFileUpload"
              class="hidden"
            />

            <!-- Action Buttons -->
            <div class="flex flex-col gap-2 w-full">
              <UButton
                @click="triggerFileInput"
                :loading="loading"
                class="w-full cursor-pointer hover:bg-green-600"
                size="sm"
                color="green"
              >
                <Icon name="i-heroicons-photo" class="w-4 h-4 mr-2"/>
                {{ userProfile?.avatar_url ? 'Change Photo' : 'Upload Photo' }}
              </UButton>

              <UButton
                v-if="userProfile?.avatar_url"
                @click="handleDeleteAvatar"
                :loading="loading"
                variant="outline"
                color="red"
                size="sm"
                class="w-full cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Icon name="i-heroicons-trash" class="w-4 h-4 mr-2"/>
                Remove Photo
              </UButton>
            </div>

            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      <!-- Account Information Section -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Personal Information -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
          
          <form @submit.prevent="handleUpdateProfile" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <UInput
                  id="firstName"
                  v-model="profileForm.firstName"
                  placeholder="Enter your first name"
                  :disabled="loading"
                  class="w-full"
                />
              </div>
              
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <UInput
                  id="lastName"
                  v-model="profileForm.lastName"
                  placeholder="Enter your last name"
                  :disabled="loading"
                  class="w-full"
                />
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <UInput
                id="email"
                :model-value="userProfile?.email"
                disabled
                class="bg-gray-50 dark:bg-gray-700"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>

            <div class="flex justify-end">
              <UButton
                  type="submit"
                :loading="loading"
                :disabled="!hasProfileChanges"
                color="green"
                  class="cursor-pointer hover:bg-green-600"
              >
                Save Changes
              </UButton>
            </div>
          </form>
        </div>

        <!-- Security Settings -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Settings</h3>

          <!-- OAuth User Section -->
          <div v-if="isOAuthUser" class="space-y-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
              <div class="flex items-start">
                <Icon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"/>
                <div>
                  <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Signed in with {{ oauthProviderName }}
                  </h4>
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    Your account uses {{ oauthProviderName }} for authentication. You can add a password below to enable email/password login as an alternative.
                  </p>
                </div>
              </div>
            </div>

            <!-- Add Password Form for OAuth Users -->
            <form @submit.prevent="handleSetPassword" class="space-y-4">
              <div>
                <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Set Password
                </label>
                <UInput
                    id="newPassword"
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="Enter a password"
                    :disabled="loading"
                    class="w-full"
                />
              </div>

              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <UInput
                    id="confirmPassword"
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    :disabled="loading"
                    class="w-full"
                />
              </div>

              <div class="flex justify-end">
                <UButton
                    type="submit"
                    :loading="loading"
                    color="green"
                    class="cursor-pointer hover:bg-green-600"
                >
                  <Icon name="i-heroicons-key" class="w-4 h-4 mr-2"/>
                  Add Password
                </UButton>
              </div>

              <!-- Password validation errors -->
              <div v-if="passwordErrors.showErrors && (passwordValidationErrors.length > 0 || passwordConfirmError)" class="mt-4">
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <div class="flex">
                    <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2"/>
                    <div class="text-sm text-red-800 dark:text-red-200">
                      <h4 class="font-medium mb-2">Please fix the following errors:</h4>
                      <ul class="space-y-1">
                        <li v-for="error in passwordValidationErrors" :key="error" class="flex items-center">
                          <Icon name="i-heroicons-x-mark" class="w-4 h-4 mr-1"/>
                          {{ error }}
                        </li>
                        <li v-if="passwordConfirmError" class="flex items-center">
                          <Icon name="i-heroicons-x-mark" class="w-4 h-4 mr-1"/>
                          {{ passwordConfirmError }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <!-- Password User Section -->
          <form v-else @submit.prevent="handleUpdatePassword" class="space-y-4">
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <UInput
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="Enter your current password"
                :disabled="loading"
                class="w-full"
              />
            </div>

            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <UInput
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="Enter your new password"
                :disabled="loading"
                class="w-full"
              />
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <UInput
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                :disabled="loading"
                class="w-full"
              />
            </div>

            <div class="flex justify-end">
              <UButton
                  type="submit"
                :loading="loading"
                color="orange"
                  class="cursor-pointer hover:bg-orange-600"
              >
                Update Password
              </UButton>
            </div>
            
            <!-- Password validation errors - only show after button press -->
            <div v-if="passwordErrors.showErrors && (passwordValidationErrors.length > 0 || passwordConfirmError)" class="mt-4">
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <div class="flex">
                  <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2"/>
                  <div class="text-sm text-red-800 dark:text-red-200">
                    <h4 class="font-medium mb-2">Please fix the following errors:</h4>
                    <ul class="space-y-1">
                      <li v-for="error in passwordValidationErrors" :key="error" class="flex items-center">
                        <Icon name="i-heroicons-x-mark" class="w-4 h-4 mr-1"/>
                        {{ error }}
                      </li>
                      <li v-if="passwordConfirmError" class="flex items-center">
                        <Icon name="i-heroicons-x-mark" class="w-4 h-4 mr-1"/>
                        {{ passwordConfirmError }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Organization Name Edit Modal -->
    <UModal v-model:open="isOrgNameModalOpen">
      <!-- Hidden trigger button required by UModal -->
      <div style="display: none;"></div>

      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Organization Name
            </h3>
            <UButton
                variant="ghost"
                size="sm"
                @click="closeOrgNameModal"
                class="cursor-pointer"
            >
              <Icon name="i-heroicons-x-mark" class="w-5 h-5"/>
            </UButton>
          </div>

          <form @submit.prevent="saveOrgName" class="space-y-4">
            <UFormField label="Organization Name" required>
              <UInput
                  v-model="editingOrgName"
                  placeholder="Enter organization name"
                  required
                  autofocus
                  class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                  type="button"
                  variant="outline"
                  @click="closeOrgNameModal"
                  :disabled="orgLoading"
                  class="cursor-pointer"
              >
                Cancel
              </UButton>
              <UButton
                  type="submit"
                  :disabled="!editingOrgName.trim() || orgLoading"
                  :loading="orgLoading"
                  color="green"
                  class="cursor-pointer"
              >
                Save Changes
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
// Authentication
const { userProfile, updateProfile, updatePassword, uploadAvatar, deleteAvatar, loading, error, success, clearMessages } = useAuth()
const user = useSupabaseUser()

// Organization
const { 
  organizationDetails,
  loading: orgLoading,
  error: orgError,
  getOrganizationDetails,
  fetchUserCount,
  updateOrganizationName,
  hasOrganization,
  organizationName,
  totalMembers,
  userCount,
  viewerCount
} = useOrganization()

// Organization editing modal state
const isOrgNameModalOpen = ref(false)
const editingOrgName = ref('')

// Computed properties
const canEditOrgName = computed(() => {
  return userProfile.value?.role === 'ADMIN' || userProfile.value?.role === 'SUPERADMIN'
})

// Organization name modal functions
const openOrgNameModal = async () => {
  editingOrgName.value = organizationName.value
  await nextTick()
  isOrgNameModalOpen.value = true
}

const closeOrgNameModal = () => {
  editingOrgName.value = ''
  isOrgNameModalOpen.value = false
}

const saveOrgName = async () => {
  if (!editingOrgName.value.trim() || !userProfile.value?.organizationId) return

  try {
    await updateOrganizationName(userProfile.value.organizationId, editingOrgName.value.trim())
    closeOrgNameModal()
    // Success message could be added here
  } catch (error) {
    console.error('Failed to update organization name:', error)
    // Error handling could be added here
  }
}

// Form data
const profileForm = ref({
  firstName: '',
  lastName: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordErrors = ref({
  showErrors: false
})

// File input ref
const fileInput = ref(null)

// Computed properties
const hasProfileChanges = computed(() => {
  if (!userProfile.value) return false
  return profileForm.value.firstName !== userProfile.value.firstName ||
         profileForm.value.lastName !== userProfile.value.lastName
})

// OAuth detection - check if user signed up via OAuth provider (e.g., Google)
const isOAuthUser = computed(() => {
  if (!user.value?.identities) return false
  // Check if user has OAuth identity and no email/password identity
  const identities = user.value.identities
  const hasOAuthIdentity = identities.some(i => i.provider !== 'email')
  const hasEmailIdentity = identities.some(i => i.provider === 'email')
  // User is OAuth-only if they have OAuth identity but no email identity
  return hasOAuthIdentity && !hasEmailIdentity
})

const oauthProviderName = computed(() => {
  if (!user.value?.identities) return 'OAuth'
  const oauthIdentity = user.value.identities.find(i => i.provider !== 'email')
  if (!oauthIdentity) return 'OAuth'
  // Capitalize provider name
  const provider = oauthIdentity.provider
  return provider.charAt(0).toUpperCase() + provider.slice(1)
})

// Password validation function
const validatePassword = (password) => {
  const errors = []
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  return errors
}

const passwordValidationErrors = computed(() => {
  return validatePassword(passwordForm.value.newPassword)
})

const passwordConfirmError = computed(() => {
  if (passwordForm.value.confirmPassword && passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return 'Passwords do not match'
  }
  return null
})

const isPasswordFormValid = computed(() => {
  return passwordForm.value.newPassword.length >= 6 &&
         passwordForm.value.newPassword === passwordForm.value.confirmPassword &&
         passwordForm.value.currentPassword.length > 0
})

// OAuth users don't need to provide current password
const isOAuthPasswordFormValid = computed(() => {
  return passwordForm.value.newPassword.length >= 6 &&
      passwordForm.value.newPassword === passwordForm.value.confirmPassword
})

// Initialize form with current profile data
watch(userProfile, (profile) => {
  if (profile) {
    profileForm.value = {
      firstName: profile.firstName || '',
      lastName: profile.lastName || ''
    }
    
    // Get organization details from user profile
    getOrganizationDetails(profile)
  }
}, { immediate: true })

// Date formatting function
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB')
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  await uploadAvatar(file)
  
  // Reset file input
  event.target.value = ''
}

const handleDeleteAvatar = async () => {
  if (confirm('Are you sure you want to remove your profile picture?')) {
    await deleteAvatar()
  }
}

const handleUpdateProfile = async () => {
  if (!hasProfileChanges.value) return
  
  await updateProfile({
    firstName: profileForm.value.firstName,
    lastName: profileForm.value.lastName
  })
}

const handleUpdatePassword = async () => {
  // Always show errors when button is clicked
  passwordErrors.value.showErrors = true
  
  // Check if form is valid before proceeding
  if (!isPasswordFormValid.value) {
    return
  }
  
  try {
    // Note: Supabase doesn't require current password for password updates
    // In a production app, you might want to implement this verification
    const result = await updatePassword(passwordForm.value.newPassword)
    
    if (result.success) {
      // Reset password form only on success
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      passwordErrors.value.showErrors = false
    }
  } catch (err) {
    // Error is handled by the updatePassword function
    console.error('Password update error:', err)
  }
}

// Handle setting password for OAuth users (no current password required)
const handleSetPassword = async () => {
  // Always show errors when button is clicked
  passwordErrors.value.showErrors = true

  // Check if form is valid before proceeding
  if (!isOAuthPasswordFormValid.value) {
    return
  }

  try {
    // OAuth users don't need current password - Supabase allows adding password
    const result = await updatePassword(passwordForm.value.newPassword)

    if (result.success) {
      // Reset password form only on success
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      passwordErrors.value.showErrors = false
    }
  } catch (err) {
    // Error is handled by the updatePassword function
    console.error('Password set error:', err)
  }
}

// Clear messages when component unmounts
onUnmounted(() => {
  clearMessages()
})
</script>
