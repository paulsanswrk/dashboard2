import fs from 'fs'
import path from 'path'

interface DebugConnectionConfig {
  description: string
  version: string
  connection: {
    internalName: string
    databaseName: string
    databaseType: string
    host: string
    username: string
    password: string
    port: string
    jdbcParams: string
    serverTime: string
    useSshTunneling: boolean
    sshAuthMethod: string
    sshPort: string
    sshUser: string
    sshHost: string
    sshPassword: string
    sshPrivateKey: string
    storageLocation: string
  }
  notes: Record<string, string>
}

/**
 * Load debug connection configuration from config file
 * Returns null if not in dev mode or config file doesn't exist
 */
export async function loadDebugConfig(): Promise<DebugConnectionConfig['connection'] | null> {
  try {
    // Only available in development
    if (!import.meta.dev) {
      return null
    }

    // Load debug configuration file
    const configPath = path.join(process.cwd(), 'config', 'debug-connection.json')

    if (!fs.existsSync(configPath)) {
      console.warn('Debug mode enabled but config/debug-connection.json not found')
      return null
    }

    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config: DebugConnectionConfig = JSON.parse(configContent)

    // Validate configuration structure
    if (!config.connection) {
      console.error('Invalid debug configuration: missing connection object')
      return null
    }

    console.log('✅ Debug configuration loaded successfully')
    return config.connection

  } catch (error) {
    console.error('❌ Failed to load debug configuration:', error)
    return null
  }
}

/**
 * Check if debug mode is enabled (dev environment)
 */
export function isDebugMode(): boolean {
  return import.meta.dev
}

/**
 * Get debug configuration for API responses
 * Returns connection info without sensitive data for debugging
 */
export function getDebugInfo(): Record<string, any> | null {
  if (!import.meta.dev) {
    return null
  }

  return {
    debugMode: true,
    configFile: 'config/debug-connection.json',
    autoFillEnabled: true,
    note: 'Form will be auto-filled with debug configuration'
  }
}
