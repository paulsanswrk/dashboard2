/**
 * Dev-only MySQL client helpers
 * Uses debug config for zero-config connections during local development
 */
import { loadDebugConfig } from './debugConfig.dev'
import { withMySqlConnectionConfig, type MySqlConnectionConfig } from './mysqlClient'

// Re-export production exports
export { withMySqlConnectionConfig, type MySqlConnectionConfig } from './mysqlClient'

/**
 * Load MySQL config from debug-connection.json (dev only)
 */
async function loadConfig(): Promise<MySqlConnectionConfig> {
    const debug = await loadDebugConfig()
    if (!debug) {
        throw new Error('MySQL connection config not found. Ensure config/debug-connection.json exists.')
    }
    return {
        host: debug.host,
        port: parseInt(debug.port, 10),
        user: debug.username,
        password: debug.password,
        database: debug.databaseName,
        useSshTunneling: !!debug.useSshTunneling,
        ssh: debug.useSshTunneling ? {
            host: debug.sshHost,
            port: parseInt(debug.sshPort, 10),
            user: debug.sshUser,
            password: debug.sshPassword || undefined,
            privateKey: debug.sshPrivateKey || undefined
        } : undefined
    }
}

/**
 * Execute a function with a MySQL connection using debug config (dev only)
 */
export async function withMySqlConnection<T>(fn: (conn: any) => Promise<T>): Promise<T> {
    const cfg = await loadConfig()
    return withMySqlConnectionConfig(cfg, fn)
}
