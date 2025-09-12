<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 flex items-center justify-center">
          <Icon name="heroicons:arrow-path" class="animate-spin h-8 w-8 text-primary" />
        </div>
        <h2 class="mt-6 text-3xl font-heading font-bold text-gray-900 dark:text-white">
          Redirecting...
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Taking you to your dashboard
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Redirect to dashboard if authenticated, otherwise to login
const { isAuthenticated } = useAuth()

// Redirect logic
if (process.client) {
  if (isAuthenticated.value) {
    await navigateTo('/dashboard')
  } else {
    await navigateTo('/login')
  }
}

// Page meta - no middleware needed as we handle redirect manually
definePageMeta({
  layout: false
})
</script>
