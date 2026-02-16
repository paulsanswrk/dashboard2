<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <ColorScheme/>

    <!-- Loading State -->
    <div v-if="!roleLoaded" class="absolute inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
      <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin"/>
        <span>Loading workspace...</span>
      </div>
    </div>

    <!-- Main Layout -->
    <div v-show="roleLoaded" class="flex flex-1 min-h-0 bg-gray-50">
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
          <template v-for="item in sideNavItems" :key="item.label">
            <!-- Single Item -->
            <NuxtLink
                v-if="!item.children && item.route"
                :to="item.route"
                class="sidebar-item"
                :class="{ active: isActiveRoute(item.route) }"
                @click="closeMobileMenu"
            >
              <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5"/>
              {{ item.label }}
            </NuxtLink>

            <!-- Group Item -->
            <div v-else-if="item.children" class="space-y-1">
              <button
                  class="sidebar-item w-full justify-between cursor-pointer"
                  :class="{ 'text-white bg-neutral-700/50': isGroupActive(item) }"
                  @click="toggleGroup(item.label)"
              >
                <div class="flex items-center gap-2">
              <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5"/>
              {{ item.label }}
            </div>
            <Icon
                name="i-heroicons-chevron-down"
                    class="w-4 h-4 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedGroups.includes(item.label) }"
                />
              </button>

              <div
                  v-show="expandedGroups.includes(item.label)"
                  class="pl-4 space-y-1 overflow-hidden transition-all duration-300"
              >
                <NuxtLink
                    v-for="child in item.children"
                    :key="child.route"
                    :to="child.route"
                    class="sidebar-item text-sm py-2"
                    :class="{ active: isActiveRoute(child.route) }"
                    @click="closeMobileMenu"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-50"></span>
                  {{ child.label }}
                </NuxtLink>
              </div>
            </div>
          </template>
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
        <TopBar 
            :show-mobile-menu-button="true" 
            :show-settings-button="true"
            :mobile-menu-open="isMobileMenuOpen"
            @toggle-mobile-menu="toggleMobileMenu"
        />

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
  </div>
</template>

<script setup lang="ts">
// Authentication
const {userProfile, signOut} = useAuth()

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

// Current year for copyright
const currentYear = computed(() => new Date().getFullYear())

const isMobileMenuOpen = ref(false)

// Top navigation items by role (content work) - used by sidebar for mobile
const topNavItems = computed(() => {

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

interface NavItem {
  label: string
  icon?: string
  route: string
  children?: { label: string; route: string }[]
}

// Side navigation items by role (admin work)
const sideNavItems = computed<NavItem[]>(() => {
  if (isSuperAdmin.value) {
    return [
      {icon: 'i-heroicons-users', label: 'Users', route: '/users'},
      {icon: 'i-heroicons-eye', label: 'Viewers', route: '/viewers'},
      {icon: 'i-heroicons-building-office', label: 'Organizations', route: '/organizations'},
      {icon: 'i-heroicons-queue-list', label: 'Email Queue', route: '/reports/monitor'},
      {
        icon: 'i-heroicons-arrow-path-rounded-square',
        label: 'OptiqoFlow Sync',
        route: '/optiqoflow-sync', // placeholder route
        children: [
        {
          label: 'Demo',
          route: '/optiqoflow-sync/demo'
        },
        {
          label: 'Logs',
          route: '/optiqoflow-sync/logs'
        }
        ]
      }
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

const expandedGroups = ref<string[]>([])

const toggleGroup = (label: string) => {
  const index = expandedGroups.value.indexOf(label)
  if (index === -1) {
    expandedGroups.value.push(label)
  } else {
    expandedGroups.value.splice(index, 1)
  }
}

const isGroupActive = (item: any) => {
  if (!item.children) return false
  return item.children.some((child: any) => isActiveRoute(child.route))
}

const showSideNav = computed(() =>
    sideNavItems.value.length > 0 || (isMobileMenuOpen.value && topNavItems.value.length > 0)
)


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
  const allNavRoutes = sideNavItems.value
      .flatMap(item => [item.route, ...(item.children?.map(c => c.route) || [])])
      .filter(Boolean) as string[]

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
}, {deep: true})

// Auto-expand groups if child is active
watch([() => route.path, () => sideNavItems.value], () => {
  sideNavItems.value.forEach((item: any) => {
    if (item.children && isGroupActive(item)) {
      if (!expandedGroups.value.includes(item.label)) {
        expandedGroups.value.push(item.label)
      }
    }
  })
}, { immediate: true, deep: true })
</script>
