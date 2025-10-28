export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only check debug middleware for routes that start with /debug
  if (!to.path.startsWith('/debug')) {
    return
  }

  // Check if debug mode is enabled
  const config = useRuntimeConfig()
  const debugEnv = config.public.debugEnv
  const isDebugEnabled = debugEnv && debugEnv.toLowerCase() === 'true'

  if (!isDebugEnabled) {
    console.log('🚫 Debug middleware: Debug mode not enabled, redirecting from:', to.path)

    // In development, throw a 404 error to effectively hide the page
    // In production builds, these pages won't exist anyway due to prerendering
    throw createError({
      statusCode: 404,
      statusMessage: 'Page not found'
    })
  }

  console.log('✅ Debug middleware: Debug mode enabled, allowing access to:', to.path)
})
