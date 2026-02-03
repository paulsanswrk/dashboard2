import type { MySqlConnectionConfig } from './mysqlClient'
import { AuthHelper } from './authHelper'

/**
 * SSH configuration for tunneled connections
 */
export interface SshConfig {
  host: string
  port: number
  user: string
  password?: string
  privateKey?: string
}

/**
 * Build SSH config from connection data
 * Returns undefined if SSH tunneling is not enabled
 */
export function buildSshConfig(data: {
  use_ssh_tunneling?: boolean
  ssh_host?: string
  ssh_port?: number | string
  ssh_user?: string
  ssh_password?: string | null
  ssh_private_key?: string | null
}): SshConfig | undefined {
  if (!data.use_ssh_tunneling) {
    return undefined
  }
  return {
    host: data.ssh_host || '',
    port: Number(data.ssh_port) || 22,
    user: data.ssh_user || '',
    password: data.ssh_password || undefined,
    privateKey: data.ssh_private_key || undefined
  }
}

/**
 * Check if connection is an internal data source (OptiqoFlow)
 * Internal sources use database_type='internal' vs external MySQL
 */
export function isInternalDataSource(connection: { database_type?: string; databaseType?: string } | null | undefined): boolean {
  return connection?.database_type === 'internal' || connection?.databaseType === 'internal'
}

/**
 * Check if connection is immutable (system-managed, cannot be deleted)
 * Typically used for auto-created OptiqoFlow connections
 */
export function isImmutableConnection(connection: { is_immutable?: boolean; isImmutable?: boolean } | null | undefined): boolean {
  return connection?.is_immutable === true || connection?.isImmutable === true
}

export async function loadConnectionConfigFromSupabase(event: any, connectionId: number): Promise<MySqlConnectionConfig> {
  const data = await AuthHelper.requireConnectionAccess(event, connectionId, {
    columns: `id, organization_id, host, port, username, password, database_name,
              use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key`
  })

  const cfg: MySqlConnectionConfig = {
    host: data.host,
    port: Number(data.port),
    user: data.username,
    password: data.password,
    database: data.database_name,
    useSshTunneling: !!data.use_ssh_tunneling,
    ssh: buildSshConfig(data)
  }
  return cfg
}
