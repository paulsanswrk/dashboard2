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
        <UButton @click="redirectToDashboard" class="w-full justify-center">
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
        
        <!-- Show different actions based on error type -->
        <div class="flex gap-2">
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

// Auth composable
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()
const { createUserProfile } = useAuth()

// Handle different auth scenarios
const handleAuthCallback = async () => {
  try {
    // Get the URL parameters first to check if this is actually an auth callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    const hasAuthParams = hashParams.get('access_token') || hashParams.get('code') || queryParams.get('code') || queryParams.get('error') || queryParams.get('token')
    
    // Check for errors FIRST, before any other processing
    const errorParam = hashParams.get('error') || queryParams.get('error')
    const errorCode = hashParams.get('error_code') || queryParams.get('error_code')
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
    
    // Check for custom magic link parameters
    const customToken = queryParams.get('token')
    const customEmail = queryParams.get('email')
    
    // Handle custom magic link first
    if (customToken && customEmail) {
      console.log('Custom magic link detected:', { token: customToken, email: customEmail })
      loadingMessage.value = 'Verifying your invitation...'
      
      try {
        // Call the server API to verify the invitation and get session
        const response = await $fetch('/api/auth/verify-invitation', {
          method: 'POST',
          body: {
            token: customToken,
            email: customEmail
          }
        })

        if (!response.success) {
          throw new Error(response.error || 'Invalid invitation')
        }

        console.log('Invitation verified successfully:', response.user)
        
        // If we have a session URL, redirect to it to complete authentication
        if (response.sessionUrl) {
          console.log('Redirecting to session URL for authentication...')
          window.location.href = response.sessionUrl
          return
        }

        // Fallback: show success but user won't be authenticated
        successMessage.value = 'Welcome to Optiqo!'
        successDescription.value = 'Your invitation has been verified. You can now access your dashboard.'
        
        // Set success state
        success.value = true
        loading.value = false
        return
        
      } catch (customError) {
        console.error('Custom magic link error:', customError)
        error.value = customError.message || 'Invalid or expired invitation link. Please contact your administrator for a new invitation.'
        loading.value = false
        return
      }
    }
    
    // Handle errors immediately
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
      
      // Set error state and stop processing
      error.value = userFriendlyMessage
      loading.value = false
      return
    }
    
    // Check if user is already authenticated before showing loading
    if (user.value) {
      console.log('User already authenticated, checking if auth callback is needed')
      
      if (!hasAuthParams) {
        // No auth parameters, user is already authenticated, redirect immediately
        console.log('No auth parameters, redirecting to dashboard')
        await navigateTo('/dashboard')
        return
      }
      
      // There are auth parameters, so this is a legitimate callback
      console.log('Auth parameters detected, processing callback')
    }

    loading.value = true
    error.value = ''
    
    // Handle both implicit flow (hash) and authorization code flow (query)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')
    const code = queryParams.get('code')
    
    console.log('Auth callback params:', {
      hashParams: Object.fromEntries(hashParams),
      queryParams: Object.fromEntries(queryParams),
      errorParam,
      errorCode,
      errorDescription,
      accessToken,
      refreshToken,
      type,
      code,
      customToken,
      customEmail
    })


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

    // Handle magic link flow - Supabase should automatically process the session
    // when the page loads with the magic link parameters
    if (code || accessToken) {
      console.log('Magic link detected, waiting for Supabase to process...')
      loadingMessage.value = 'Verifying magic link...'
      
      // Wait for Supabase to automatically process the magic link
      // The session should be available through the reactive user state
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log('Magic link processing completed')
    }

    // Wait for auth state to be processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Debug: Check current user state
    console.log('Current user state:', user.value)
    console.log('Current session:', await supabase.auth.getSession())

    // Check if user is authenticated
    if (user.value) {
      console.log('User authenticated:', user.value.id)
      
      // Check if this is a magic link signup (user has metadata indicating signup)
      const userMetadata = user.value.user_metadata
      if (userMetadata && userMetadata.isSignUp) {
        loadingMessage.value = 'Creating your profile...'
        
        try {
          // Create profile for magic link signup
          await createUserProfile(user.value, {
            firstName: userMetadata.firstName,
            lastName: userMetadata.lastName,
            role: userMetadata.role || 'ADMIN',
            organizationName: userMetadata.organizationName
          })
          
          successMessage.value = 'Account Created Successfully!'
          successDescription.value = 'Your account has been created and you are now signed in. Welcome to Optiqo!'
        } catch (profileError) {
          console.error('Profile creation error:', profileError)
          // Continue anyway - profile creation is not critical for basic functionality
          successMessage.value = 'Authentication Complete!'
          successDescription.value = 'You have been successfully authenticated.'
        }
      }
      
      success.value = true
      loading.value = false
    } else {
      console.error('No user found after authentication attempt')
      
      // If we have a code but no user, this might be a magic link that needs manual processing
      if (code) {
        console.log('Attempting to process magic link manually...')
        try {
          // Try to get the session manually
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            throw new Error(`Magic link verification failed: ${sessionError.message}`)
          }
          
          if (sessionData.session && sessionData.session.user) {
            console.log('Found session after manual check:', sessionData.session.user.id)
            // Set success and continue
            success.value = true
            loading.value = false
            return
          }
        } catch (manualErr) {
          console.error('Manual magic link processing failed:', manualErr)
        }
      }
      
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

// Go to login page with magic link focus
const goToLoginWithMagicLink = async () => {
  await navigateTo('/login?mode=magic-link')
}

// Go to forgot password page
const goToForgotPassword = async () => {
  await navigateTo('/forgot-password')
}

// Initialize on mount
onMounted(async () => {
  await handleAuthCallback()
})
</script>
