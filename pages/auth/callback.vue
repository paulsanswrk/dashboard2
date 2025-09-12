<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center max-w-md mx-auto p-6">
      <!-- Loading state -->
      <div v-if="loading" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600">{{ loadingMessage }}</p>
      </div>

      <!-- Success state -->
      <div v-else-if="success" class="space-y-4">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <Icon name="heroicons:check" class="h-6 w-6 text-green-600" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900">{{ successMessage }}</h2>
        <p class="text-gray-600">{{ successDescription }}</p>
        <UButton @click="redirectToDashboard" class="w-full">
          Continue to Dashboard
        </UButton>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="space-y-4">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <Icon name="heroicons:x-mark" class="h-6 w-6 text-red-600" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900">Authentication Error</h2>
        <p class="text-gray-600">{{ error }}</p>
        <div class="flex gap-2">
          <UButton variant="outline" @click="retry" class="flex-1">
            Try Again
          </UButton>
          <UButton @click="goToLogin" class="flex-1">
            Go to Login
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// This page handles the Supabase auth callback for email confirmation and password reset

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})

// State
const loading = ref(true)
const success = ref(false)
const error = ref('')
const loadingMessage = ref('Completing authentication...')
const successMessage = ref('')
const successDescription = ref('')

// Auth composable
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

// Handle different auth scenarios
const handleAuthCallback = async () => {
  try {
    loading.value = true
    error.value = ''

    // Get the URL hash parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')
    const errorParam = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')

    // Handle errors from URL
    if (errorParam) {
      throw new Error(errorDescription || errorParam)
    }

    // Handle different auth types
    if (type === 'signup') {
      loadingMessage.value = 'Confirming your email...'
      successMessage.value = 'Email Confirmed!'
      successDescription.value = 'Your account has been successfully created and your email has been confirmed. You can now access your dashboard.'
    } else if (type === 'recovery') {
      loadingMessage.value = 'Resetting your password...'
      successMessage.value = 'Password Reset Complete!'
      successDescription.value = 'Your password has been successfully updated. You can now sign in with your new password.'
    } else if (type === 'email') {
      loadingMessage.value = 'Confirming your email...'
      successMessage.value = 'Email Confirmed!'
      successDescription.value = 'Your email has been successfully confirmed. You can now access your dashboard.'
    } else {
      loadingMessage.value = 'Completing authentication...'
      successMessage.value = 'Authentication Complete!'
      successDescription.value = 'You have been successfully authenticated.'
    }

    // Wait for auth state to be processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if user is authenticated
    if (user.value) {
      success.value = true
      loading.value = false
    } else {
      throw new Error('Authentication failed. Please try again.')
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = err.message
    loading.value = false
  }
}

// Redirect to dashboard
const redirectToDashboard = async () => {
  await navigateTo('/dashboard')
}

// Retry authentication
const retry = async () => {
  await handleAuthCallback()
}

// Go to login page
const goToLogin = async () => {
  await navigateTo('/login')
}

// Initialize on mount
onMounted(async () => {
  await handleAuthCallback()
})
</script>
