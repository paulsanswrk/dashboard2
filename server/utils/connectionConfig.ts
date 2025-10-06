import { supabaseAdmin } from '../api/supabase'
import type { MySqlConnectionConfig } from './mysqlClient'
import { serverSupabaseUser } from '#supabase/server'

export async function loadConnectionConfigFromSupabase(event: any, connectionId: number): Promise<MySqlConnectionConfig> {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('owner_id', user.id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Connection not found' })

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


