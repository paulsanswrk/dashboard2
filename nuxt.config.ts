// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // Vercel optimization
  nitro: {
    preset: 'vercel'
  },

  // Build configuration for Vercel
  ssr: true,
  
  // App configuration
  app: {
    head: {
      title: 'Hello World - Nuxt 4',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A simple Hello World Nuxt 4 app' }
      ]
    }
  }
})
