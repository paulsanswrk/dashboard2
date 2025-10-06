<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme />
    
    <!-- Authenticated layout -->
    <template v-if="isAuthenticated && !isPublicPage">
      <BuilderLayout v-if="useBuilderLayout">
        <NuxtPage />
      </BuilderLayout>
      <AppLayout v-else>
        <NuxtPage />
      </AppLayout>
    </template>
    
    <!-- Public pages (login, signup) -->
    <NuxtPage v-else />
  </div>
</template>

<script setup>
// Authentication state - using Supabase's built-in reactive user state
const user = useSupabaseUser()
const { isAuthenticated } = useAuth()
const route = useRoute()

// Layout selection: use compact builder layout on reporting builder page
const useBuilderLayout = computed(() => route.path === '/reporting/builder')

// Check if current page is a public page that shouldn't show AppLayout
const isPublicPage = computed(() => {
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback']
  return publicRoutes.some(publicRoute => publicRoute === route.path)
})

// The authentication state is now handled automatically by Supabase
// No need for manual initialization or watching
</script>
