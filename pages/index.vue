<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Loading state -->
      <div v-if="loading" class="text-center">
        <div class="mx-auto h-12 w-12 flex items-center justify-center">
          <Icon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-primary"/>
        </div>
        <h2 class="mt-6 text-3xl font-heading font-bold text-gray-900 dark:text-white">
          {{ loadingMessage }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ loadingDescription }}
        </p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <Icon name="i-heroicons-x-mark" class="h-6 w-6 text-red-600"/>
        </div>
        <h2 class="mt-6 text-3xl font-heading font-bold text-gray-900 dark:text-white">
          Authentication Error
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ error }}
        </p>
        
        <!-- Action buttons based on error type -->
        <div class="mt-6 flex gap-3">
          <UButton 
            v-if="isMagicLinkError" 
            @click="goToForgotPassword" 
            class="flex-1"
            style="background-color: #F28C28;"
          >
            {{ error.includes('password reset') ? 'Request New Reset Link' : 'Request New Magic Link' }}
          </UButton>
          <UButton 
            v-else 
            variant="outline" 
            @click="retry" 
            class="flex-1"
          >
            Try Again
          </UButton>
          <UButton 
            @click="goToLogin" 
            variant="outline" 
            class="flex-1"
          >
            Go to Login
          </UButton>
        </div>
      </div>

      <!-- Success state (shouldn't normally show here) -->
      <div v-else-if="success" class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <Icon name="i-heroicons-check" class="h-6 w-6 text-green-600"/>
        </div>
        <h2 class="mt-6 text-3xl font-heading font-bold text-gray-900 dark:text-white">
          {{ successMessage }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ successDescription }}
        </p>
        <UButton @click="goToDashboard" class="mt-6 w-full justify-center">
          Continue to Dashboard
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
// This page handles both normal redirects and Supabase auth error callbacks

// Page meta - no middleware needed as we handle redirect manually
definePageMeta({
  layout: 'empty'
})

// State
const loading = ref(true)
const error = ref('')
const success = ref(false)
const loadingMessage = ref('Redirecting...')
const loadingDescription = ref('Taking you to your dashboard')
const successMessage = ref('')
const successDescription = ref('')

// Auth composable
const { isAuthenticated } = useAuth()
const route = useRoute()

// Computed property to detect magic link and password reset errors
const isMagicLinkError = computed(() => {
  if (!error.value) return false
  const errorText = error.value.toLowerCase()
  return errorText.includes('magic link') ||
         errorText.includes('password reset') ||
         errorText.includes('expired') ||
         errorText.includes('invalid') ||
         errorText.includes('access denied')
})

// Helper function to parse URL fragment parameters (for magic links)
const parseUrlFragment = () => {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.substring(1) // Remove the '#'
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const fragmentParams = {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    expiresAt: params.get('expires_at'),
    expiresIn: params.get('expires_in'),
    tokenType: params.get('token_type'),
    type: params.get('type')
  }

  // Log what we found (without exposing sensitive tokens)
  console.log('🔐 [HOMEPAGE] URL fragment parsed:', {
    type: fragmentParams.type,
    hasAccessToken: !!fragmentParams.accessToken,
    hasRefreshToken: !!fragmentParams.refreshToken,
    tokenType: fragmentParams.tokenType,
    expiresIn: fragmentParams.expiresIn
  })

  return fragmentParams
}

// Helper function to handle magic link authentication from homepage
const handleMagicLinkAuth = () => {
  if (typeof window === 'undefined') return false

  const fragmentParams = parseUrlFragment()

  if (fragmentParams && fragmentParams.type === 'magiclink') {
    console.log('🔐 [HOMEPAGE] Magic link detected on homepage, redirecting to callback...')

    // Redirect to auth callback with the same fragment
    // Use navigateTo for better SPA behavior and hash preservation
    navigateTo(`/auth/callback${window.location.hash}`)
    return true
  }

  return false
}

// Handle authentication errors from Supabase
const handleAuthErrors = () => {
  if (!process.client) return false

  // Check for error parameters in the URL
  const errorParam = route.query.error
  const errorCode = route.query.error_code
  const errorDescription = route.query.error_description

  if (errorParam) {
    let userFriendlyMessage = errorDescription || errorParam

    // Handle specific error codes and combinations
    if (errorCode === 'otp_expired') {
      if (errorParam === 'access_denied') {
        userFriendlyMessage = 'This password reset link has expired. Please request a new one.'
      } else {
        userFriendlyMessage = 'This magic link has expired. Please request a new one.'
      }
    } else if (errorCode === 'invalid_request') {
      userFriendlyMessage = 'The magic link is invalid. Please request a new one.'
    } else if (errorParam === 'access_denied') {
      userFriendlyMessage = 'Access was denied. The magic link may have expired or been used already.'
    } else if (errorParam === 'server_error') {
      userFriendlyMessage = 'A server error occurred. Please try again later.'
    }

    // Set error state
    error.value = userFriendlyMessage
    loading.value = false
    return true
  }

  return false
}

// Action handlers
const goToLogin = async () => {
  await navigateTo('/login')
}

const goToForgotPassword = async () => {
  await navigateTo('/forgot-password')
}

const goToDashboard = async () => {
  const { redirectToDashboard } = useAuth()
  await redirectToDashboard()
}

const retry = async () => {
  // Clear error and try again
  error.value = ''
  loading.value = true
  loadingMessage.value = 'Redirecting...'
  loadingDescription.value = 'Taking you to your dashboard'
  
  // Wait a moment then check auth state again
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  if (isAuthenticated.value) {
    const { redirectToDashboard } = useAuth()
    await redirectToDashboard()
  } else {
    await navigateTo('/login')
  }
}

// Main redirect logic
const handleRedirect = async () => {
  // First check for magic link authentication
  if (handleMagicLinkAuth()) {
    return // Magic link handling will redirect to callback
  }

  // Then check for auth errors
  if (handleAuthErrors()) {
    return // Error handling will show the error UI
  }

  // Normal redirect logic
  if (isAuthenticated.value) {
    const { redirectToDashboard } = useAuth()
    await redirectToDashboard()
  } else {
    await navigateTo('/login')
  }
}

// Initialize on mount
onMounted(async () => {
  console.log('🏠 [HOMEPAGE] Page mounted, checking for authentication...')
  console.log('🏠 [HOMEPAGE] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
  await handleRedirect()
})
</script>
