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
 * Returns null if debug mode is disabled or config file doesn't exist
 */
export async function loadDebugConfig(): Promise<DebugConnectionConfig['connection'] | null> {
  try {
    // Check if debug mode is enabled
    const debugEnv = process.env.DEBUG_ENV
    if (!debugEnv || debugEnv.toLowerCase() !== 'true') {
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
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  const debugEnv = process.env.DEBUG_ENV
  return debugEnv && debugEnv.toLowerCase() === 'true'
}

/**
 * Get debug configuration for API responses
 * Returns connection info without sensitive data for debugging
 */
export function getDebugInfo(): Record<string, any> | null {
  if (!isDebugMode()) {
    return null
  }

  return {
    debugMode: true,
    configFile: 'config/debug-connection.json',
    autoFillEnabled: true,
    note: 'Form will be auto-filled with debug configuration'
  }
}
