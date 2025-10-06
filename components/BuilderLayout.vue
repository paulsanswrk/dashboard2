<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Main Content (no sidebar) -->
    <div class="flex-1 flex flex-col lg:ml-0">
      <!-- Top Bar -->
      <div class="topbar">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 lg:gap-6">
            <button @click="navigateTo('/my-dashboard')" class="text-xl lg:text-sm font-heading font-semibold tracking-wide">
              OPTIQO
            </button>
            <!-- Desktop Navigation -->
            <nav class="hidden lg:flex gap-6">
              <button @click="navigateTo('/data-sources')" class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors">CONNECT</button>
              <button @click="navigateTo('/reporting/builder')" class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors">ANALYZE</button>
              <button class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors">DASHBOARDS</button>
              <button class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors">REPORTS</button>
              <button class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors">ALARMS</button>
            </nav>
            <!-- Mobile Navigation -->
            <nav class="lg:hidden flex gap-2 text-xs">
              <button @click="navigateTo('/data-sources')" class="hover:underline hover:text-gray-200 font-heading font-medium tracking-wide transition-colors">CONNECT</button>
              <button @click="navigateTo('/reporting/builder')" class="hover:underline hover:text-gray-200 font-heading font-medium tracking-wide transition-colors">ANALYZE</button>
              <button class="hover:underline hover:text-gray-200 font-heading font-medium tracking-wide transition-colors">DASH</button>
            </nav>
          </div>
          <div class="flex items-center gap-2 lg:gap-4">
            <button class="p-2 hover:bg-black/10 rounded">
              <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
            </button>
            <!-- Account Dropdown -->
            <UDropdown :items="accountMenuItems" :popper="{ placement: 'bottom-end' }" :ui="{ background: 'bg-white dark:bg-gray-800' }">
              <UButton variant="ghost" class="p-1 hover:bg-transparent avatar-button">
                <UAvatar 
                  :alt="userDisplayName"
                  :src="userProfile?.avatar_url"
                  :text="userInitials"
                  size="sm"
                  :class="userProfile?.avatar_url ? 'avatar-custom' : 'ring-2 ring-gray-200 avatar-custom'"
                  :ui="{ background: userProfile?.avatar_url ? '' : 'bg-gray-300 dark:bg-gray-500' }"
                />
              </UButton>
              <template #account>
                <div class="px-2 py-1.5">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ userDisplayName }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ userProfile?.email }}</p>
                </div>
              </template>
            </UDropdown>
          </div>
        </div>
      </div>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="bg-neutral-800 border-t border-neutral-700 px-4 lg:px-6 py-3 lg:py-4">
        <div class="flex items-center justify-center gap-2">
          <img 
            src="/images/qtransparent.png" 
            alt="Q" 
            class="h-4 lg:h-6 w-auto opacity-60"
          />
          <span class="text-sm" style="color: rgb(156 99 39);">
            © {{ currentYear }} Optiqo. All rights reserved
          </span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
// Authentication
const { userProfile, signOut } = useAuth()

// Theme management
const { toggleTheme, themeIcon, themeLabel } = useTheme()

// User display properties
const userDisplayName = computed(() => {
  if (!userProfile.value) return 'User'
  return `${userProfile.value.firstName} ${userProfile.value.lastName}`
})

const userInitials = computed(() => {
  if (!userProfile.value) return 'U'
  const first = userProfile.value.firstName?.charAt(0) || ''
  const last = userProfile.value.lastName?.charAt(0) || ''
  return `${first}${last}`.toUpperCase()
})

// Current year for copyright
const currentYear = computed(() => new Date().getFullYear())

const handleSignOut = async () => {
  try {
    await signOut()
    await navigateTo('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

// Account dropdown menu items
const accountMenuItems = computed(() => {
  const baseItems = [
    [{
      label: userDisplayName.value,
      slot: 'account',
      disabled: true
    }]
  ]

  // Add common menu items
  baseItems.push(
    [{
      label: 'Account Settings',
      icon: 'heroicons:user',
      click: () => navigateTo('/account')
    }],
    [{
      label: themeLabel.value,
      icon: themeIcon.value,
      click: toggleTheme
    }],
    [{
      label: 'Sign Out',
      icon: 'heroicons:arrow-right-on-rectangle',
      click: handleSignOut
    }]
  )

  return baseItems
})
</script>


