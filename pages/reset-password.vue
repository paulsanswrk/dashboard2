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
      
      <UCard class="mt-8 bg-white shadow-lg">
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
// Check if user is authenticated (required for password reset)
const { isAuthenticated, user } = useAuth()

if (!isAuthenticated.value) {
  await navigateTo('/login')
}

// Form state
const form = ref({
  password: '',
  confirmPassword: ''
})

const errors = ref({})
const loading = ref(false)
const error = ref(null)
const success = ref(false)

// Auth composable
const { updatePassword } = useAuth()

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
    await updatePassword(form.value.password)
    
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

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})
</script>
