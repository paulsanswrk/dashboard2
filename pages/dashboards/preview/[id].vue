<template>

  <!-- Password Prompt -->
  <div v-if="showPasswordPrompt" class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div class="mb-6 text-center">
        <svg class="mx-auto h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">Password Required</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-6 text-center">This dashboard is password protected. Please enter the password to continue.</p>

      <form @submit.prevent="verifyPassword" class="space-y-4">
        <UFormField label="Password" :error="passwordError">
          <UInput
              v-model="enteredPassword"
              type="password"
              placeholder="Enter password"
              required
              :disabled="verifying"
              class="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              @input="passwordError = ''"
          />
        </UFormField>

        <UButton
            type="submit"
            color="orange"
            variant="solid"
            size="lg"
            class="w-full cursor-pointer hover:bg-orange-600 transition-colors duration-200 !block text-center"
            :disabled="!enteredPassword || verifying"
            :loading="verifying"
        >
          {{ verifying ? 'Verifying...' : 'Access Dashboard' }}
        </UButton>
      </form>

      <div class="mt-6 text-center">
        <NuxtLink
            to="/"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Sign In
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <div class="mb-6">
        <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{{ error.title }}</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-6">{{ error.message }}</p>
      <div class="space-y-3">
        <NuxtLink
            to="/login"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign In to View
        </NuxtLink>
        <br>
        <NuxtLink
            to="/"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Go to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
  <Dashboard
      v-else
      device="desktop"
      :layout="pixelLayout"
      :widgets="widgets"
      :loading="loading"
      :preview="true"
      :dashboard-width="dashboardWidth"
  />
</template>

<script setup lang="ts">
import { DASHBOARD_WIDTH } from '~/lib/dashboard-constants'

definePageMeta({
  layout: 'empty'
})

const route = useRoute()
const id = computed(() => String(route.params.id))

// reCAPTCHA composable
const {execute} = useRecaptcha()

// Set page title
useHead({
  title: 'Preview Dashboard'
})

const {getDashboardPreview} = useDashboardsService()

const widgets = ref<Array<{ widgetId: string; type: string; chartId?: number; name?: string; position: any; state?: any; preloadedColumns?: any[]; preloadedRows?: any[] }>>([])
const pixelLayout = ref<any[]>([])
const dashboardWidth = ref<number>(DASHBOARD_WIDTH)
const loading = ref(true)
const error = ref<{ title: string; message: string } | null>(null)
const showPasswordPrompt = ref(false)
const enteredPassword = ref('')
const verifying = ref(false)
const passwordError = ref('')
const dashboardData = ref<any>(null)

/**
 * Build pixel-based layout from widget positions
 * The position data is stored as {left, top, width, height} in the database
 */
function buildLayoutFromWidgets() {
  pixelLayout.value = widgets.value.map(w => ({
    left: w.position?.left ?? 0,
    top: w.position?.top ?? 0,
    width: w.position?.width ?? 400,
    height: w.position?.height ?? 240,
    i: w.widgetId
  }))
}

async function load() {
  loading.value = true
  error.value = null
  showPasswordPrompt.value = false
  enteredPassword.value = ''
  passwordError.value = ''

  try {
    // Get auth token from cookie if it exists
    const passwordCookie = useCookie(`dashboard_${id.value}_auth`)
    const authToken = passwordCookie.value

    // Single API call that handles all authentication and returns data or auth requirement
    const params: any = {}
    if (authToken) {
      params.authToken = authToken
    }

    const res = await $fetch(`/api/dashboards/${id.value}/preview`, {params})

    // Check if password is required
    if (res.requiresPassword) {
      showPasswordPrompt.value = true
      loading.value = false
      return
    }

    // Dashboard data is available, load it
    await loadDashboardFromResponse(res)
  } catch (err: any) {
    console.error('Error loading dashboard preview:', err)

    // Handle different error types
    if (err?.statusCode === 403 || err?.status === 403) {
      error.value = {
        title: 'Access Denied',
        message: 'This dashboard is private and requires authentication to view. Please sign in to continue.'
      }
    } else if (err?.statusCode === 404 || err?.status === 404) {
      error.value = {
        title: 'Dashboard Not Found',
        message: 'The dashboard you\'re looking for doesn\'t exist or has been removed.'
      }
    } else {
      error.value = {
        title: 'Unable to Load Dashboard',
        message: 'An error occurred while loading the dashboard. Please try again later.'
      }
    }
    loading.value = false
  }
}

async function loadDashboardFromResponse(res: any) {
  // Flatten all widgets from all tabs
  const allWidgets: any[] = []
  for (const tab of res.tabs || []) {
    for (const widget of tab.widgets || []) {
      allWidgets.push(widget)
    }
  }

  widgets.value = allWidgets.map((w: any) => ({
    widgetId: w.widgetId,
    type: w.type,
    chartId: w.type === 'chart' ? w.chartId : undefined,
    name: w.name,
    position: w.position,
    state: w.state,
    preloadedColumns: w.data?.columns,
    preloadedRows: w.data?.rows
  }))
  buildLayoutFromWidgets()
  loading.value = false
}

async function verifyPassword() {
  if (!enteredPassword.value.trim()) return

  verifying.value = true
  passwordError.value = ''

  try {
    // Execute reCAPTCHA
    const recaptchaToken = await execute('dashboard_access')
    if (!recaptchaToken) {
      throw new Error('reCAPTCHA verification failed. Please try again.')
    }

    // Call password verification API to get auth token
    const response = await $fetch(`/api/dashboards/${id.value}/verify-password`, {
      method: 'POST',
      body: {
        password: enteredPassword.value,
        recaptchaToken
      }
    })

    if (response.success && response.authToken) {
      // Password is correct, store authentication cookie
      const passwordCookie = useCookie(`dashboard_${id.value}_auth`, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      passwordCookie.value = response.authToken

      // Now load the dashboard with the auth token
      const dashboardRes = await $fetch(`/api/dashboards/${id.value}/preview`, {
        params: {authToken: response.authToken}
      })

      showPasswordPrompt.value = false
      await loadDashboardFromResponse(dashboardRes)
    } else {
      // Password is incorrect
      passwordError.value = 'Incorrect password. Please try again.'
      enteredPassword.value = ''
    }
  } catch (err: any) {
    console.error('Error verifying password:', err)
    passwordError.value = 'Failed to verify password. Please try again.'
    enteredPassword.value = ''
  } finally {
    verifying.value = false
  }
}


onMounted(() => {
  // Ensure this runs on client side
  nextTick(() => {
    load()
  })
})
</script>
