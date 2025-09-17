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
      <UCard v-else-if="error && !codeVerified" class="mt-8 bg-white shadow-lg">
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

      <!-- Password reset form (only show when code is verified) -->
      <UCard v-else-if="codeVerified" class="mt-8 bg-white shadow-lg">
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

// Auth composable
const { updatePassword } = useAuth()
const supabase = useSupabaseClient()

// Get reset code from URL
const resetCode = route.query.code;

// Check if user is already authenticated (from auth callback)
if (isAuthenticated.value) {
  codeVerified.value = true
  verifyingCode.value = false
}

// Verify the reset code
const verifyResetCode = async () => {
  if (!resetCode) {
    error.value = 'Invalid reset link. Please request a new password reset.'
    verifyingCode.value = false
    return
  }

  try {
    verifyingCode.value = true
    error.value = null

    // For Supabase password reset, we need to verify the OTP code
    // Try different approaches for the code parameter
    let verifyResult = null
    
    // First try with token_hash
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: resetCode,
        type: 'recovery'
      })
      
      if (verifyError) {
        throw verifyError
      }
      
      verifyResult = data
    } catch (hashError) {
      console.log('Token hash approach failed, trying direct token...')
      
      // Try with direct token
      const { data, error: tokenError } = await supabase.auth.verifyOtp({
        token: resetCode,
        type: 'recovery'
      })
      
      if (tokenError) {
        throw tokenError
      }
      
      verifyResult = data
    }

    if (verifyResult && verifyResult.user) {
      codeVerified.value = true
      console.log('✅ Reset code verified successfully for user:', verifyResult.user.id)
    } else {
      throw new Error('Invalid reset code')
    }
  } catch (err) {
    console.error('❌ Reset code verification error:', err)
    
    // Handle specific error types
    if (err.message?.includes('expired') || err.message?.includes('invalid')) {
      error.value = 'This password reset link has expired or is invalid. Please request a new one.'
    } else {
      error.value = err.message || 'Failed to verify reset code. Please request a new password reset.'
    }
  } finally {
    verifyingCode.value = false
  }
}

// Verify code on page load (only if not already authenticated)
onMounted(async () => {
  if (!isAuthenticated.value) {
    await verifyResetCode()
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
    
    // Update password using Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: form.value.password
    })

    if (updateError) {
      throw updateError
    }
    
    success.value = true
    
    // Redirect to login after successful password update
    setTimeout(async () => {
      await navigateTo('/login?message=password-updated')
    }, 2000)
    
  } catch (err) {
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
  layout: false,
  middleware: []
})
</script>
