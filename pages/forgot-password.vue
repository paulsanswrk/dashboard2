<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
          <Icon name="heroicons:key" class="h-8 w-8 text-blue-600" />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      
      <UCard class="mt-8 bg-white">
        <UForm :state="form" @submit="handleResetPassword" class="space-y-6">
          <UFormGroup label="Email address" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              :error="errors.email"
              class="text-gray-900"
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
            title="Password reset email sent!"
            description="Check your email for instructions to reset your password."
            class="mt-4"
          />

          <UButton
            type="submit"
            :loading="loading"
            :disabled="!form.email"
            class="w-full flex justify-center"
            size="lg"
          >
            Send reset link
          </UButton>

          <div class="text-center">
            <NuxtLink to="/login" class="text-sm text-blue-600 hover:text-blue-500">
              Back to sign in
            </NuxtLink>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Redirect if already authenticated
const { isAuthenticated } = useAuth()

if (isAuthenticated.value) {
  const { redirectToDashboard } = useAuth()
  await redirectToDashboard()
}

// Form state
const form = ref({
  email: ''
})

const errors = ref({})
const loading = ref(false)
const error = ref(null)
const success = ref(false)

// Auth composable
const { resetPassword } = useAuth()

// Form validation
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  }
  
  return Object.keys(errors.value).length === 0
}

// Handle form submission
const handleResetPassword = async () => {
  if (!validateForm()) return
  
  try {
    loading.value = true
    error.value = null
    success.value = false
    
    // Send password reset email using Supabase
    await resetPassword(form.value.email)
    
    success.value = true
    
  } catch (err) {
    error.value = err.message || 'Failed to send reset email'
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
