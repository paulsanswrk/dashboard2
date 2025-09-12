<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme />
    
    <!-- Authenticated layout -->
    <AppLayout v-if="isAuthenticated">
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

// The authentication state is now handled automatically by Supabase
// No need for manual initialization or watching
</script>
