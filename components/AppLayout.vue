<template>
  <div class="flex h-screen bg-gray-50">

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
                :alt="`${userProfile.firstName} ${userProfile.lastName}`"
                class="w-full h-full object-cover"
              />
              <Icon v-else name="heroicons:user" class="w-4 h-4 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ userProfile.firstName }} {{ userProfile.lastName }}</p>
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
            <!-- Mobile Menu Button -->
            <button 
              @click="toggleMobileMenu"
              class="lg:hidden p-2 hover:bg-black/10 rounded-md transition-colors"
            >
              <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-5 h-5" />
            </button>
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
      
      <!-- Footer with Q Logo and Copyright -->
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
const user = useSupabaseUser()

// Theme management
const { isDark, toggleTheme, themeIcon, themeLabel } = useTheme()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

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

const isMobileMenuOpen = ref(false)

// Navigation items based on current route
const route = useRoute()
const navigationItems = computed(() => {
  // If we're on admin pages, show admin navigation
  if (route.path.startsWith('/admin') || route.path.startsWith('/organizations')) {
    return [
      { icon: 'heroicons:home', label: 'Dashboard', route: '/admin' },
      { icon: 'heroicons:users', label: 'Users', route: '/admin/users' },
      { icon: 'heroicons:eye', label: 'Viewers', route: '/admin/viewers' },
      { icon: 'heroicons:building-office', label: 'Organizations', route: '/organizations' }
    ]
  } else {
    // For all other pages, show regular user navigation
    return [
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
  }
})

// Account dropdown menu items
const accountMenuItems = computed(() => {
  const baseItems = [
    [{
      label: userDisplayName.value,
      slot: 'account',
      disabled: true
    }]
  ]

  // Add dashboard navigation for ADMIN users
  if (userProfile.value?.role === 'ADMIN') {
    baseItems.push([{
      label: 'Admin Dashboard',
      icon: 'heroicons:shield-check',
      click: () => navigateTo('/admin')
    }, {
      label: 'User Dashboard',
      icon: 'heroicons:home',
      click: () => navigateTo('/dashboard')
    }])
  }

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
