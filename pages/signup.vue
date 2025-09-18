<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 flex items-center justify-center">
          <img 
            src="/images/Optiqo_logo.png" 
            alt="Optiqo" 
            class="h-10 w-auto"
          />
        </div>
        <h2 class="mt-6 mb-4 text-center text-3xl font-heading text-black dark:text-white tracking-tight">
          Create your Optiqo account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">
          Already have an account?
          <NuxtLink to="/login" class="font-medium text-primary hover:text-primary-600">
            Sign in here
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="mt-8 bg-gray-50 dark:bg-gray-800 shadow-lg">
        <UForm :state="form" @submit="handleSignUp" class="space-y-6 p-6 ">
          <!-- Personal Information -->
          <div class="space-y-4">
            <h3 class="text-lg text-black dark:text-white">Personal Information</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="First Name" required class="text-black dark:text-white">
                <UInput
                  v-model="form.firstName"
                  placeholder="First name"
                  :error="errors.firstName"
                  class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
                  required
                />
              </UFormGroup>

              <UFormGroup label="Last Name" required class="text-black dark:text-white">
                <UInput
                  v-model="form.lastName"
                  placeholder="Last name"
                  :error="errors.lastName"
                  class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
                  required
                />
              </UFormGroup>
            </div>

            <UFormGroup label="Email address" required class="text-black dark:text-white">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="Enter your email"
                :error="errors.email"
                class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
                required
              />
            </UFormGroup>

            <!-- Password fields - only show in password mode -->
            <template v-if="!magicLinkMode">
              <UFormGroup label="Password" required class="text-black dark:text-white">
                <UInput
                  v-model="form.password"
                  type="password"
                  placeholder="Create a password"
                  :error="errors.password"
                  class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
                  required
                />
              </UFormGroup>

              <UFormGroup label="Confirm Password" required class="text-black dark:text-white">
                <UInput
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  :error="errors.confirmPassword"
                  class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
                  required
                />
              </UFormGroup>
            </template>
          </div>

          <!-- Organization Information -->
            <div class="space-y-4 pt-6 border-t border-gray-300 dark:border-gray-600">
            <h3 class="text-lg text-black dark:text-white">Organization Information</h3>
            
            <UFormGroup label="Organization Name (Optional)" class="text-black dark:text-white">
              <UInput
                v-model="form.organizationName"
                placeholder="Enter your organization name"
                :error="errors.organizationName"
                class="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0"
              />
              <template #help>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Leave blank if you don't want to create an organization yet.
                </p>
              </template>
            </UFormGroup>
          </div>

          <!-- Terms and Conditions -->
          <div class="pt-4">
            <UCheckbox v-model="form.acceptTerms" :error="errors.acceptTerms" label="Accept Terms and Conditions" class="text-black dark:text-white">
              <span class="text-sm text-gray-700 dark:text-gray-300">
                I agree to the 
                <a href="#" class="text-primary hover:text-primary-600">Terms of Service</a>
                and 
                <a href="#" class="text-primary hover:text-primary-600">Privacy Policy</a>
              </span>
            </UCheckbox>
          </div>

          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            class="mt-4"
          />

          <div v-if="showEmailConfirmationMessage" class="mt-4">
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-6">
              <div class="flex">
                <Icon name="heroicons:check-circle" class="w-6 h-6 text-green-400 mr-3 mt-0.5" />
                <div class="flex-1">
                  <h4 class="text-lg font-medium text-green-800 dark:text-white mb-2">
                    {{ magicLinkMode ? 'Magic Link Sent!' : 'Account Created Successfully!' }}
                  </h4>
                  <p class="text-sm text-green-700 dark:text-white mb-4">
                    <template v-if="magicLinkMode">
                      We've sent a magic link to <strong>{{ form.email }}</strong>. 
                      Please check your email and click the link to complete your registration.
                    </template>
                    <template v-else>
                      We've sent a confirmation link to <strong>{{ form.email }}</strong>. 
                      Please check your email and click the confirmation link to activate your account.
                    </template>
                  </p>
                  <div class="flex justify-center">
                    <UButton 
                      @click="goToSignIn"
                      color="green"
                      size="sm"
                    >
                      Continue to Sign In
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <UButton
            v-if="!showEmailConfirmationMessage"
            type="submit"
            :loading="loading"
            class="w-full text-white border-0 hover:opacity-90 transition-opacity flex items-center justify-center"
            style="background-color: #F28C28;"
            size="lg"
          >
            <Icon v-if="magicLinkMode" name="heroicons:envelope-open" class="w-5 h-5 mr-2" />
            {{ magicLinkMode ? 'Send Magic Link' : 'Create Account' }}
          </UButton>

          <!-- Toggle between password and magic link modes -->
          <div v-if="!showEmailConfirmationMessage" class="mt-4">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            <UButton
              type="button"
              @click="toggleMagicLinkMode"
              variant="outline"
              class="w-full mt-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-heading flex items-center justify-center"
              size="lg"
            >
              <Icon :name="magicLinkMode ? 'heroicons:key' : 'heroicons:envelope-open'" class="w-5 h-5 mr-2" />
              {{ magicLinkMode ? 'Create Account with Password' : 'Create Account with Magic Link' }}
            </UButton>
          </div>
          
          <!-- Password validation errors - only show after button press -->
          <div v-if="showPasswordErrors && (passwordValidationErrors.length > 0 || passwordConfirmError)" class="mt-4">
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div class="flex">
                <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-400 mr-2" />
                <div class="text-sm text-red-800 dark:text-red-200">
                  <h4 class="font-medium mb-2">Please fix the following errors:</h4>
                  <ul class="space-y-1">
                    <li v-for="error in passwordValidationErrors" :key="error" class="flex items-center">
                      <Icon name="heroicons:x-mark" class="w-4 h-4 mr-1" />
                      {{ error }}
                    </li>
                    <li v-if="passwordConfirmError" class="flex items-center">
                      <Icon name="heroicons:x-mark" class="w-4 h-4 mr-1" />
                      {{ passwordConfirmError }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
// Redirect if already authenticated
const { isAuthenticated, redirectToDashboard } = useAuth()

if (isAuthenticated.value) {
  await redirectToDashboard()
}

// Form state
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  organizationName: '',
  acceptTerms: false
})

const errors = ref({})
const showPasswordErrors = ref(false)
const showEmailConfirmationMessage = ref(false)

// Auth composable
const { signUp, signUpWithMagicLink, loading, error } = useAuth()

// Magic link state
const magicLinkMode = ref(false)

// Check if we should start in magic link mode
const route = useRoute()
if (route.query.mode === 'magic-link') {
  magicLinkMode.value = true
}

// Password validation function
const validatePassword = (password) => {
  const errors = []
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  return errors
}

const passwordValidationErrors = computed(() => {
  return validatePassword(form.value.password)
})

const passwordConfirmError = computed(() => {
  if (form.value.confirmPassword && form.value.password !== form.value.confirmPassword) {
    return 'Passwords do not match'
  }
  return null
})

// Form validation
const validateForm = () => {
  errors.value = {}
  
  // Personal information validation
  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'First name is required'
  }
  
  if (!form.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required'
  }
  
  if (!form.value.email) {
    errors.value.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  }
  
  // Only validate password fields if not in magic link mode
  if (!magicLinkMode.value) {
    if (!form.value.password) {
      errors.value.password = 'Password is required'
    }
    
    if (!form.value.confirmPassword) {
      errors.value.confirmPassword = 'Please confirm your password'
    }
  }
  
  if (!form.value.acceptTerms) {
    errors.value.acceptTerms = 'You must accept the terms and conditions'
  }
  
  return Object.keys(errors.value).length === 0
}

// Computed property for form validity
const isFormValid = computed(() => {
  const baseValid = form.value.firstName &&
                   form.value.lastName &&
                   form.value.email &&
                   form.value.acceptTerms
  
  if (magicLinkMode.value) {
    return baseValid
  } else {
    return baseValid &&
           form.value.password &&
           form.value.confirmPassword &&
           passwordValidationErrors.value.length === 0 &&
           !passwordConfirmError.value
  }
})

// Handle form submission
const handleSignUp = async () => {
  // Always show password errors when button is clicked (only for password mode)
  if (!magicLinkMode.value) {
    showPasswordErrors.value = true
  }
  
  // Check basic form validation first
  if (!validateForm()) {
    return
  }
  
  // Check password validation only for password mode
  if (!magicLinkMode.value && (passwordValidationErrors.value.length > 0 || passwordConfirmError.value)) {
    return
  }
  
  try {
    let result
    
    if (magicLinkMode.value) {
      // Magic link signup
      result = await signUpWithMagicLink(
        form.value.email,
        form.value.firstName,
        form.value.lastName,
        'EDITOR', // New users are assigned EDITOR role
        form.value.organizationName || undefined
      )
      
      if (result.success) {
        // Show magic link confirmation message
        showEmailConfirmationMessage.value = true
      }
    } else {
      // Regular password signup
      result = await signUp(
        form.value.email,
        form.value.password,
        form.value.firstName,
        form.value.lastName,
        'EDITOR', // New users are assigned EDITOR role
        form.value.organizationName || undefined
      )
      
      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Show email confirmation message with continue button
          showEmailConfirmationMessage.value = true
        } else {
          // User is immediately authenticated, redirect to dashboard
          const { redirectToDashboard } = useAuth()
          await redirectToDashboard()
        }
      }
    }
  } catch (err) {
    // Error is handled by the composable
    console.error('Sign up error:', err)
  }
}

// Toggle between password and magic link modes
const toggleMagicLinkMode = () => {
  magicLinkMode.value = !magicLinkMode.value
  errors.value = {}
  showPasswordErrors.value = false
  showEmailConfirmationMessage.value = false
}

// Navigation functions
const goToSignIn = async () => {
  await navigateTo('/login')
}

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})
</script>
