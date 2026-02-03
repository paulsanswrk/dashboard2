import { defineEventHandler, readBody } from 'h3'
import { supabaseAdmin } from '../supabase'
import { AuthHelper } from '../../utils/authHelper'
import { getOptiqoflowSchema } from '../../utils/optiqoflowQuery'
import { buildGraph } from '../../utils/schemaGraph'

export default defineEventHandler(async (event) => {
  const ctx = await AuthHelper.requireAuthContext(event)
  if (ctx.role === 'VIEWER') {
    throw createError({ statusCode: 403, statusMessage: 'Only Admin/Editor can create connections' })
  }

  const body = await readBody<any>(event)

  // Determine the target organization
  // SUPERADMIN can specify a different organization; ADMIN/EDITOR can only use their own
  let targetOrganizationId = ctx.organizationId
  if (body?.organizationId && typeof body.organizationId === 'string') {
    if (ctx.role === 'SUPERADMIN') {
      targetOrganizationId = body.organizationId
    } else if (body.organizationId !== ctx.organizationId) {
      throw createError({ statusCode: 403, statusMessage: 'You can only create connections for your own organization' })
    }
  }

  if (!targetOrganizationId) {
    throw createError({ statusCode: 400, statusMessage: 'Organization is required to create a connection' })
  }

  // Check if this is an internal data source
  const isInternalSource = body?.databaseType === 'internal'

  // Check if this is a supabase_synced connection (MySQL synced to PostgreSQL)
  const isSyncedStorage = body?.storageLocation === 'supabase_synced'

  // Only SUPERADMIN can create internal data sources
  if (isInternalSource && ctx.role !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Only Superadmin can create internal data sources' })
  }

  // Different validation for internal vs external sources
  if (isInternalSource) {
    // For internal sources, only require the internal name
    if (!body?.internalName || String(body.internalName).trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Missing required field: internalName' })
    }
  } else {
    // For external sources (MySQL), require all connection fields
    const required = ['internalName', 'databaseName', 'databaseType', 'host', 'username', 'password', 'port', 'serverTime']
    for (const key of required) {
      if (!body?.[key] || String(body[key]).trim() === '') {
        throw createError({ statusCode: 400, statusMessage: `Missing required field: ${key}` })
      }
    }
  }

  const useSsh = !isInternalSource && !!body.useSshTunneling

  const record: any = {
    owner_id: ctx.userId, // kept for history; not used for authorization
    organization_id: targetOrganizationId,
    internal_name: String(body.internalName),
    database_name: isInternalSource ? 'optiqoflow' : String(body.databaseName),
    database_type: String(body.databaseType),
    host: isInternalSource ? 'internal' : String(body.host),
    username: isInternalSource ? 'service_role' : String(body.username),
    password: isInternalSource ? 'internal' : String(body.password),
    port: isInternalSource ? 5432 : Number(body.port),
    jdbc_params: body.jdbcParams ? String(body.jdbcParams) : '',
    server_time: isInternalSource ? 'GMT+00:00' : String(body.serverTime),
    use_ssh_tunneling: useSsh,
    ssh_auth_method: useSsh ? (body.sshAuthMethod ? String(body.sshAuthMethod) : null) : null,
    ssh_port: useSsh && body.sshPort ? Number(body.sshPort) : null,
    ssh_user: useSsh ? (body.sshUser ? String(body.sshUser) : null) : null,
    ssh_host: useSsh ? (body.sshHost ? String(body.sshHost) : null) : null,
    ssh_password: useSsh ? (body.sshPassword ? String(body.sshPassword) : null) : null,
    ssh_private_key: useSsh ? (body.sshPrivateKey ? String(body.sshPrivateKey) : null) : null,
    storage_location: isInternalSource ? 'optiqoflow' : (body.storageLocation ? String(body.storageLocation) : 'external'),
    // Set DBMS version: PostgreSQL 15 for internal/synced, null for external MySQL
    dbms_version: (isInternalSource || isSyncedStorage) ? 'PostgreSQL 15' : null
  }

  // For internal sources, auto-fetch schema with FK relationships from table_relationships
  // For external sources, use provided schema if available
  if (isInternalSource) {
    console.log(`[AUTO_JOIN] Internal source - auto-fetching optiqoflow schema with FKs for ${body.internalName}`)
    try {
      const schema = await getOptiqoflowSchema()
      record.schema_json = schema
      console.log(`[AUTO_JOIN] Fetched optiqoflow schema: ${schema.tables.length} tables`)

      // Count FKs for logging
      const fkCount = schema.tables.reduce((sum, t) => sum + (t.foreignKeys?.length || 0), 0)
      console.log(`[AUTO_JOIN] Schema contains ${fkCount} foreign key relationships`)

      // Build auto_join_info graph
      try {
        const schemaJson = { schema: { tables: schema.tables } }
        const graph = buildGraph(schemaJson)
        console.log(`[AUTO_JOIN] Built graph with ${graph.nodes.size} nodes for internal connection`)

        record.auto_join_info = {
          graph: {
            nodes: Array.from(graph.nodes.entries()),
            adj: Array.from(graph.adj.entries())
          }
        }
      } catch (graphError: any) {
        console.error(`[AUTO_JOIN] Failed to build graph for internal connection: ${graphError?.message}`)
      }
    } catch (schemaError: any) {
      console.error(`[AUTO_JOIN] Failed to fetch optiqoflow schema: ${schemaError?.message}`)
    }
  } else if (body.schema && typeof body.schema === 'object') {
    // Allow optional schema payload to be persisted at creation time for external sources
    console.log(`[AUTO_JOIN] Schema provided during connection creation for ${body.internalName}, storing schema_json`)
    record.schema_json = body.schema
    console.log(`[AUTO_JOIN] Schema contains ${body.schema.tables?.length || 0} tables`)
  } else {
    console.log(`[AUTO_JOIN] No schema provided during connection creation for ${body.internalName}`)
  }

  console.log(`[AUTO_JOIN] Creating new connection: ${body.internalName} (${isInternalSource ? 'internal data source' : `${body.databaseName} on ${body.host}:${body.port}`})`)

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


