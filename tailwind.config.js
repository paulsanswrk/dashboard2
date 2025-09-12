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
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'heading': ['Barlow', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'logo': ['Barlow', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif']
      },
      colors: {
        // Primary brand color - warm orange from page example
        primary: {
          DEFAULT: '#F28C28',
          foreground: '#ffffff',
          50: '#fef7ed',
          100: '#fdedd3',
          200: '#fbd7a5',
          300: '#f8b86d',
          400: '#f59232',
          500: '#F28C28',
          600: '#e3730f',
          700: '#bc5a0a',
          800: '#96480e',
          900: '#7a3c0f'
        },
        // Dark theme colors from modal example
        dark: {
          DEFAULT: '#222222',
          light: '#363636',
          lighter: '#595959',
          foreground: '#ffffff'
        },
        // Secondary colors
        secondary: {
          DEFAULT: '#64748b',
          foreground: '#ffffff'
        },
        // Status colors
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff'
        },
        info: {
          DEFAULT: '#06b6d4',
          foreground: '#ffffff'
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff'
        },
        error: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff'
        },
        // Neutral grays for the dark theme
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717'
        }
      }
    }
  },
  plugins: []
}
