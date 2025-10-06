import { defineEventHandler, readBody } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'

type DemoConnection = {
  connection?: {
    internalName?: string
    databaseName?: string
    databaseType?: string
    host?: string
    username?: string
    password?: string
    port?: string | number
    jdbcParams?: string
    serverTime?: string
    useSshTunneling?: boolean
    sshAuthMethod?: string
    sshPort?: string | number
    sshUser?: string
    sshHost?: string
    sshPassword?: string
    sshPrivateKey?: string
    storageLocation?: string
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody<{ id?: string; filename?: string }>(event)
  const id = (body?.id || body?.filename || '').toString().trim()
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing demo id' })

  const filename = id.endsWith('.json') ? id : `${id}.json`
  const fullPath = path.join(process.cwd(), 'docs', 'examples', 'connections', filename)

  let parsed: DemoConnection
  try {
    const raw = await fs.readFile(fullPath, 'utf-8')
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Demo file not found' })
  }

  const c = parsed.connection || {}
  const internalName = (c.internalName || 'Imported Demo Connection').toString()

  const record = {
    owner_id: user.id,
    organization_id: null,
    internal_name: internalName,
    database_name: c.databaseName || '',
    database_type: c.databaseType || 'mysql',
    host: c.host || '',
    username: c.username || '',
    password: c.password || '',
    port: Number(c.port || 0) || 3306,
    jdbc_params: c.jdbcParams || '',
    server_time: c.serverTime || '',
    use_ssh_tunneling: !!c.useSshTunneling,
    ssh_auth_method: c.sshAuthMethod || null,
    ssh_port: c.sshPort ? Number(c.sshPort) : null,
    ssh_user: c.sshUser || null,
    ssh_host: c.sshHost || null,
    ssh_password: c.sshPassword || null,
    ssh_private_key: c.sshPrivateKey || null,
    storage_location: c.storageLocation || null
  }

  // Upsert by unique (owner_id, internal_name)
  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .upsert(record, { onConflict: 'owner_id,internal_name' })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, connectionId: data.id }
})


