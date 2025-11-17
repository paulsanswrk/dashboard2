<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style="background-color: #f3f4f6;">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center">
          <img 
            src="/images/Optiqo_logo.png" 
            alt="Optiqo" 
            class="h-10 w-auto"
          />
        </div>
        <h2 class="mt-6 text-center text-3xl font-heading font-bold text-black tracking-tight">
          Set new password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-700">
          Enter your new password below.
        </p>
      </div>
      
      <!-- Verifying code state -->
      <UCard v-if="verifyingCode" class="mt-8 bg-white shadow-lg">
        <div class="text-center p-6">
          <div class="mx-auto h-12 w-12 flex items-center justify-center">
            <Icon name="heroicons:arrow-path" class="animate-spin h-8 w-8 text-primary" />
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Verifying reset link...</h3>
          <p class="mt-2 text-sm text-gray-600">Please wait while we verify your password reset link.</p>
        </div>
      </UCard>

      <!-- Error state -->
      <UCard v-else-if="error && !hasValidSession" class="mt-8 bg-white shadow-lg">
        <div class="text-center p-6">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <Icon name="heroicons:x-mark" class="h-6 w-6 text-red-600" />
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Invalid Reset Link</h3>
          <p class="mt-2 text-sm text-gray-600">{{ error }}</p>
          <div class="mt-6 flex gap-3">
            <UButton 
              @click="goToForgotPassword" 
              class="flex-1"
              style="background-color: #F28C28;"
            >
              Request New Reset Link
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
      </UCard>

      <!-- Password reset form (only show when we have a valid recovery session) -->
      <UCard v-else-if="hasValidSession" class="mt-8 bg-white shadow-lg">
        <UForm :state="form" @submit="handleResetPassword" class="space-y-6 p-6">
          <UFormGroup label="New Password" required class="text-black">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your new password"
              :error="errors.password"
              class="bg-white border-gray-300 text-black placeholder-gray-500"
              required
            />
          </UFormGroup>

          <UFormGroup label="Confirm Password" required class="text-black">
            <UInput
              v-model="form.confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              :error="errors.confirmPassword"
              class="bg-white border-gray-300 text-black placeholder-gray-500"
              required
            />
          </UFormGroup>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            class="mt-4"
          />

          <UAlert
            v-if="success"
            color="green"
            variant="soft"
            title="Password updated successfully!"
            description="You can now sign in with your new password."
            class="mt-4"
          />

          <UButton
            type="submit"
            :loading="loading"
            :disabled="!isFormValid"
            class="w-full text-white border-0 hover:opacity-90 transition-opacity"
            style="background-color: #F28C28;"
            size="lg"
          >
            Update password
          </UButton>

          <div class="text-center">
            <NuxtLink to="/login" class="text-sm text-primary hover:text-primary-600">
              Back to sign in
            </NuxtLink>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Get route and auth composable
const route = useRoute()
const { isAuthenticated, user } = useAuth()

// Form state
const form = ref({
  password: '',
  confirmPassword: ''
})

const errors = ref({})
const loading = ref(false)
const error = ref(null)
const success = ref(false)
const codeVerified = ref(false)
const verifyingCode = ref(true)
const hasValidSession = ref(false)

// Auth composable
const { updatePassword } = useAuth()
const supabase = useSupabaseClient()

// Get reset code from URL
const resetCode = route.query.code;

// Check if user is already authenticated (from auth callback)
if (isAuthenticated.value) {
  codeVerified.value = true
  verifyingCode.value = false
  hasValidSession.value = true
}

// Verify the recovery session
const verifyRecoverySession = async () => {
  try {
    verifyingCode.value = true
    error.value = null

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || !session.user) {
      throw new Error('No active session found. Please use the link from your email to reset your password.')
    }

    console.log('🔍 [RESET] Checking recovery session for user:', session.user.id)
    console.log('🔍 [RESET] Session details:', {
      recovery_sent_at: session.user.recovery_sent_at,
      provider: session.user.app_metadata?.provider,
      email: session.user.email
    })

    // Verify it's a recovery session (check recovery indicators)
    const isRecoverySession = session.user.recovery_sent_at ||
                             session.user.app_metadata?.provider === 'email'

    if (isRecoverySession) {
      hasValidSession.value = true
      codeVerified.value = true
      console.log('✅ [RESET] Valid recovery session detected!')
    } else {
      throw new Error('This doesn\'t appear to be a valid password reset session. Please use the link from your email.')
    }
  } catch (err) {
    console.error('❌ [RESET] Recovery session verification error:', err)

    // Handle specific error types
    if (err.message?.includes('expired') || err.message?.includes('invalid')) {
      error.value = 'This password reset link has expired or is invalid. Please request a new one.'
    } else {
      error.value = err.message || 'Failed to verify reset session. Please request a new password reset.'
    }
  } finally {
    verifyingCode.value = false
  }
}

// Verify recovery session on page load
onMounted(async () => {
  console.log('🔄 [RESET] Page mounted, starting session verification...')
  console.log('🔄 [RESET] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')

  if (isAuthenticated.value) {
    // User is already authenticated, check if it's a recovery session
    await verifyRecoverySession()
  } else {
    // No authentication, this shouldn't happen for password reset
    error.value = 'Please use the link from your email to reset your password.'
    verifyingCode.value = false
  }
})

// Form validation
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }
  
  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = 'Please confirm your password'
  } else if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  }
  
  return Object.keys(errors.value).length === 0
}

// Computed property for form validity
const isFormValid = computed(() => {
  return form.value.password &&
         form.value.confirmPassword &&
         form.value.password === form.value.confirmPassword &&
         form.value.password.length >= 6
})

// Handle form submission
const handleResetPassword = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    error.value = null
    success.value = false

    console.log('🔐 [STEP 3] Starting password update process...')

    // Update password using Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: form.value.password
    })

    if (updateError) {
      throw updateError
    }

    console.log('✅ [STEP 3] Password updated successfully!')
    success.value = true

    // Redirect to login after successful password update
    setTimeout(async () => {
      console.log('🔄 [STEP 3] Redirecting to login page...')
      await navigateTo('/login?message=password-updated')
    }, 2000)

  } catch (err) {
    console.error('❌ [STEP 3] Password update error:', err)
    error.value = err.message || 'Failed to update password'
  } finally {
    loading.value = false
  }
}

// Navigation functions
const goToLogin = async () => {
  await navigateTo('/login')
}

const goToForgotPassword = async () => {
  await navigateTo('/forgot-password')
}

// Page meta
definePageMeta({
  layout: 'empty',
  middleware: []
})
</script>
