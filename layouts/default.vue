<template>
  <div class="min-h-screen flex flex-col">
    <template v-if="roleLoaded">
    <!-- Color Scheme for theme management -->
    <ColorScheme/>

      <div class="flex flex-1 h-screen bg-gray-50">
      <!-- Mobile Overlay -->
      <div
          v-if="isMobileMenuOpen"
          @click="closeMobileMenu"
          class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
      ></div>

      <!-- Sidebar -->
      <div
          v-if="showSideNav"
          :class="[
        'sidebar flex flex-col transition-transform duration-300 ease-in-out',
        'fixed lg:static inset-y-0 left-0 z-50 w-64',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
      >
        <div class="p-4 lg:p-6 border-b border-neutral-700 dark:border-[rgb(64,64,64)]">
          <div class="flex items-center justify-center">
            <a href="/" class="logo-container block cursor-pointer">
              <img
                  src="/images/Optiqo_logo.png"
                  alt="Optiqo"
                  class="h-6 lg:h-8 w-auto"
              />
            </a>
          </div>
        </div>

        <nav class="flex-1 p-4 space-y-2">
          <!-- Mobile-only top nav items -->
          <div v-if="topNavItems.length" class="lg:hidden space-y-1 mb-3">
            <NuxtLink
                v-for="item in topNavItems"
                :key="item.route"
                :to="item.route"
                class="sidebar-item"
                :class="{ active: isActiveRoute(item.route) }"
                @click="closeMobileMenu"
            >
              <Icon name="i-heroicons-arrow-top-right-on-square" class="w-5 h-5"/>
              {{ item.label }}
            </NuxtLink>
          </div>

          <!-- Divider between mobile top nav and side nav when both exist -->
          <div v-if="topNavItems.length && sideNavItems.length" class="lg:hidden">
            <hr class="border-neutral-600 dark:border-[rgb(64,64,64)] my-2">
          </div>

          <!-- Side nav items -->
          <NuxtLink
              v-for="item in sideNavItems"
              :key="item.route"
              :to="item.route"
              class="sidebar-item"
              :class="{ active: isActiveRoute(item.route) }"
              @click="closeMobileMenu"
          >
            <Icon :name="item.icon" class="w-5 h-5"/>
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="p-4 border-t border-neutral-600 dark:border-[rgb(64,64,64)]">
          <!-- User Info -->
          <div v-if="userProfile" class="mb-4 p-3 bg-neutral-700 dark:bg-[rgb(64,64,64)] rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style="background-color: var(--color-primary);">
                <img
                    v-if="userProfile.avatar_url"
                    :src="userProfile.avatar_url"
                    :alt="`${userProfile.firstName} ${userProfile.lastName}`"
                    class="w-full h-full object-cover"
                />
                <Icon v-else name="i-heroicons-user" class="w-4 h-4 text-white"/>
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

          <button class="sidebar-item theme-toggle cursor-pointer" @click="toggleTheme">
            <ClientOnly>
              <Icon :name="themeIcon" class="w-5 h-5"/>
              {{ themeLabel }}
            </ClientOnly>
          </button>

          <button class="sidebar-item cursor-pointer" @click="handleSignOut">
            <Icon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5"/>
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
                  class="lg:hidden p-2 hover:bg-black/10 rounded-md transition-colors cursor-pointer"
              >
                <Icon :name="isMobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-5 h-5"/>
              </button>
              <template v-if="isEditorOrViewer">
                <OptiqoLogo/>
              </template>
              <template v-else>
                <NuxtLink to="/" class="text-xl lg:text-sm font-heading font-semibold tracking-wide cursor-pointer">
                OPTIQO
                </NuxtLink>
              </template>
              <!-- Desktop Navigation -->
              <nav v-if="topNavItems.length" class="hidden lg:flex gap-6">
                <NuxtLink
                    v-for="item in topNavItems"
                    :key="item.route"
                    :to="item.route"
                    class="hover:underline hover:text-gray-200 font-heading font-medium text-sm tracking-wide transition-colors"
                >
                  {{ item.label }}
                </NuxtLink>
              </nav>
              <!-- Mobile Navigation -->
              <nav v-if="topNavItems.length" class="lg:hidden flex gap-2 text-xs">
                <NuxtLink
                    v-for="item in topNavItems"
                    :key="item.route"
                    :to="item.route"
                    class="hover:underline hover:text-gray-200 font-heading font-medium tracking-wide transition-colors"
                >
                  {{ item.shortLabel || item.label }}
                </NuxtLink>
              </nav>
            </div>
            <div class="flex items-center gap-2 lg:gap-4">
              <button class="p-2 hover:bg-black/10 rounded cursor-pointer">
                <Icon name="i-heroicons-cog-6-tooth" class="w-4 h-4"/>
              </button>

              <!-- Account Dropdown -->
              <UDropdownMenu :items="accountMenuItems" :popper="{ placement: 'bottom-end' }" :ui="{ background: 'bg-white dark:bg-gray-800' }" @select="handleMenuSelect">
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
              </UDropdownMenu>
            </div>
          </div>
        </div>

        <!-- Page Content -->
        <main class="flex-1 overflow-auto">
          <slot/>
        </main>

        <!-- Footer with Q Logo and Copyright -->
        <footer class="bg-neutral-800 border-t border-neutral-600 dark:border-[rgb(64,64,64)] px-4 lg:px-6 py-3 lg:py-4">
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
    <template v-else>
      <div class="flex flex-1 items-center justify-center h-screen bg-gray-50">
        <div class="flex items-center gap-3 text-gray-600">
          <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin"/>
          <span>Loading workspace...</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Authentication
const {userProfile, signOut} = useAuth()
const user = useSupabaseUser()

// Theme management
const {isDark, toggleTheme, themeIcon, themeLabel} = useTheme()

// Route management
const route = useRoute()

// Get organization from user profile
const organization = computed(() => userProfile.value?.organization)

const role = computed(() => userProfile.value?.role)
const roleLoaded = computed(() => role.value !== undefined && role.value !== null)
const isViewer = computed(() => role.value === 'VIEWER')
const isEditor = computed(() => role.value === 'EDITOR')
const isAdmin = computed(() => role.value === 'ADMIN')
const isSuperAdmin = computed(() => role.value === 'SUPERADMIN')
const isEditorOrViewer = computed(() => isEditor.value || isViewer.value)

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

// Top navigation items by role (content work)
const topNavItems = computed(() => {
  if (isSuperAdmin.value) return []
  if (isViewer.value) {
    return [
      {label: 'DASHBOARDS', shortLabel: 'DASH', route: '/dashboards'},
      {label: 'REPORTS', route: '/reports'}
    ]
  }
  // ADMIN and EDITOR
  return [
    {label: 'CONNECT', route: '/data-sources'},
    {label: 'ANALYZE', route: '/reporting/builder'},
    {label: 'DASHBOARDS', shortLabel: 'DASH', route: '/dashboards'},
    {label: 'REPORTS', route: '/reports'}
  ]
})

// Side navigation items by role (admin work)
const sideNavItems = computed(() => {
  if (isSuperAdmin.value) {
    return [
      {icon: 'i-heroicons-users', label: 'Users', route: '/users'},
      {icon: 'i-heroicons-eye', label: 'Viewers', route: '/viewers'},
      {icon: 'i-heroicons-building-office', label: 'Organizations', route: '/organizations'},
      {icon: 'i-heroicons-queue-list', label: 'Email Queue', route: '/reports/monitor'}
    ]
  }
  if (isAdmin.value) {
    return [
      {icon: 'i-heroicons-users', label: 'Users', route: '/users'},
      {icon: 'i-heroicons-eye', label: 'Viewers', route: '/viewers'}
    ]
  }
  // Editors/Viewers: no side nav
  return []
})

const showSideNav = computed(() =>
    sideNavItems.value.length > 0 || (isMobileMenuOpen.value && topNavItems.value.length > 0)
)

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
        icon: 'i-heroicons-user',
        to: '/account'
      }],
      [{
        label: themeLabel.value,
        icon: themeIcon.value,
        onClick() {
          toggleTheme()
        }
      }],
      [{
        label: 'Sign Out',
        icon: 'i-heroicons-arrow-right-on-rectangle',
        onClick() {
          handleSignOut()
        }
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

// Helper function to determine if a route is active
const isActiveRoute = (routePath: string) => {
  const currentPath = route.path

  // Exact match takes priority
  if (currentPath === routePath) return true

  // Special handling to avoid multiple active items for nested routes
  // Check if there are navigation items with more specific routes that match the current path
  const allNavRoutes = sideNavItems.value.map(item => item.route)
  const moreSpecificRoutes = allNavRoutes.filter(r =>
      r !== routePath &&
      currentPath.startsWith(r) &&
      r.length > routePath.length
  )

  // If there are more specific routes that match, don't mark this as active
  if (moreSpecificRoutes.length > 0) {
    return false
  }

  // For nested routes, check if current path starts with route
  // but avoid false positives (e.g., /dashboard shouldn't match /data-sources)
  if (routePath !== '/' && currentPath.startsWith(routePath)) {
    // Make sure the next character after the route is '/' or end of string
    const remaining = currentPath.slice(routePath.length)
    return remaining === '' || remaining.startsWith('/')
  }

  return false
}

const handleThemeToggle = () => {
  debugger
  toggleTheme()
}

const handleSignOutClick = () => {
  handleSignOut()
}

const handleMenuSelect = (item: any) => {
  console.log('Menu item selected:', item)
  if (item.to) {
    navigateTo(item.to)
  } else if (item.onClick) {
    console.log('Calling onClick handler')
    item.onClick()
  } else if (item.click) {
    console.log('Calling click handler')
    item.click()
  } else if (item.action) {
    console.log('Handling action:', item.action)
    if (item.action === 'toggleTheme') {
      toggleTheme()
    }
  } else {
    console.log('No onClick, click, to, or action property found')
  }
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
