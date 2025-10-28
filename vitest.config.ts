import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', 'dist'],
    env: {
      DEBUG_ENV: 'true'
    },
    testTimeout: 600000, // 10 minutes
  },
  resolve: {
    alias: {
      '#': resolve(__dirname, '.'),
    }
  }
})
