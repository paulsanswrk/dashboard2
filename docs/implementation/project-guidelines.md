# Optiqo Dashboard - Project Implementation Guidelines

## Overview

This document outlines the comprehensive implementation guidelines discovered and established during the React to Nuxt migration of the Optiqo Dashboard application. These guidelines ensure consistency, maintainability, and scalability across the project.

## Architecture Principles

### 1. Framework Selection Criteria

#### Why Nuxt 4 over React?
- **Server-Side Rendering**: Better SEO and initial load performance
- **File-based Routing**: Simpler navigation structure
- **Auto-imports**: Reduced boilerplate code
- **Built-in Optimizations**: Automatic code splitting and tree shaking
- **Vue Ecosystem**: Growing ecosystem with excellent tooling

#### Technology Stack Decisions
```typescript
// Core Framework
- Nuxt 4: Full-stack Vue framework
- Vue 3: Progressive JavaScript framework
- TypeScript: Type safety and better DX

// UI & Styling
- Nuxt UI: Component library for consistency
- Tailwind CSS: Utility-first CSS framework
- Heroicons: Consistent icon system

// Development Tools
- @nuxt/devtools: Development experience
- @vueuse/nuxt: Vue composition utilities
- nuxt-icon: Icon management
```

### 2. Project Structure Standards

#### Directory Organization
```
optiqo-dashboard/
├── assets/                 # Static assets and global styles
│   └── css/
│       └── main.css       # Global styles and custom classes
├── components/            # Reusable Vue components
│   ├── AppLayout.vue     # Main application layout
│   ├── ShareDashboardModal.vue
│   └── CreateReportModal.vue
├── pages/                # File-based routing
│   ├── index.vue         # Dashboard overview
│   ├── data-sources.vue  # Data management
│   ├── integration-wizard.vue
│   ├── analyze.vue       # Chart creation
│   ├── my-dashboard.vue  # Dashboard management
│   ├── users.vue         # User management
│   ├── viewers.vue       # Viewer management
│   └── [stub-pages].vue  # Placeholder pages
├── server/               # Server-side logic (future)
│   └── api/             # API endpoints
├── docs/                # Documentation
│   ├── implementation/  # Technical documentation
│   └── requirements/    # Business requirements
└── [config-files]       # Configuration files
```

#### Naming Conventions
- **Files**: kebab-case (`my-dashboard.vue`)
- **Components**: PascalCase (`ShareDashboardModal.vue`)
- **Variables**: camelCase (`selectedUser`)
- **Constants**: UPPER_SNAKE_CASE (`DATABASE_TYPES`)
- **CSS Classes**: kebab-case (`sidebar-item`)

## Component Design Guidelines

### 1. Component Architecture

#### Single File Components (SFC)
```vue
<template>
  <!-- Template with semantic HTML -->
</template>

<script setup>
// Composition API with TypeScript
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
/* Component-specific styles */
</style>
```

#### Component Composition
- **Atomic Design**: Break components into atoms, molecules, organisms
- **Composition API**: Use `<script setup>` for better TypeScript support
- **Props Validation**: Define prop types and validation rules
- **Event Handling**: Use typed emit definitions

### 2. State Management Patterns

#### Local State (Current Implementation)
```vue
<script setup>
// Reactive state
const selectedUser = ref(null)
const users = ref([])
const showModal = ref(false)

// Computed properties
const filteredUsers = computed(() => 
  users.value.filter(user => user.active)
)

// Methods
const selectUser = (user) => {
  selectedUser.value = user
}
</script>
```

#### Global State (Future Implementation)
```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null)
  const users = ref([])
  
  const fetchUsers = async () => {
    // API call
  }
  
  return { currentUser, users, fetchUsers }
})
```

### 3. Form Handling Standards

#### Form Structure
```vue
<template>
  <UForm @submit="handleSubmit">
    <UFormGroup label="Field Label" required>
      <UInput 
        v-model="form.field"
        placeholder="Placeholder text"
        :error="errors.field"
      />
    </UFormGroup>
  </UForm>
</template>

<script setup>
const form = ref({
  field: ''
})

const errors = ref({})

const handleSubmit = async () => {
  // Validation and submission logic
}
</script>
```

#### Validation Patterns
- **Client-side**: Immediate feedback with Nuxt UI validation
- **Server-side**: API validation with error handling
- **Real-time**: Live validation as user types

## Styling Guidelines

### 1. CSS Architecture

#### Tailwind CSS Usage
```vue
<template>
  <!-- Utility-first approach -->
  <div class="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
    <h2 class="text-xl font-semibold text-gray-900">Title</h2>
    <UButton variant="outline">Action</UButton>
  </div>
</template>
```

#### Custom CSS Classes
```css
/* assets/css/main.css */
.sidebar {
  @apply bg-gray-900 text-white;
}

.sidebar-item {
  @apply flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors w-full;
}

.sidebar-item.active {
  @apply bg-blue-600 text-white;
}
```

### 2. Design System

#### Color Palette
```css
:root {
  --color-primary: #3b82f6;      /* Blue */
  --color-success: #10b981;      /* Green */
  --color-warning: #f59e0b;      /* Yellow */
  --color-error: #ef4444;        /* Red */
  --color-info: #06b6d4;         /* Cyan */
}
```

#### Typography Scale
- **Headings**: text-2xl, text-xl, text-lg
- **Body**: text-base, text-sm
- **Captions**: text-xs

#### Spacing System
- **Padding**: p-2, p-4, p-6
- **Margin**: m-2, m-4, m-6
- **Gap**: gap-2, gap-4, gap-6

## API Integration Guidelines

### 1. Data Fetching Patterns

#### Current Implementation (Mock Data)
```vue
<script setup>
// Mock data for development
const users = ref([
  { id: 1, name: 'John Smith', email: 'john@company.com', role: 'Admin' }
])
</script>
```

#### Future Implementation (Real API)
```vue
<script setup>
// Real API integration
const { data: users, pending, error } = await useFetch('/api/users')

// With error handling
const { data: users } = await useFetch('/api/users', {
  onResponseError({ response }) {
    // Handle API errors
  }
})
</script>
```

### 2. Error Handling

#### API Error Patterns
```vue
<script setup>
const handleApiCall = async () => {
  try {
    const result = await $fetch('/api/endpoint')
    // Handle success
  } catch (error) {
    // Handle error
    console.error('API Error:', error)
    // Show user-friendly message
  }
}
</script>
```

## Security Guidelines

### 1. Authentication & Authorization

#### Route Protection
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useCurrentUser()
  if (!user.value) {
    return navigateTo('/login')
  }
})
```

#### Role-based Access
```vue
<script setup>
const user = useCurrentUser()
const canEdit = computed(() => 
  user.value?.role === 'ADMIN' || user.value?.role === 'EDITOR'
)
</script>

<template>
  <UButton v-if="canEdit" @click="editItem">
    Edit
  </UButton>
</template>
```

### 2. Data Validation

#### Input Sanitization
```vue
<script setup>
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '')
}

const handleSubmit = () => {
  const cleanData = sanitizeInput(form.value.field)
  // Process clean data
}
</script>
```

## Performance Guidelines

### 1. Optimization Strategies

#### Code Splitting
```vue
<script setup>
// Lazy load heavy components
const HeavyComponent = defineAsyncComponent(() => 
  import('~/components/HeavyComponent.vue')
)
</script>
```

#### Image Optimization
```vue
<template>
  <!-- Nuxt Image for automatic optimization -->
  <NuxtImg 
    src="/images/dashboard.png" 
    alt="Dashboard"
    width="800"
    height="600"
    loading="lazy"
  />
</template>
```

### 2. Bundle Optimization

#### Tree Shaking
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  build: {
    transpile: ['@headlessui/vue']
  }
})
```

## Testing Guidelines

### 1. Testing Strategy

#### Unit Testing
```typescript
// tests/components/UserCard.test.ts
import { mount } from '@vue/test-utils'
import UserCard from '~/components/UserCard.vue'

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const user = { name: 'John Doe', email: 'john@example.com' }
    const wrapper = mount(UserCard, { props: { user } })
    
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@example.com')
  })
})
```

#### E2E Testing
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('dashboard loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Welcome back')
})
```

### 2. Testing Best Practices

- **Test user interactions**: Focus on user behavior
- **Mock external dependencies**: Isolate components
- **Test error scenarios**: Handle edge cases
- **Accessibility testing**: Ensure inclusive design

## Deployment Guidelines

### 1. Build Configuration

#### Production Build
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'vercel'
  },
  ssr: true,
  build: {
    analyze: process.env.ANALYZE === 'true'
  }
})
```

#### Environment Variables
```bash
# .env
NUXT_PUBLIC_API_BASE_URL=https://api.optiqo.com
NUXT_PRIVATE_DATABASE_URL=postgresql://...
```

### 2. CI/CD Pipeline

#### Build Process
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

## Documentation Standards

### 1. Code Documentation

#### Component Documentation
```vue
<!--
  UserCard Component
  
  Displays user information in a card format with edit/delete actions.
  
  @props user - User object with name, email, and role
  @emits edit - Emitted when edit button is clicked
  @emits delete - Emitted when delete button is clicked
-->
<template>
  <!-- Component template -->
</template>
```

#### Function Documentation
```typescript
/**
 * Validates user input and returns sanitized data
 * @param input - Raw user input string
 * @returns Sanitized input string
 * @throws {Error} If input is invalid
 */
const validateInput = (input: string): string => {
  // Implementation
}
```

### 2. README Standards

#### Project README Structure
```markdown
# Project Name

## Overview
Brief description of the project

## Features
- Feature 1
- Feature 2

## Getting Started
Installation and setup instructions

## Development
Development guidelines and scripts

## Deployment
Deployment instructions

## Contributing
Contribution guidelines
```

## Code Review Guidelines

### 1. Review Checklist

#### Code Quality
- [ ] Code follows established patterns
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Performance considerations are addressed

#### Security
- [ ] Input validation is present
- [ ] Authentication checks are in place
- [ ] Sensitive data is not exposed
- [ ] XSS protection is implemented

#### Testing
- [ ] Unit tests are written
- [ ] Integration tests cover new features
- [ ] E2E tests verify user flows
- [ ] Accessibility is tested

### 2. Review Process

1. **Self-review**: Author reviews their own code first
2. **Peer review**: At least one team member reviews
3. **Automated checks**: CI/CD pipeline runs tests
4. **Approval**: Code approved by reviewer
5. **Merge**: Code merged to main branch

## Maintenance Guidelines

### 1. Dependency Management

#### Regular Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Audit security vulnerabilities
npm audit
```

#### Version Pinning
```json
{
  "dependencies": {
    "@nuxt/ui": "^2.18.5",
    "nuxt": "^4.0.0"
  }
}
```

### 2. Performance Monitoring

#### Metrics to Track
- **Bundle size**: Monitor build output size
- **Load time**: Track page load performance
- **Core Web Vitals**: LCP, FID, CLS metrics
- **Error rates**: Monitor application errors

#### Monitoring Tools
- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking and performance monitoring
- **Lighthouse**: Performance auditing

## Mobile Responsiveness Guidelines

### 1. Mobile-First Design Principles

#### Breakpoint Strategy
```css
/* Mobile-first approach with progressive enhancement */
/* Mobile: < 640px (sm) */
/* Tablet: 640px - 1024px (md/lg) */
/* Desktop: > 1024px (xl) */

/* Example responsive grid */
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
  <!-- Content adapts from single column to two columns -->
</div>
```

#### Responsive Layout Patterns
```vue
<template>
  <!-- Collapsible sidebars for mobile -->
  <div class="flex flex-col lg:flex-row h-screen">
    <!-- Mobile toggle button -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton @click="toggleMobilePanel('sidebar')" class="w-full">
        <Icon name="heroicons:bars-3" class="w-4 h-4 mr-2" />
        Menu
      </UButton>
    </div>
    
    <!-- Sidebar with mobile visibility control -->
    <div 
      :class="[
        'w-full lg:w-64',
        mobilePanel === 'sidebar' ? 'block' : 'hidden lg:block'
      ]"
    >
      <!-- Sidebar content -->
    </div>
    
    <!-- Main content area -->
    <div class="flex-1 p-4 lg:p-6">
      <!-- Main content -->
    </div>
  </div>
</template>
```

### 2. Mobile Navigation Patterns

#### Hamburger Menu Implementation
```vue
<template>
  <!-- Mobile menu button -->
  <button 
    @click="toggleMobileMenu"
    class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md"
  >
    <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-6 h-6" />
  </button>

  <!-- Mobile overlay -->
  <div 
    v-if="isMobileMenuOpen"
    @click="closeMobileMenu"
    class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
  ></div>

  <!-- Sidebar with mobile positioning -->
  <div 
    :class="[
      'sidebar flex flex-col transition-transform duration-300 ease-in-out',
      'fixed lg:static inset-y-0 left-0 z-50 w-64',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <!-- Sidebar content -->
  </div>
</template>

<script setup>
const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Close mobile menu on route change
watch(() => useRoute().path, () => {
  closeMobileMenu()
})
</script>
```

### 3. Responsive Form Design

#### Mobile-Optimized Forms
```vue
<template>
  <UForm @submit="handleSubmit">
    <!-- Responsive form grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormGroup label="First Name">
        <UInput v-model="form.firstName" />
      </UFormGroup>
      <UFormGroup label="Last Name">
        <UInput v-model="form.lastName" />
      </UFormGroup>
    </div>
    
    <!-- Full-width fields on mobile -->
    <UFormGroup label="Email">
      <UInput v-model="form.email" class="w-full" />
    </UFormGroup>
    
    <!-- Responsive button layout -->
    <div class="flex flex-col sm:flex-row gap-2 pt-4">
      <UButton variant="outline" class="w-full sm:w-auto">
        Cancel
      </UButton>
      <UButton class="w-full sm:w-auto">
        Submit
      </UButton>
    </div>
  </UForm>
</template>
```

### 4. Mobile Modal Optimization

#### Responsive Modal Design
```vue
<template>
  <UModal v-model="isOpen">
    <UCard class="w-full max-w-2xl mx-4">
      <template #header>
        <h3 class="text-lg font-semibold">Modal Title</h3>
      </template>
      
      <!-- Scrollable content for mobile -->
      <div class="space-y-4 max-h-96 overflow-y-auto">
        <!-- Modal content -->
      </div>
      
      <!-- Responsive button layout -->
      <div class="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
        <UButton variant="outline" class="w-full sm:w-auto">
          Cancel
        </UButton>
        <UButton class="w-full sm:w-auto">
          Confirm
        </UButton>
      </div>
    </UCard>
  </UModal>
</template>
```

## PostCSS and Tailwind Configuration Guidelines

### 1. PostCSS Configuration Best Practices

#### Nuxt PostCSS Configuration
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // PostCSS Configuration - Use this instead of postcss.config.js
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  
  // Other configuration...
})
```

#### ❌ Avoid: Separate PostCSS Config File
```javascript
// DON'T create postcss.config.js with Nuxt
// This causes warnings and conflicts
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

### 2. Tailwind CSS Configuration

#### Proper Tailwind Config Setup
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff'
        }
        // Custom color palette
      }
    }
  },
  plugins: []
}
```

#### Package.json Module Type
```json
{
  "name": "optiqo-dashboard",
  "version": "1.0.0",
  "type": "module",
  "description": "Optiqo Dashboard",
  "private": true
}
```

### 3. CSS Architecture for Mobile

#### Mobile-Specific Styles
```css
/* assets/css/main.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component styles */
.sidebar {
  @apply bg-gray-900 text-white;
}

.sidebar-item {
  @apply flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors w-full;
}

/* Mobile-specific styles - Use regular CSS instead of @apply in media queries */
@media (max-width: 1024px) {
  .sidebar {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .topbar {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}

@media (max-width: 640px) {
  .topbar nav {
    display: none;
  }
  
  .chart-placeholder {
    height: 8rem;
  }
}

/* ❌ Avoid: @apply in media queries */
/* This causes PostCSS errors */
@media (max-width: 640px) {
  .text-2xl {
    @apply text-xl; /* DON'T DO THIS */
  }
}

/* ✅ Use: Regular CSS properties in media queries */
@media (max-width: 640px) {
  .text-2xl {
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
}
```

### 4. Build Configuration Guidelines

#### Dependency Management
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // Vite configuration
  vite: {
    optimizeDeps: {
      include: [] // Only include necessary packages
    }
  },
  
  // Build configuration
  build: {
    transpile: [] // Only transpile packages that need it
  },
  
  // Nitro configuration
  nitro: {
    preset: 'vercel',
    experimental: {
      wasm: true
    }
  },
  
  // SSR configuration
  ssr: false, // Disable SSR if experiencing build issues
})
```

#### Version Management
```json
{
  "devDependencies": {
    "tailwindcss": "3.4.0",
    "autoprefixer": "^10.4.16",
    "nuxt": "^4.0.0"
  }
}
```

## Authentication Implementation Guidelines

### 1. Supabase Authentication Best Practices

#### Use Built-in Supabase Composables
```typescript
// ✅ DO: Use Supabase's built-in composables
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const isAuthenticated = computed(() => !!user.value)

// ❌ DON'T: Create custom authentication state management
const user = ref(null)
const isAuthenticated = ref(false)
```

#### Reactive Authentication State
```typescript
// ✅ DO: Leverage Supabase's reactive user state
watch(user, async (newUser) => {
  if (newUser) {
    await loadUserProfile()
  } else {
    userProfile.value = null
  }
}, { immediate: true })

// ❌ DON'T: Manually manage authentication state
const checkAuthStatus = async () => {
  // Manual cookie checking and state management
}
```

#### Profile Management Pattern
```typescript
// ✅ DO: Separate profile management from authentication
const loadUserProfile = async () => {
  if (!user.value) {
    userProfile.value = null
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    
    if (error) throw error
    userProfile.value = data
  } catch (err) {
    console.error('Error loading profile:', err)
    userProfile.value = null
  }
}
```

### 2. Middleware Implementation

#### Simplified Auth Middleware
```typescript
// ✅ DO: Use Supabase user state in middleware
export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  
  if (!user.value) {
    return navigateTo('/login')
  }
  
  // Validate user exists in database
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.value.id)
      .single()
    
    if (error) {
      await supabase.auth.signOut()
      return navigateTo('/login')
    }
  } catch (err) {
    return navigateTo('/login')
  }
})

// ❌ DON'T: Complex manual authentication checking
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, userProfile, loading, fetchUserProfile } = useAuth()
  
  // Complex manual state checking and cookie validation
  if (process.client && !userProfile.value && !loading.value) {
    // Manual cookie checking logic...
  }
})
```

### 3. Server-Side Profile Management

#### Service Role for Profile Creation
```typescript
// ✅ DO: Use service role for profile creation (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Create profile with service role
const { data: profile, error } = await supabase
  .from('profiles')
  .insert(profileData)
  .select()
  .single()

// ❌ DON'T: Use regular client for profile creation
const supabase = createClient(supabaseUrl, supabaseAnonKey)
// This will fail due to RLS policies
```

#### Profile Creation API Pattern
```typescript
// ✅ DO: Comprehensive profile creation with error handling
export default defineEventHandler(async (event) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, email, userMetadata, profileData } = await readBody(event)
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single()
      
      return { success: true, profile: data, action: 'updated' }
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()
      
      return { success: true, profile: data, action: 'created' }
    }
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
```

### 4. UI Component Integration

#### Account Dropdown Implementation
```vue
<!-- ✅ DO: Use UDropdown with proper user data -->
<UDropdown :items="accountMenuItems" :popper="{ placement: 'bottom-end' }">
  <UButton variant="ghost" class="p-1">
    <UAvatar 
      :alt="userDisplayName"
      :text="userInitials"
      size="sm"
      class="ring-2 ring-gray-200"
    />
  </UButton>
  
  <template #account>
    <div class="px-2 py-1.5">
      <p class="text-sm font-medium text-gray-900">{{ userDisplayName }}</p>
      <p class="text-xs text-gray-500">{{ userProfile?.email }}</p>
    </div>
  </template>
</UDropdown>

<script setup>
// Reactive computed properties for user display
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

// Reactive menu items
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
    label: 'Sign Out',
    icon: 'heroicons:arrow-right-on-rectangle',
    click: handleSignOut
  }]
])
</script>
```

### 5. Error Handling Patterns

#### Authentication Error Handling
```typescript
// ✅ DO: Comprehensive error handling with user feedback
const signIn = async (email: string, password: string) => {
  try {
    loading.value = true
    clearMessages()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) throw signInError

    setMessage('Login successful!', 'success')
    return { user: data.user, success: true }
  } catch (err: any) {
    setMessage(err.message || 'Login failed', 'error')
    return { success: false, error: err.message }
  } finally {
    loading.value = false
  }
}

// ❌ DON'T: Silent error handling
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  // No error handling or user feedback
}
```

### 6. Security Considerations

#### Database Validation
```typescript
// ✅ DO: Validate user exists in database
const validateUserInDatabase = async (userId: string) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found in database
        return { exists: false, error: 'User not found in database' }
      } else {
        return { exists: false, error: error.message }
      }
    }

    return { exists: true, profile }
  } catch (err: any) {
    return { exists: false, error: err.message || 'Validation failed' }
  }
}
```

#### RLS Policy Considerations
```sql
-- ✅ DO: Proper RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypasses RLS for profile creation
-- Use service role in server-side API endpoints
```

## Key Implementation Takeaways

### 1. Authentication Architecture
- **Use Supabase's built-in authentication**: Leverage reactive user state instead of custom management
- **Separate concerns**: Keep authentication and profile management separate
- **Reactive state management**: Use computed properties and watchers for automatic updates
- **Service role for server operations**: Use service role for profile creation to bypass RLS

### 2. Role-Based Access Control (RBAC)
- **Route-based navigation**: Navigation should adapt based on current page context, not just user role
- **Flexible admin access**: Allow admin users to access both admin and user interfaces for testing
- **Context-aware UI**: Show appropriate navigation and content based on current route
- **Dual dashboard system**: Implement separate admin and user dashboards for different use cases

### 3. Navigation Architecture
- **Route-based navigation logic**: Use `route.path` to determine navigation items instead of user role
- **Context switching**: Enable seamless switching between admin and user views
- **Account menu enhancement**: Provide quick access to different dashboard types for admin users
- **Consistent user experience**: Maintain consistent navigation patterns across different user types

### 4. Dashboard Design Patterns
- **Distinct dashboard content**: Admin and user dashboards should show different metrics and actions
- **Organization vs personal focus**: Admin dashboards show organization-wide data, user dashboards show personal data
- **Quick action differentiation**: Admin actions focus on management, user actions focus on creation and analysis
- **Mock data structure**: Use consistent mock data patterns for development and testing

#### Admin Dashboard Implementation Patterns
```vue
<!-- ✅ DO: Route-based navigation logic -->
<script setup>
const route = useRoute()
const navigationItems = computed(() => {
  // If we're on admin pages, show admin navigation
  if (route.path.startsWith('/admin') || route.path.startsWith('/organizations')) {
    return [
      { icon: 'heroicons:home', label: 'Dashboard', route: '/admin' },
      { icon: 'heroicons:users', label: 'Users', route: '/users' },
      { icon: 'heroicons:eye', label: 'Viewers', route: '/viewers' },
      { icon: 'heroicons:building-office', label: 'Organizations', route: '/organizations' }
    ]
  } else {
    // For all other pages, show regular user navigation
    return [
      { icon: 'heroicons:home', label: 'Dashboard', route: '/dashboard' },
      { icon: 'heroicons:circle-stack', label: 'Data Sources', route: '/data-sources' },
      // ... other user navigation items
    ]
  }
})
</script>
```

#### Dual Dashboard System
```vue
<!-- ✅ DO: Separate admin and user dashboard pages -->
<!-- pages/admin.vue - Organization-wide management -->
<template>
  <div class="p-6 space-y-6">
    <h1>Admin Dashboard - {{ userProfile?.firstName }} {{ userProfile?.lastName }}</h1>
    <!-- Organization overview, management actions -->
  </div>
</template>

<!-- pages/dashboard.vue - Personal workspace -->
<template>
  <div class="p-6 space-y-6">
    <h1>Welcome back, {{ userProfile?.firstName }} {{ userProfile?.lastName }}</h1>
    <!-- Personal workspace, creation actions -->
  </div>
</template>
```

#### Account Menu Enhancement
```vue
<!-- ✅ DO: Provide dual dashboard access for admin users -->
<script setup>
const accountMenuItems = computed(() => {
  const baseItems = [
    [{ label: userDisplayName.value, slot: 'account', disabled: true }]
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
    [{ label: 'Account Settings', icon: 'heroicons:user', click: () => navigateTo('/account') }],
    [{ label: 'Sign Out', icon: 'heroicons:arrow-right-on-rectangle', click: handleSignOut }]
  )

  return baseItems
})
</script>
```

### 5. Mobile Responsiveness
- **Mobile-first approach**: Design for mobile first, then enhance for larger screens
- **Collapsible sidebars**: Use toggle panels for complex layouts on mobile
- **Touch-friendly controls**: Ensure adequate touch target sizes (44px minimum)
- **Progressive enhancement**: Start with basic functionality, add features for larger screens

### 6. PostCSS and Tailwind Configuration
- **Use Nuxt's built-in PostCSS**: Configure PostCSS in `nuxt.config.ts`, not separate config file
- **Avoid @apply in media queries**: Use regular CSS properties instead
- **Pin Tailwind version**: Use specific version (3.4.0) for stability
- **Module type declaration**: Add `"type": "module"` to package.json

### 7. Build Optimization
- **Remove unnecessary dependencies**: Avoid packages that cause build conflicts
- **SSR considerations**: Disable SSR if experiencing chunk splitting issues
- **Vite optimization**: Only include necessary packages in optimizeDeps
- **Version compatibility**: Ensure all packages are compatible with Nuxt 4

### 8. Development Workflow
- **Test on multiple devices**: Use browser dev tools and real devices
- **Progressive enhancement**: Ensure core functionality works on all screen sizes
- **Performance monitoring**: Monitor bundle size and load times
- **Documentation**: Keep implementation guidelines updated
- **Authentication testing**: Test all authentication flows thoroughly
- **Role-based testing**: Test both admin and user experiences thoroughly

## Conclusion

These guidelines ensure:
- **Consistency**: Uniform code patterns across the project
- **Maintainability**: Easy to understand and modify code
- **Scalability**: Architecture that grows with the project
- **Quality**: High standards for code and user experience
- **Security**: Best practices for data protection
- **Performance**: Optimized user experience
- **Mobile-first**: Responsive design that works on all devices
- **Build stability**: Reliable build process with proper configuration

Following these guidelines will result in a robust, maintainable, and scalable Optiqo Dashboard application that serves users effectively while providing an excellent development experience across all devices and screen sizes.
