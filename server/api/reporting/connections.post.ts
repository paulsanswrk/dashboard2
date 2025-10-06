import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody<any>(event)

  // Basic validation
  const required = ['internalName', 'databaseName', 'databaseType', 'host', 'username', 'password', 'port', 'serverTime']
  for (const key of required) {
    if (!body?.[key] || String(body[key]).trim() === '') {
      throw createError({ statusCode: 400, statusMessage: `Missing required field: ${key}` })
    }
  }

  const useSsh = !!body.useSshTunneling

  const record = {
    owner_id: user.id,
    organization_id: null,
    internal_name: String(body.internalName),
    database_name: String(body.databaseName),
    database_type: String(body.databaseType),
    host: String(body.host),
    username: String(body.username),
    password: String(body.password),
    port: Number(body.port),
    jdbc_params: body.jdbcParams ? String(body.jdbcParams) : '',
    server_time: String(body.serverTime),
    use_ssh_tunneling: useSsh,
    ssh_auth_method: useSsh ? (body.sshAuthMethod ? String(body.sshAuthMethod) : null) : null,
    ssh_port: useSsh && body.sshPort ? Number(body.sshPort) : null,
    ssh_user: useSsh ? (body.sshUser ? String(body.sshUser) : null) : null,
    ssh_host: useSsh ? (body.sshHost ? String(body.sshHost) : null) : null,
    ssh_password: useSsh ? (body.sshPassword ? String(body.sshPassword) : null) : null,
    ssh_private_key: useSsh ? (body.sshPrivateKey ? String(body.sshPrivateKey) : null) : null,
    storage_location: body.storageLocation ? String(body.storageLocation) : null
  }

  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .upsert(record, { onConflict: 'owner_id,internal_name' })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, id: data.id }
})


