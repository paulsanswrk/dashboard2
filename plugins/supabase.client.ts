export default defineNuxtPlugin(() => {
  // This plugin ensures Supabase is properly initialized
  // The @nuxtjs/supabase module handles the actual initialization
  
  const config = useRuntimeConfig()
  
  // Log configuration for debugging (remove in production)
  if (process.dev) {
    console.log('Supabase URL:', config.public.supabaseUrl ? 'Set' : 'Missing')
    console.log('Supabase Anon Key:', config.public.supabaseAnonKey ? 'Set' : 'Missing')
  }
})
