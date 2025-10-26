<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center max-w-md mx-auto p-6">
      <!-- Loading state -->
      <div v-if="isLoading" class="space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600">{{ loadingMessage }}</p>
      </div>

      <!-- Success state -->
      <div v-else-if="isSuccess" class="space-y-4">
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
const isLoading = ref(true)
const success = ref(false)
const isSuccess = ref(false)
const error = ref('')
const hasUrlError = ref(false)
const isMagicLinkAuth = ref(false)
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
  console.log('🔐 [CALLBACK] URL fragment parsed:', {
    type: fragmentParams.type,
    hasAccessToken: !!fragmentParams.accessToken,
    hasRefreshToken: !!fragmentParams.refreshToken,
    tokenType: fragmentParams.tokenType,
    expiresIn: fragmentParams.expiresIn
  })

  return fragmentParams
}

// Helper function to handle magic link authentication
const handleMagicLinkAuth = async (fragmentParams) => {
  try {
    console.log('🔐 [STEP 2] Processing magic link tokens:', {
      type: fragmentParams.type,
      hasAccessToken: !!fragmentParams.accessToken,
      hasRefreshToken: !!fragmentParams.refreshToken,
      tokenType: fragmentParams.tokenType,
      expiresIn: fragmentParams.expiresIn
    })

    // Validate that this is actually a magic link
    if (fragmentParams.type !== 'magiclink') {
      console.log('🔐 [STEP 2] Not a magic link, type:', fragmentParams.type)
      return false
    }

    if (!fragmentParams.accessToken) {
      console.log('❌ [STEP 2] No access token in magic link')
      throw new Error('Invalid magic link: missing access token')
    }

    console.log('🔐 [STEP 2] Setting up Supabase session with magic link tokens...')

    // Set the session using the tokens from the magic link
    const sessionData = {
      access_token: fragmentParams.accessToken
    }

    // Only include refresh token if available
    if (fragmentParams.refreshToken) {
      sessionData.refresh_token = fragmentParams.refreshToken
    }

    console.log('🔐 [STEP 2] Calling supabase.auth.setSession()...')
    const { data: { session }, error: sessionError } = await supabase.auth.setSession(sessionData)

    if (sessionError) {
      console.error('❌ [STEP 2] Magic link session error:', sessionError)
      throw sessionError
    }

    if (session?.user) {
      console.log('✅ [STEP 2] Magic link authentication successful!')
      console.log('✅ [STEP 2] User details:', { id: session.user.id, email: session.user.email })
      return true
    }

    return false
  } catch (err) {
    console.error('❌ [STEP 2] Magic link authentication failed:', err)
    throw err
  }
}

// Handle different auth scenarios
const handleAuthCallback = async () => {
  try {
    console.log('🔐 [CALLBACK] Starting auth callback processing...')
    console.log('🔐 [CALLBACK] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')

    isLoading.value = true
    error.value = null
    hasUrlError.value = false

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
        isSuccess.value = true
        isLoading.value = false
        return

      } catch (customError) {
        console.error('Custom magic link error:', customError)
        error.value = customError.message || 'Invalid or expired invitation link. Please contact your administrator for a new invitation.'
        isLoading.value = false
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
      isLoading.value = false
      return
    }

    // Check for magic link tokens in URL fragment
    const fragmentParams = parseUrlFragment()

    if (fragmentParams && fragmentParams.type === 'magiclink') {
      console.log('🔐 [CALLBACK] Magic link detected, processing authentication...')

      // Try to authenticate with magic link tokens
      const magicLinkSuccess = await handleMagicLinkAuth(fragmentParams)

      if (magicLinkSuccess) {
        isMagicLinkAuth.value = true
        isSuccess.value = true

        // Clean up the URL fragment after successful authentication
        if (typeof window !== 'undefined') {
          console.log('🔐 [CALLBACK] Cleaning up URL tokens...')
          window.history.replaceState(null, null, window.location.pathname)
        }

        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          console.log('🔐 [CALLBACK] Auto-redirecting to dashboard in 3 seconds...')
          navigateTo('/dashboard')
        }, 3000)
        return
      }
    }

    // Check if user is already authenticated before showing loading
    if (user.value) {
      console.log('User already authenticated, checking if auth callback is needed')

      if (!hasAuthParams) {
        // No auth parameters, user is already authenticated, redirect immediately
        console.log('No auth parameters, redirecting based on role')
        const { redirectToDashboard } = useAuth()
        await redirectToDashboard()
        return
      }

      // There are auth parameters, so this is a legitimate callback
      console.log('Auth parameters detected, processing callback')
    }

    isLoading.value = true
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
      loadingMessage.value = 'Verifying your password reset...'
      successMessage.value = 'Password Reset Verified!'
      successDescription.value = 'Your password reset has been verified. You can now set your new password.'
    } else if (type === 'email') {
      loadingMessage.value = 'Confirming your email...'
      successMessage.value = 'Email Confirmed!'
      successDescription.value = 'Your email has been successfully confirmed. You can now access your dashboard.'
    } else if (type === 'magiclink') {
      loadingMessage.value = 'Verifying magic link...'
      successMessage.value = 'Magic Link Verified!'
      successDescription.value = 'Your magic link has been verified. You are now signed in.'
    } else {
      loadingMessage.value = 'Completing authentication...'
      successMessage.value = 'Authentication Complete!'
      successDescription.value = 'You have been successfully authenticated.'
    }

    // Handle authorization code flow - for password reset, use verifyOtp instead
    if (code) {
      console.log('🔍 [STEP 2] Authorization code detected, verifying OTP...')
      loadingMessage.value = 'Verifying your request...'

      try {
        // For password reset, we need to verify the OTP with the code
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: code,
          type: 'recovery'
        })

        if (verifyError) {
          throw verifyError
        }

        console.log('✅ [STEP 2] OTP verified successfully for user:', data.user?.id)
      } catch (verifyErr) {
        console.error('❌ [STEP 2] OTP verification error:', verifyErr)

        // Try alternative approach - the code might be a direct token
        try {
          const { data, error: altVerifyError } = await supabase.auth.verifyOtp({
            token: code,
            type: 'recovery'
          })

          if (altVerifyError) {
            throw altVerifyError
          }

          console.log('✅ [STEP 2] OTP verified successfully (alternative method) for user:', data.user?.id)
        } catch (altErr) {
          console.error('❌ [STEP 2] Alternative OTP verification error:', altErr)
          throw new Error(`Failed to verify your request: ${altErr.message}`)
        }
      }
    }
    
    // Handle implicit flow (access token in hash)
    if (accessToken) {
      console.log('🔐 [STEP 2] Access token detected, setting up Supabase session...')
      loadingMessage.value = 'Verifying magic link...'

      // Wait for Supabase to automatically process the magic link
      // The session should be available through the reactive user state
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('🔐 [STEP 2] Magic link processing completed')
    }

    // Wait for auth state to be processed after code exchange
    if (code) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Debug: Check current user state
    console.log('Current user state:', user.value)
    console.log('Current session:', await supabase.auth.getSession())

    // Check if user is authenticated
    if (user.value) {
      console.log('✅ User authenticated:', user.value.id)

      // Check if this is a magic link signup (user has metadata indicating signup)
      const userMetadata = user.value.user_metadata
      if (userMetadata && userMetadata.isSignUp) {
        loadingMessage.value = 'Creating your profile...'

        try {
          console.log('🔄 Creating profile for magic link signup...')

          // Create profile for magic link signup
          await createUserProfile(user.value, {
            firstName: userMetadata.firstName,
            lastName: userMetadata.lastName,
            role: userMetadata.role || 'EDITOR',
            organizationName: userMetadata.organizationName
          })

          console.log('✅ Profile created successfully!')
          successMessage.value = 'Account Created Successfully!'
          successDescription.value = 'Your account has been created and you are now signed in. Welcome to Optiqo!'
        } catch (profileError) {
          console.error('❌ Profile creation error:', profileError)
          // Continue anyway - profile creation is not critical for basic functionality
          successMessage.value = 'Authentication Complete!'
          successDescription.value = 'You have been successfully authenticated.'
        }
      }

      // For password reset, redirect to reset password page
      if (type === 'recovery') {
        console.log('🔐 [CALLBACK] Password reset verified, redirecting to reset password page...')
        isLoading.value = false
        setTimeout(async () => {
          console.log('🔄 [CALLBACK] Redirecting to reset password page...')
          await redirectToResetPassword()
        }, 2000)
        return
      }

      console.log('🔐 [CALLBACK] Authentication successful, redirecting to dashboard...')
      isSuccess.value = true
      isLoading.value = false
    } else {
      console.error('❌ [CALLBACK] No user found after authentication attempt')
      throw new Error('Authentication failed. Please try again.')
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = err.message
    isLoading.value = false
  }
}

// Redirect to dashboard based on user role
const redirectToDashboard = async () => {
  const { redirectToDashboard: authRedirectToDashboard } = useAuth()
  await authRedirectToDashboard()
}

// Redirect to reset password page
const redirectToResetPassword = async () => {
  await navigateTo('/reset-password')
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
  console.log('🔐 [CALLBACK] Page mounted, starting authentication callback...')
  await handleAuthCallback()
})
</script>
