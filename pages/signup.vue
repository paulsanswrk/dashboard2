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
        <h2 class="mt-6 text-center text-3xl font-heading font-bold text-black tracking-tight">
          Create your Optiqo account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-700">
          Already have an account?
          <NuxtLink to="/login" class="font-medium text-primary hover:text-primary-600">
            Sign in here
          </NuxtLink>
        </p>
      </div>
      
      <UCard class="mt-8 bg-gray-50 shadow-lg">
        <UForm :state="form" @submit="handleSignUp" class="space-y-6 p-6 ">
          <!-- Personal Information -->
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-black">Personal Information</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="First Name" required class="text-black">
                <UInput
                  v-model="form.firstName"
                  placeholder="First name"
                  :error="errors.firstName"
                  class="bg-white border-gray-300 text-black placeholder-gray-500"
                  required
                />
              </UFormGroup>

              <UFormGroup label="Last Name" required class="text-black">
                <UInput
                  v-model="form.lastName"
                  placeholder="Last name"
                  :error="errors.lastName"
                  class="bg-white border-gray-300 text-black placeholder-gray-500"
                  required
                />
              </UFormGroup>
            </div>

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
                placeholder="Create a password"
                :error="errors.password"
                class="bg-white border-gray-300 text-black placeholder-gray-500"
                required
              />
            </UFormGroup>

            <UFormGroup label="Confirm Password" required class="text-black">
              <UInput
                v-model="form.confirmPassword"
                type="password"
                placeholder="Confirm your password"
                :error="errors.confirmPassword"
                class="bg-white border-gray-300 text-black placeholder-gray-500"
                required
              />
            </UFormGroup>
          </div>

          <!-- Organization Information -->
            <div class="space-y-4 pt-6 border-t border-gray-300">
            <h3 class="text-lg font-medium text-black">Organization Information</h3>
            
            <UFormGroup label="Organization Name (Optional)" class="text-black">
              <UInput
                v-model="form.organizationName"
                placeholder="Enter your organization name"
                :error="errors.organizationName"
                class="bg-white border-gray-300 text-black placeholder-gray-500"
              />
              <template #help>
                <p class="text-sm text-gray-600 mt-1">
                  Leave blank if you don't want to create an organization yet.
                </p>
              </template>
            </UFormGroup>
          </div>

          <!-- Terms and Conditions -->
          <div class="pt-4">
            <UCheckbox v-model="form.acceptTerms" :error="errors.acceptTerms" label="Accept Terms and Conditions" class="text-black">
              <span class="text-sm text-gray-700">
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

          <UButton
            type="submit"
            :loading="loading"
            :disabled="!isFormValid"
            class="w-full text-center text-white border-0 hover:opacity-90 transition-opacity text-center block"
            style="background-color: #F28C28;"
            size="lg"
          >
            Create Account
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
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  organizationName: '',
  acceptTerms: false
})

const errors = ref({})

// Auth composable
const { signUp, loading, error } = useAuth()

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
  
  if (!form.value.acceptTerms) {
    errors.value.acceptTerms = 'You must accept the terms and conditions'
  }
  
  return Object.keys(errors.value).length === 0
}

// Computed property for form validity
const isFormValid = computed(() => {
  return form.value.firstName &&
         form.value.lastName &&
         form.value.email &&
         form.value.password &&
         form.value.confirmPassword &&
         form.value.acceptTerms &&
         form.value.password === form.value.confirmPassword
})

// Handle form submission
const handleSignUp = async () => {
  if (!validateForm()) return
  
  try {
    const result = await signUp(
      form.value.email,
      form.value.password,
      form.value.firstName,
      form.value.lastName,
      'ADMIN', // First user is always admin
      form.value.organizationName || undefined
    )
    
    // User is immediately authenticated, redirect to dashboard
    await navigateTo('/my-dashboard?welcome=true')
  } catch (err) {
    // Error is handled by the composable
    console.error('Sign up error:', err)
  }
}

// Page meta
definePageMeta({
  layout: false,
  middleware: []
})
</script>
