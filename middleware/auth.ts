// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/dashboards/preview',
  '/auth/callback',
  '/render'
]

// Check if route is public
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some(route => path.startsWith(route))
}

export default defineNuxtRouteMiddleware(async (to, from) => {
  // console.log('🛡️ Auth middleware: Checking route:', to.path)

  // Check if route is public
  if (isPublicRoute(to.path)) {
    // console.log('🛡️ Auth middleware: Public route, allowing access')
    return
  }

  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // If user is not authenticated, redirect to login
  if (!user.value) {
    console.log(`🛡️ Auth middleware: No user, redirecting to login from path: ${to.path}`)
    return navigateTo('/login')
  }

  // Validate user exists in database and get role
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', user.value.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('❌ Auth middleware: User profile not found, signing out:', user.value.id)
        await supabase.auth.signOut()
        return navigateTo('/login')
      } else {
        console.error('❌ Auth middleware: Error validating user profile:', error)
        return navigateTo('/login')
      }
    }

    // Import redirect utilities
    const { canAccessPath, getFallbackPath } = await import('~/server/utils/redirectUtils')

    // Check if user can access the requested path
    if (!canAccessPath(profile.role, to.path)) {
      console.log(`🛡️ Auth middleware: User ${user.value.id} (${profile.role}) cannot access ${to.path}, redirecting`)
      const fallbackPath = getFallbackPath(profile.role, to.path)
      return navigateTo(fallbackPath)
    }

    return
  } catch (err) {
    console.error('❌ Auth middleware: Unexpected error during validation:', err)
    return navigateTo('/login')
  }
})
