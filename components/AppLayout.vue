<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Mobile Menu Button -->
    <button 
      @click="toggleMobileMenu"
      class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md"
    >
      <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-6 h-6" />
    </button>

    <!-- Mobile Overlay -->
    <div 
      v-if="isMobileMenuOpen"
      @click="closeMobileMenu"
      class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
    ></div>

    <!-- Sidebar -->
    <div 
      :class="[
        'sidebar flex flex-col transition-transform duration-300 ease-in-out',
        'fixed lg:static inset-y-0 left-0 z-50 w-64',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <div class="p-4 lg:p-6 border-b border-neutral-700">
        <div class="flex items-center justify-center">
          <div class="logo-container">
            <img 
              src="/images/Optiqo_logo.png" 
              alt="Optiqo" 
              class="h-6 lg:h-8 w-auto"
            />
          </div>
        </div>
      </div>
      
      <nav class="flex-1 p-4 space-y-2">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.route"
          :to="item.route"
          class="sidebar-item"
          :class="{ active: $route.path === item.route }"
          @click="closeMobileMenu"
        >
          <Icon :name="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="p-4 border-t border-neutral-700">
        <!-- User Info -->
        <div v-if="userProfile" class="mb-4 p-3 bg-neutral-700 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style="background-color: var(--color-primary);">
              <img 
                v-if="userProfile.avatar_url" 
                :src="userProfile.avatar_url" 
                :alt="`${userProfile.first_name} ${userProfile.last_name}`"
                class="w-full h-full object-cover"
              />
              <Icon v-else name="heroicons:user" class="w-4 h-4 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ userProfile.first_name }} {{ userProfile.last_name }}</p>
              <p class="text-xs text-neutral-400 truncate">{{ userProfile.email }}</p>
            </div>
          </div>
          <div v-if="organization" class="mt-2 text-xs text-neutral-400">
            {{ organization.name }}
          </div>
        </div>
        
        <button class="sidebar-item theme-toggle" @click="toggleTheme">
          <Icon :name="themeIcon" class="w-5 h-5" />
          {{ themeLabel }}
        </button>
        
        <button class="sidebar-item" @click="handleSignOut">
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="flex-1 flex flex-col lg:ml-0">
      <!-- Top Bar -->
      <div class="topbar">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 lg:gap-6">
            <span class="text-sm font-heading font-semibold tracking-wide">OPTIQO</span>
            <!-- Desktop Navigation -->
            <nav class="hidden lg:flex gap-6">
              <button class="hover:underline hover:text-orange-300 font-heading font-medium text-sm tracking-wide transition-colors">CONNECT</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium text-sm tracking-wide transition-colors">ANALYZE</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium text-sm tracking-wide transition-colors">DASHBOARDS</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium text-sm tracking-wide transition-colors">REPORTS</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium text-sm tracking-wide transition-colors">ALARMS</button>
            </nav>
            <!-- Mobile Navigation -->
            <nav class="lg:hidden flex gap-2 text-xs">
              <button class="hover:underline hover:text-orange-300 font-heading font-medium tracking-wide transition-colors">CONNECT</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium tracking-wide transition-colors">ANALYZE</button>
              <button class="hover:underline hover:text-orange-300 font-heading font-medium tracking-wide transition-colors">DASH</button>
            </nav>
          </div>
          <div class="flex items-center gap-2 lg:gap-4">
            <button class="p-2 hover:bg-black/10 rounded">
              <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
            </button>
            
            <!-- Account Dropdown -->
            <UDropdown :items="accountMenuItems" :popper="{ placement: 'bottom-end' }" :ui="{ background: 'bg-transparent' }">
              <UButton variant="ghost" class="p-1 hover:bg-transparent avatar-button">
                <UAvatar 
                  :alt="userDisplayName"
                  :src="userProfile?.avatar_url"
                  :text="userInitials"
                  size="sm"
                  class="ring-2 ring-gray-200 avatar-custom"
                  :ui="{ background: 'bg-gray-300 dark:bg-gray-500' }"
                />
              </UButton>
              
              <template #account>
                <div class="px-2 py-1.5">
                  <p class="text-sm font-medium text-gray-900">{{ userDisplayName }}</p>
                  <p class="text-xs text-gray-500">{{ userProfile?.email }}</p>
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
      
      <!-- Footer with Q Logo and Copyright -->
      <footer class="bg-neutral-800 border-t border-neutral-700 px-4 lg:px-6 py-3 lg:py-4">
        <div class="flex items-center justify-center gap-2">
          <img 
            src="/images/qtransparent.png" 
            alt="Q" 
            class="h-4 lg:h-6 w-auto opacity-60"
          />
          <span class="text-sm text-neutral-300">
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
const user = useSupabaseUser()

// Theme management
const { isDark, toggleTheme, themeIcon, themeLabel } = useTheme()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

// User display properties
const userDisplayName = computed(() => {
  if (!userProfile.value) return 'User'
  return `${userProfile.value.first_name} ${userProfile.value.last_name}`
})

const userInitials = computed(() => {
  if (!userProfile.value) return 'U'
  const first = userProfile.value.first_name?.charAt(0) || ''
  const last = userProfile.value.last_name?.charAt(0) || ''
  return `${first}${last}`.toUpperCase()
})

// Current year for copyright
const currentYear = computed(() => new Date().getFullYear())

const isMobileMenuOpen = ref(false)

const navigationItems = [
  { icon: 'heroicons:home', label: 'Dashboard', route: '/dashboard' },
  { icon: 'heroicons:circle-stack', label: 'Data Sources', route: '/data-sources' },
  { icon: 'heroicons:chart-bar', label: 'My Desk', route: '/my-dashboard' },
  { icon: 'heroicons:users', label: 'Users', route: '/users' },
  { icon: 'heroicons:eye', label: 'Viewers', route: '/viewers' },
  { icon: 'heroicons:shield-check', label: 'SSO', route: '/sso' },
  { icon: 'heroicons:user', label: 'Account', route: '/account' },
  { icon: 'heroicons:question-mark-circle', label: 'Support', route: '/support' },
  { icon: 'heroicons:credit-card', label: 'Plan & Billing', route: '/billing' }
]

// Account dropdown menu items
const accountMenuItems = computed(() => [
  [{
    label: userDisplayName.value,
    slot: 'account',
    disabled: true
  }],
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
])

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleSignOut = async () => {
  try {
    await signOut()
    await navigateTo('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

// Close mobile menu on route change
watch(() => useRoute().path, () => {
  closeMobileMenu()
})
</script>
