// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: {enabled: true},
    compatibilityDate: '2025-09-10',

    // Exclude docs directory from file watching
    ignore: ['docs/**'],

    // Modules
    modules: [
        '@nuxt/ui',
        '@nuxtjs/tailwindcss',
        '@vueuse/nuxt',
        '@nuxt/icon',
        '@nuxtjs/supabase'
    ],


    // Global CSS
    css: ['~/assets/css/main.css'],


    // Supabase Configuration
    supabase: {
        redirectOptions: {
            login: '/login',
            callback: '/auth/callback',
            exclude: ['/', '/login', '/signup', '/forgot-password', '/reset-password',
                '/auth/callback', '/render/**']
        },
        // Explicitly set the URL and key
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
    },

    // Runtime Config for environment variables
    runtimeConfig: {
        public: {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
            siteUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000',
            debugEnv: process.env.DEBUG_ENV || 'false',
        },
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        renderSecretToken: process.env.RENDER_SECRET_TOKEN,
    },

    // UI Configuration
    ui: {
        global: true,
        icons: ['heroicons'],
        primary: 'orange'
    },

    // Color Mode Configuration
    colorMode: {
        preference: 'light', // default value of $colorMode.preference
        fallback: 'light', // fallback value if not set
        hid: 'nuxt-color-mode-script',
        globalName: '__NUXT_COLOR_MODE__',
        componentName: 'ColorScheme',
        classPrefix: '',
        classSuffix: '',
        storageKey: 'nuxt-color-mode'
    },

    // CSS
    css: ['~/assets/css/main.css'],

    // PostCSS Configuration
    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {}
        }
    },

    // Vite configuration
    vite: {
        optimizeDeps: {
            include: []
        },
        ssr: {
            noExternal: ['@headlessui/vue'],
        },
        server: {
            watch: {
                ignored: ['**/node_modules/**', '**/node-scripts/**', '**/.git/**', '**/.nuxt/**', '**/dist/**', '**/docs/**']
            }
        }

    },

    build: {
        transpile: ['@headlessui/vue'],
    },

    // Nitro configuration
    nitro: {
        preset: 'vercel',
        experimental: {
            wasm: true
        }
    },

    // Build configuration for Vercel
    ssr: true,

    // App configuration
    app: {
        head: {
            title: 'Optiqo Dashboard',
            meta: [
                {charset: 'utf-8'},
                {name: 'viewport', content: 'width=device-width, initial-scale=1'},
                {name: 'description', content: 'Optiqo - A robust business intelligence and data visualization platform'},
                {name: 'theme-color', content: '#F28C28'},
                {property: 'og:title', content: 'Optiqo Dashboard'},
                {property: 'og:description', content: 'A robust business intelligence and data visualization platform'},
                {property: 'og:image', content: '/images/optiqo_152x152.png'},
                {name: 'twitter:card', content: 'summary'},
                {name: 'twitter:image', content: '/images/optiqo_152x152.png'}
            ],
            link: [
                {rel: 'icon', type: 'image/png', href: '/images/optiqo_32x32.png', sizes: '32x32'},
                {rel: 'icon', type: 'image/png', href: '/images/optiqo_64x64.png', sizes: '64x64'},
                {rel: 'apple-touch-icon', type: 'image/png', href: '/images/optiqo_152x152.png', sizes: '152x152'},
                {rel: 'shortcut icon', href: '/images/optiqo_32x32.png'}
            ]
        }
    }
})
