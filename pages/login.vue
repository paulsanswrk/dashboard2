<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style="background-color: #f3f4f6;">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 flex items-center justify-center">
          <img 
            src="/images/Optiqo_logo.png" 
            alt="Optiqo" 
            class="h-10 w-auto"
          />
        </div>
        <h2 class="mt-6 mb-4 text-center text-3xl font-heading text-black tracking-tight">
          Sign in to Optiqo
        </h2>
        <p class="mt-2 text-center text-sm text-gray-700">
          Or
          <NuxtLink to="/signup" class="font-medium text-primary hover:text-primary-600">
            create a new account
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="mt-8 bg-gray-50 shadow-lg">
        <UForm :state="form" @submit="handleSignIn" class="space-y-6 p-6">
          <UFormGroup label="Email address" required class="text-black">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              :error="errors.email"
              class="bg-white border-gray-300 text-black placeholder-gray-500"
              required
            />
          </UFormGroup>

          <UFormGroup label="Password" required class="text-black">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              :error="errors.password"
              class="bg-white border-gray-300 text-black placeholder-gray-500"
              required
            />
          </UFormGroup>

          <div class="flex items-center justify-between">
            <UCheckbox 
              v-model="form.rememberMe" 
              label="Remember me"
              class="text-black"
            />

            <NuxtLink to="/forgot-password" class="text-sm text-primary hover:text-primary-600">
              Forgot your password?
            </NuxtLink>
          </div>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            class="mt-4"
          />

          <UAlert
            v-if="successMessage"
            color="green"
            variant="soft"
            :title="successMessage"
            class="mt-4"
          />

          <UButton
            type="submit"
            :loading="loading"
            :disabled="!form.email || !form.password"
            class="w-full text-white border-0 hover:opacity-90 transition-opacity text-center block "
            style="background-color: #F28C28;"
            size="lg"
          >
            Sign in
          </UButton>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Redirect if already authenticated
const { isAuthenticated } = useAuth()

if (isAuthenticated.value) {
  await navigateTo('/dashboard')
}

// Form state
const form = ref({
  email: '',
  password: '',
  rememberMe: false
})

const errors = ref({})
const successMessage = ref('')

// Auth composable
const { signIn, loading, error } = useAuth()

// Check for success messages from query params
const route = useRoute()
if (route.query.message === 'password-updated') {
  successMessage.value = 'Password updated successfully! You can now sign in with your new password.'
}

// Form validation
const validateForm = () => {
  errors.value = {}
  
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  }
  
  if (!form.value.password) {
    errors.value.password = 'Password is required'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }
  
  return Object.keys(errors.value).length === 0
}

// Handle form submission
const handleSignIn = async () => {
  if (!validateForm()) return
  
  try {
    console.log('🚀 Login page: Starting login process')
    const result = await signIn(form.value.email, form.value.password)
    console.log('✅ Login page: Login successful, result:', result)
    
    // Redirect to dashboard after successful login
    console.log('🔄 Login page: Redirecting to dashboard...')
    await navigateTo('/my-dashboard')
    console.log('✅ Login page: Redirect completed')
  } catch (err) {
    // Error is handled by the composable
    console.error('❌ Login page: Sign in error:', err)
  }
}

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})
</script>
