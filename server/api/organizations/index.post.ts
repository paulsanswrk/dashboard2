import { createClient } from '@supabase/supabase-js'
import { getOptiqoflowSchema } from '../../utils/optiqoflowQuery'
import { buildGraph } from '../../utils/schemaGraph'

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Missing Supabase configuration'
      }
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: 'Authorization header required'
      }
    }

    // Extract token from "Bearer <token>"
    const token = authorization.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }

    const body = await readBody(event)
    const { name } = body

    if (!name) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Organization name is required'
      }
    }

    // Check if user is admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (profileData.role !== 'ADMIN' && profileData.role !== 'SUPERADMIN') {
      setResponseStatus(event, 403)
      return {
        success: false,
        error: 'Only admins can create organizations'
      }
    }

    // Create organization
    // Only SUPERADMIN can set tenant_id
    const insertData: { name: string; created_by: string; tenant_id?: string } = {
      name,
      created_by: user.id
    }

    if (body.tenantId && profileData.role === 'SUPERADMIN') {
      insertData.tenant_id = body.tenantId
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: `Failed to create organization: ${error.message}`
      }
    }

    // If organization is linked to a tenant, auto-create an immutable OptiqoFlow connection
    if (insertData.tenant_id && organization.id) {
      try {
        const connectionRecord: any = {
          owner_id: user.id,
          organization_id: organization.id,
          internal_name: 'OptiqoFlow Data',
          database_name: 'optiqoflow',
          database_type: 'postgresql',
          storage_location: 'optiqoflow',
          host: 'internal',
          username: 'service_role',
          password: 'internal',
          port: 5432,
          server_time: 'GMT+00:00',
          dbms_version: 'PostgreSQL 15',
          is_immutable: true
        }

        // Auto-fetch schema and build auto_join_info
        console.log(`[ORG_CREATE] Fetching OptiqoFlow schema for new connection...`)
        try {
          const schema = await getOptiqoflowSchema()
          connectionRecord.schema_json = schema
          console.log(`[ORG_CREATE] Fetched schema: ${schema.tables.length} tables`)

          // Build auto_join_info graph
          const schemaJson = { schema: { tables: schema.tables } }
          const graph = buildGraph(schemaJson)
          console.log(`[ORG_CREATE] Built graph with ${graph.nodes.size} nodes`)

          connectionRecord.auto_join_info = {
            graph: {
              nodes: Array.from(graph.nodes.entries()),
              adj: Array.from(graph.adj.entries())
            }
          }
        } catch (schemaError: any) {
          console.error(`[ORG_CREATE] Failed to fetch schema or build graph:`, schemaError?.message)
        }

        const { error: connectionError } = await supabase
          .from('data_connections')
          .insert(connectionRecord)

        if (connectionError) {
          console.error('Error creating OptiqoFlow connection:', connectionError)
          // Don't fail org creation, just log the error
        } else {
          console.log(`Created immutable OptiqoFlow connection for organization ${organization.id}`)
        }
      } catch (connError: any) {
        console.error('Error creating OptiqoFlow connection:', connError)
        // Don't fail org creation
      }
    }

    return {
      success: true,
      organization
    }

  } catch (error: any) {
    console.error('Create organization error:', error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
