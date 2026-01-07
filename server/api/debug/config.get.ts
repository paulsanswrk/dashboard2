import { loadDebugConfig, isDebugMode } from '~/server/utils/debugConfig.dev'

export default defineEventHandler(async (event) => {
  try {
    // Only allow debug config in development
    if (!import.meta.dev) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Debug configuration is only available in development mode'
      })
    }

    if (!isDebugMode()) {
      return {
        enabled: false,
        message: 'Debug mode is not enabled in development.'
      }
    }

    const debugConfig = await loadDebugConfig()

    if (!debugConfig) {
      return {
        enabled: true,
        config: null,
        message: 'Debug mode enabled but no configuration found'
      }
    }

    return {
      enabled: true,
      config: debugConfig,
      message: 'Debug configuration loaded successfully'
    }

  } catch (error: any) {
    console.error('Debug config API error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to load debug configuration'
    })
  }
})
