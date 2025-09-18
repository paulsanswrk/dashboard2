<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme />
    
    <!-- Authenticated layout -->
    <AppLayout v-if="isAuthenticated && !isPublicPage">
      <NuxtPage />
    </AppLayout>
    
    <!-- Public pages (login, signup) -->
    <NuxtPage v-else />
  </div>
</template>

<script setup>
// Authentication state - using Supabase's built-in reactive user state
const user = useSupabaseUser()
const { isAuthenticated } = useAuth()
const route = useRoute()

// Check if current page is a public page that shouldn't show AppLayout
const isPublicPage = computed(() => {
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback']
  return publicRoutes.some(publicRoute => publicRoute === route.path)
})

// The authentication state is now handled automatically by Supabase
// No need for manual initialization or watching
</script>
