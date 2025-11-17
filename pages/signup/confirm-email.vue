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
        <h2 class="mt-6 text-center text-3xl font-heading text-black tracking-tight">
          Check Your Email
        </h2>
        <p class="mt-2 text-center text-sm text-gray-700">
          We've sent a confirmation link to
        </p>
        <p class="text-center text-sm font-medium text-primary">
          {{ email }}
        </p>
        <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-800 text-center">
            <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
            <strong>Important:</strong> You must click the confirmation link in your email before you can access your account.
          </p>
        </div>
      </div>
      
      <UCard class="mt-8 bg-gray-50 shadow-lg">
        <div class="p-6 space-y-6">
          <!-- Email icon -->
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
            <Icon name="heroicons:envelope" class="h-8 w-8 text-blue-600" />
          </div>

          <!-- Instructions -->
          <div class="text-center space-y-4">
            <h3 class="text-lg text-black">Almost there!</h3>
            <p class="text-gray-600">
              Click the confirmation link in your email to activate your Optiqo account and start building amazing dashboards.
            </p>
          </div>

          <!-- Resend email section -->
          <div class="border-t border-gray-200 pt-6">
            <p class="text-sm text-gray-600 text-center mb-4">
              Didn't receive the email?
            </p>
            
            <UButton
              @click="resendConfirmation"
              :loading="resending"
              :disabled="resending"
              variant="outline"
              class="w-full"
            >
              <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Resend Confirmation Email
            </UButton>
            
            <p v-if="resendMessage" class="text-sm text-green-600 text-center mt-2">
              {{ resendMessage }}
            </p>
          </div>

          <!-- Back to signup -->
          <div class="text-center">
            <NuxtLink to="/signup" class="text-sm text-primary hover:text-primary-600">
              ← Back to Sign Up
            </NuxtLink>
          </div>
        </div>
      </UCard>

      <!-- Help section -->
      <div class="text-center">
        <p class="text-xs text-gray-500">
          Having trouble? Check your spam folder or 
          <a href="mailto:support@optiqo.com" class="text-primary hover:text-primary-600">
            contact support
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Page meta
definePageMeta({
  layout: 'empty',
  middleware: []
})

// Get email from query params
const route = useRoute()
const email = ref(String(route.query.email || ''))

// State
const resending = ref(false)
const resendMessage = ref('')

// Auth composable
const { resendConfirmationEmail } = useAuth()

// Resend confirmation email
const resendConfirmation = async () => {
  if (!email.value) return
  
  try {
    resending.value = true
    resendMessage.value = ''
    
    // Resend confirmation email
    await resendConfirmationEmail(email.value)
    
    resendMessage.value = 'Confirmation email sent! Please check your inbox.'
  } catch (err) {
    console.error('Resend error:', err)
    resendMessage.value = 'Failed to resend email. Please try again.'
  } finally {
    resending.value = false
  }
}

// Redirect if no email provided
if (!email.value) {
  await navigateTo('/signup')
}
</script>
