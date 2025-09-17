<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 flex items-center justify-center">
          <div class="bg-transparent dark:bg-gray-300 rounded-lg p-3 dark:shadow-sm">
            <img 
              src="/images/Optiqo_logo.png" 
              alt="Optiqo" 
              class="h-10 w-auto"
            />
          </div>
        </div>
        <h2 class="mt-6 mb-4 text-center text-3xl font-heading text-gray-900 dark:text-white tracking-tight">
          Sign in to Optiqo
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
          Or
          <NuxtLink to="/signup" class="font-medium text-primary hover:text-primary-600">
            create a new account
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="mt-8 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
        <!-- Password Sign In Form -->
        <UForm v-if="!magicLinkMode" :state="form" @submit="handleSignIn" class="space-y-6 p-6">
          <UFormGroup label="Email address" required class="text-gray-900 dark:text-white">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              :error="errors.email"
              class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 dark:focus:ring-0"
              required
            />
          </UFormGroup>

          <UFormGroup label="Password" required class="text-gray-900 dark:text-white">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              :error="errors.password"
              class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 dark:focus:ring-0"
              required
            />
          </UFormGroup>

          <div class="flex items-center justify-between">
            <UCheckbox 
              v-model="form.rememberMe" 
              label="Remember me"
              class="text-gray-900 dark:text-white"
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
            class="w-full text-white border-0 hover:opacity-90 transition-opacity text-center block cursor-pointer"
            style="background-color: #F28C28;"
            size="lg"
          >
            Sign in
          </UButton>

          <div class="mt-4">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            <UButton
              type="button"
              @click="toggleMagicLinkMode"
              variant="outline"
              class="w-full mt-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-heading flex items-center justify-center"
              size="lg"
            >
              <Icon name="heroicons:envelope-open" class="w-5 h-5 mr-2" />
              Sign in with Magic Link
            </UButton>
          </div>
        </UForm>

        <!-- Magic Link Sign In Form -->
        <UForm v-else :state="{ magicLinkEmail }" @submit="handleMagicLinkSignIn" class="space-y-6 p-6">
          <div class="text-center mb-4">
            <h3 class="text-lg font-heading font-semibold text-gray-900 dark:text-white">Sign in with Magic Link</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">We'll send you a secure link to sign in</p>
          </div>

          <UFormGroup label="Email address" required class="text-gray-900 dark:text-white">
            <UInput
              v-model="magicLinkEmail"
              type="email"
              placeholder="Enter your email"
              :error="errors.magicLinkEmail"
              class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 dark:focus:ring-0"
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
            v-if="successMessage"
            color="green"
            variant="soft"
            :title="successMessage"
            class="mt-4"
          />

          <UButton
            type="submit"
            :loading="loading"
            class="w-full text-white border-0 hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer"
            style="background-color: #F28C28;"
            size="lg"
          >
            <Icon name="heroicons:envelope-open" class="w-5 h-5 mr-2" />
            Send Magic Link
          </UButton>

          <div class="mt-4">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            <UButton
              type="button"
              @click="toggleMagicLinkMode"
              variant="outline"
              class="w-full mt-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-heading flex items-center justify-center"
              size="lg"
            >
              <Icon name="heroicons:key" class="w-5 h-5 mr-2" />
              Sign in with Password
            </UButton>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Redirect if already authenticated
const { isAuthenticated, userProfile } = useAuth()

if (isAuthenticated.value) {
  if (userProfile.value?.role === 'ADMIN') {
    await navigateTo('/admin')
  } else {
    await navigateTo('/dashboard')
  }
}

// Form state
const form = ref({
  email: '',
  password: '',
  rememberMe: false
})

// Magic link state
const magicLinkMode = ref(false)
const magicLinkEmail = ref('')

const errors = ref({})
const successMessage = ref('')

// Auth composable
const { signIn, signInWithMagicLink, loading, error } = useAuth()

// Check for success messages from query params
const route = useRoute()
if (route.query.message === 'password-updated') {
  successMessage.value = 'Password updated successfully! You can now sign in with your new password.'
}

// Check if we should start in magic link mode
if (route.query.mode === 'magic-link') {
  magicLinkMode.value = true
  successMessage.value = 'Please request a new magic link below.'
}

// Form validation functions removed - server handles validation

// Handle form submission
const handleSignIn = async () => {
  try {
    console.log('🚀 Login page: Starting login process')
    const result = await signIn(form.value.email, form.value.password)
    console.log('✅ Login page: Login successful, result:', result)
    
    // Wait for user profile to load to check role
    const { userProfile } = useAuth()
    await nextTick()
    
    // Redirect based on user role
    if (userProfile.value?.role === 'ADMIN') {
      console.log('🔄 Login page: ADMIN user, redirecting to admin dashboard...')
      await navigateTo('/admin')
    } else {
      console.log('🔄 Login page: Regular user, redirecting to dashboard...')
      await navigateTo('/my-dashboard')
    }
    console.log('✅ Login page: Redirect completed')
  } catch (err) {
    // Error is handled by the composable
    console.error('❌ Login page: Sign in error:', err)
  }
}

// Handle magic link submission
const handleMagicLinkSignIn = async () => {
  try {
    console.log('🔗 Login page: Starting magic link process')
    const result = await signInWithMagicLink(magicLinkEmail.value)
    console.log('✅ Login page: Magic link sent, result:', result)
    
    if (result.success) {
      successMessage.value = result.message
    }
  } catch (err) {
    // Error is handled by the composable
    console.error('❌ Login page: Magic link error:', err)
  }
}

// Toggle between password and magic link modes
const toggleMagicLinkMode = () => {
  magicLinkMode.value = !magicLinkMode.value
  errors.value = {}
  successMessage.value = ''
  
  if (magicLinkMode.value) {
    magicLinkEmail.value = form.value.email
  } else {
    form.value.email = magicLinkEmail.value
  }
}

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})
</script>
