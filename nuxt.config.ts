// https://nuxt.com/docs/api/configuration/nuxt-config

// Check if recaptcha is enabled
const enableRecaptcha = process.env.ENABLE_RECAPTCHA !== 'false'

export default defineNuxtConfig({
    devtools: { enabled: true },
    compatibilityDate: '2025-09-10',

    // Exclude docs directory from file watching
    ignore: ['docs/**'],

    // Modules - conditionally include recaptcha
    modules: [
        '@nuxt/ui',
        '@vueuse/nuxt',
        '@nuxt/icon',
        '@nuxtjs/supabase',
        ...(enableRecaptcha ? ['nuxt-recaptcha'] : [])
    ],


    // Supabase Configuration
    supabase: {
        redirectOptions: {
            login: '/login',
            callback: '/auth/callback',
            exclude: ['/', '/login', '/signup', '/forgot-password', '/reset-password',
                '/auth/callback', '/render/**', '/dashboards/preview/**']
        },
        // Explicitly set the URL and key
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
    },

    // reCAPTCHA Configuration (only used if module is enabled)
    ...(enableRecaptcha ? {
        recaptcha: {
            siteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY,
            version: 'v3'
        }
    } : {}),

    // Runtime Config for environment variables
    runtimeConfig: {
        public: {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
            siteUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000',
            debugEnv: process.env.DEBUG_ENV || 'false',
            enableRecaptcha: process.env.ENABLE_RECAPTCHA !== 'false',
        },
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        private: {
            recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY
        }
    },

    // UI Configuration
    ui: {
        global: true,
        primary: 'orange',
        // Disable Tailwind CSS processing to avoid Windows path issues
        tailwind: {
            viewer: false
        }
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

    // Vite configuration
    vite: {
        optimizeDeps: {
            include: []
        },
        ssr: {
            noExternal: ['@headlessui/vue', '@supabase/supabase-js'],
        },
        server: {
            watch: {
                ignored: ['**/node_modules/**', '**/node-scripts/**', '**/.git/**', '**/.nuxt/**', '**/dist/**', '**/docs/**']
            }
        },
        resolve: {
            alias: {
                // Ensure paths are resolved correctly on Windows
            },
            extensionAlias: {
                '.js': ['.js', '.ts', '.tsx'],
            }
        }
    },

    build: {
        transpile: ['@headlessui/vue', '@supabase/supabase-js'],
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
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'description', content: 'Optiqo - A robust business intelligence and data visualization platform' },
                { name: 'theme-color', content: '#F28C28' },
                { property: 'og:title', content: 'Optiqo Dashboard' },
                { property: 'og:description', content: 'A robust business intelligence and data visualization platform' },
                { property: 'og:image', content: '/images/optiqo_152x152.png' },
                { name: 'twitter:card', content: 'summary' },
                { name: 'twitter:image', content: '/images/optiqo_152x152.png' }
            ],
            link: [
                { rel: 'icon', type: 'image/png', href: '/images/optiqo_32x32.png', sizes: '32x32' },
                { rel: 'icon', type: 'image/png', href: '/images/optiqo_64x64.png', sizes: '64x64' },
                { rel: 'apple-touch-icon', type: 'image/png', href: '/images/optiqo_152x152.png', sizes: '152x152' },
                { rel: 'shortcut icon', href: '/images/optiqo_32x32.png' }
            ]
        }
    }
})
