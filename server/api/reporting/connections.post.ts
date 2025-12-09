import {defineEventHandler, readBody} from 'h3'
import {supabaseAdmin} from '../supabase'
import {AuthHelper} from '../../utils/authHelper'

export default defineEventHandler(async (event) => {
    const ctx = await AuthHelper.requireAuthContext(event)
    if (ctx.role === 'VIEWER') {
        throw createError({statusCode: 403, statusMessage: 'Only Admin/Editor can create connections'})
    }
    if (!ctx.organizationId) {
        throw createError({statusCode: 400, statusMessage: 'Organization is required to create a connection'})
    }

  const body = await readBody<any>(event)

  // Basic validation
  const required = ['internalName', 'databaseName', 'databaseType', 'host', 'username', 'password', 'port', 'serverTime']
  for (const key of required) {
    if (!body?.[key] || String(body[key]).trim() === '') {
      throw createError({ statusCode: 400, statusMessage: `Missing required field: ${key}` })
    }
  }

  const useSsh = !!body.useSshTunneling

  const record: any = {
      owner_id: ctx.userId, // kept for history; not used for authorization
      organization_id: ctx.organizationId,
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

  // Allow optional schema payload to be persisted at creation time
  if (body.schema && typeof body.schema === 'object') {
    console.log(`[AUTO_JOIN] Schema provided during connection creation for ${body.internalName}, storing schema_json`)
    record.schema_json = body.schema
    console.log(`[AUTO_JOIN] Schema contains ${body.schema.tables?.length || 0} tables`)
  } else {
    console.log(`[AUTO_JOIN] No schema provided during connection creation for ${body.internalName}`)
  }

  console.log(`[AUTO_JOIN] Creating new connection: ${body.internalName} (${body.databaseName} on ${body.host}:${body.port})`)

  // Check if connection with same name already exists
  const { data: existingConnection, error: checkError } = await supabaseAdmin
    .from('data_connections')
      .select('id, internal_name, host, port, database_name, organization_id')
      .eq('organization_id', ctx.organizationId)
    .eq('internal_name', record.internal_name)
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw createError({ statusCode: 500, statusMessage: `Error checking existing connections: ${checkError.message}` })
  }

  const isExistingConnection = !!existingConnection
  console.log(`[AUTO_JOIN] Connection check:`, {
    name: record.internal_name,
    isExisting: isExistingConnection,
    existingId: existingConnection?.id,
    existingHost: existingConnection?.host,
    existingPort: existingConnection?.port,
    existingDatabase: existingConnection?.database_name
  })

    let data
    let error

    if (isExistingConnection && existingConnection?.id) {
        const updateResult = await supabaseAdmin
            .from('data_connections')
            .update(record)
            .eq('id', existingConnection.id)
            .eq('organization_id', ctx.organizationId)
            .select('id, internal_name, created_at')
            .single()
        data = updateResult.data
        error = updateResult.error
    } else {
        const insertResult = await supabaseAdmin
            .from('data_connections')
            .insert(record)
            .select('id, internal_name, created_at')
            .single()
        data = insertResult.data
        error = insertResult.error
    }

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (data?.id) {
    if (isExistingConnection) {
      console.log(`[AUTO_JOIN] Returned existing connection ${data.id} for ${body.internalName}`)
      // Check if the existing connection has the same configuration
      const configMatches = existingConnection &&
        existingConnection.host === record.host &&
        existingConnection.port === record.port &&
        existingConnection.database_name === record.database_name

      return {
        success: true,
        id: data.id,
        isExisting: true,
        configMatches,
        message: configMatches
          ? 'Connection already exists with same configuration'
          : 'Connection name already exists but with different configuration - updated with new settings'
      }
    } else {
      console.log(`[AUTO_JOIN] Successfully created new connection ${data.id} for ${body.internalName}`)
      return {
        success: true,
        id: data.id,
        isExisting: false,
        message: 'New connection created successfully'
      }
    }
  }

  throw createError({ statusCode: 500, statusMessage: 'Failed to create or retrieve connection' })
})


