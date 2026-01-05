<template>
  <div class="topbar">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 lg:gap-6">
        <!-- Mobile Menu Button (optional, shown when showMobileMenuButton is true) -->
        <button
            v-if="showMobileMenuButton"
            @click="$emit('toggleMobileMenu')"
            class="lg:hidden p-2 hover:bg-black/10 rounded-md transition-colors cursor-pointer"
        >
          <Icon :name="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-5 h-5"/>
        </button>
        
        <!-- Logo -->
        <template v-if="isEditorOrViewer">
          <OptiqoLogo/>
        </template>
        <template v-else>
          <NuxtLink to="/" class="text-xl lg:text-sm font-heading font-semibold tracking-wide cursor-pointer hover:text-gray-200 transition-colors">
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
        <button v-if="showSettingsButton" class="p-2 hover:bg-black/10 rounded cursor-pointer">
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
</template>

<script setup lang="ts">
interface NavItem {
  label: string
  shortLabel?: string
  route: string
}

interface Props {
  showMobileMenuButton?: boolean
  showSettingsButton?: boolean
  mobileMenuOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showMobileMenuButton: false,
  showSettingsButton: false,
  mobileMenuOpen: false
})

defineEmits(['toggleMobileMenu'])

// Authentication
const { userProfile, signOut } = useAuth()

// Theme management
const { toggleTheme, themeIcon, themeLabel } = useTheme()

// Role-based navigation
const role = computed(() => userProfile.value?.role)
const isViewer = computed(() => role.value === 'VIEWER')
const isEditor = computed(() => role.value === 'EDITOR')
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

// Top navigation items by role
const topNavItems = computed<NavItem[]>(() => {
  if (isViewer.value) {
    return [
      { label: 'DASHBOARDS', shortLabel: 'DASH', route: '/dashboards' },
      { label: 'REPORTS', route: '/reports' }
    ]
  }
  // ADMIN, EDITOR, and SUPERADMIN
  return [
    { label: 'CONNECT', route: '/data-sources' },
    { label: 'ANALYZE', route: '/reporting/builder' },
    { label: 'DASHBOARDS', shortLabel: 'DASH', route: '/dashboards' },
    { label: 'REPORTS', route: '/reports' }
  ]
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

const handleMenuSelect = (item: any) => {
  if (item.to) {
    navigateTo(item.to)
  } else if (item.onClick) {
    item.onClick()
  } else if (item.click) {
    item.click()
  } else if (item.action) {
    if (item.action === 'toggleTheme') {
      toggleTheme()
    }
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
</script>
