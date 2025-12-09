import type {MySqlConnectionConfig} from './mysqlClient'
import {AuthHelper} from './authHelper'

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
    ssh: data.use_ssh_tunneling ? {
      host: data.ssh_host,
      port: Number(data.ssh_port),
      user: data.ssh_user,
      password: data.ssh_password || undefined,
      privateKey: data.ssh_private_key || undefined
    } : undefined
  }
  return cfg
}


