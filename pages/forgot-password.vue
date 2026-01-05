<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Icon name="i-heroicons-key" class="h-8 w-8 text-blue-600 dark:text-blue-400"/>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset your password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <UCard class="mt-8 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
        <UForm
            :state="form"
            @submit="handleResetPassword"
            class="space-y-6 p-6 forgot-password-form"
        >
          <UFormField label="Email address" required class="text-gray-900 dark:text-white">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              :error="errors.email"
              class="!w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 dark:focus:ring-0"
              required
            />
          </UFormField>

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
            class="w-full text-white border-0 hover:opacity-90 transition-opacity flex justify-center cursor-pointer"
            size="lg"
            style="background-color: #F28C28;"
          >
            Send reset link
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
// Show reCAPTCHA badge on this auth page
useHead({
  bodyAttrs: {
    class: 'show-recaptcha'
  }
})

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

// reCAPTCHA composable
const {execute} = useRecaptcha()

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

    // Execute reCAPTCHA
    const recaptchaToken = await execute('reset_password')
    if (!recaptchaToken) {
      throw new Error('reCAPTCHA verification failed. Please try again.')
    }

    // Send password reset email using server API
    await resetPassword(form.value.email, recaptchaToken)

    success.value = true

  } catch (err) {
    error.value = err.message || 'Failed to send reset email'
  } finally {
    loading.value = false
  }
}

// Page meta
definePageMeta({
  layout: 'empty',
  middleware: []
})
</script>

<style scoped>
.forgot-password-form label {
  color: #111827;
}

:root.dark .forgot-password-form label {
  color: #ffffff;
}
</style>
