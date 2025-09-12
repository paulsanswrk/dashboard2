export default defineNuxtRouteMiddleware(async (to, from) => {
  console.log('🛡️ Auth middleware: Checking route:', to.path)
  
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  
  console.log('🛡️ Auth middleware: User state:', user.value?.id)
  
  // If user is not authenticated, redirect to login
  if (!user.value) {
    console.log('🛡️ Auth middleware: No user, redirecting to login')
    return navigateTo('/login')
  }

  console.log('🛡️ Auth middleware: User authenticated:', user.value.id)

  // Validate user exists in database
  try {
    console.log('🛡️ Auth middleware: Validating user profile in database...')
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.value.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found in database - clear session and redirect
        console.warn('❌ Auth middleware: User session exists but profile not found in database:', user.value.id)
        await supabase.auth.signOut()
        return navigateTo('/login')
      } else {
        // Other database error - redirect to login
        console.error('❌ Auth middleware: Error validating user in middleware:', error)
        return navigateTo('/login')
      }
    }
    
    console.log('✅ Auth middleware: User profile validated, allowing access')
    // User exists in database - allow access
    return
  } catch (err) {
    console.error('❌ Auth middleware: Unexpected error during user validation in middleware:', err)
    return navigateTo('/login')
  }
})

// Public routes that don't require authentication
export const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password'
]

// Check if route is public
export const isPublicRoute = (path: string) => {
  return publicRoutes.some(route => path.startsWith(route))
}
