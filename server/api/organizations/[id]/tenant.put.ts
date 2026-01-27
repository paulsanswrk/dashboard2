// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { organizations, profiles, dataConnections } from '~/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { getOptiqoflowSchema } from '../../../utils/optiqoflowQuery'
import { buildGraph } from '../../../utils/schemaGraph'

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event)
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
        }

        // Get user profile to check role
        const userProfile = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, user.id))
            .limit(1)
            .then(rows => rows[0])

        if (!userProfile) {
            throw createError({
                statusCode: 404,
                statusMessage: 'User profile not found'
            })
        }

        // Only SUPERADMIN can update tenant associations
        if (userProfile.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Access denied. Only superadmins can update tenant associations.'
            })
        }

        // Get organization ID from route
        const organizationId = getRouterParam(event, 'id')
        if (!organizationId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Organization ID is required'
            })
        }

        // Get request body
        const body = await readBody(event)
        const { tenantId } = body

        // Validate tenantId (can be null to unassociate)
        if (tenantId !== null && tenantId !== undefined && typeof tenantId !== 'string') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid tenant ID'
            })
        }

        // If tenantId is provided, verify it exists
        if (tenantId) {
            const { pgClient } = await import('~/lib/db')

            const tenantExists = await pgClient.unsafe(
                'SELECT id FROM optiqoflow.tenants WHERE id = $1',
                [tenantId]
            ) as Array<{ id: string }>

            if (!tenantExists || tenantExists.length === 0) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'Tenant not found'
                })
            }
        }

        // Update organization's tenant_id
        await db
            .update(organizations)
            .set({ tenantId: tenantId || null })
            .where(eq(organizations.id, organizationId))

        // Fetch updated organization
        const updatedOrg = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1)
            .then(rows => rows[0])

        if (!updatedOrg) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Organization not found'
            })
        }

        // Get tenant name if tenant is assigned
        let tenantName = null
        if (updatedOrg.tenantId) {
            const { pgClient } = await import('~/lib/db')

            const tenantResult = await pgClient.unsafe(
                'SELECT name FROM optiqoflow.tenants WHERE id = $1',
                [updatedOrg.tenantId]
            ) as Array<{ name: string }>

            if (tenantResult && tenantResult.length > 0) {
                tenantName = tenantResult[0].name
            }
        }

        // If a tenant was assigned (not removed), auto-create an immutable OptiqoFlow connection
        if (tenantId) {
            try {
                // Check if an OptiqoFlow connection already exists
                const existingConnection = await db
                    .select()
                    .from(dataConnections)
                    .where(eq(dataConnections.organizationId, organizationId))
                    .then(connections => connections.find(c => c.storageLocation === 'optiqoflow'))

                if (!existingConnection) {
                    console.log(`[TENANT_ASSIGN] Creating OptiqoFlow connection for organization ${organizationId}...`)

                    // Get Supabase configuration
                    const supabaseUrl = process.env.SUPABASE_URL
                    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

                    if (!supabaseUrl || !supabaseServiceKey) {
                        console.error('[TENANT_ASSIGN] Missing Supabase configuration')
                    } else {
                        // Create Supabase client with service role (bypasses RLS)
                        const supabase = createClient(supabaseUrl, supabaseServiceKey)

                        const connectionRecord: any = {
                            owner_id: user.id,
                            organization_id: organizationId,
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
                        try {
                            console.log(`[TENANT_ASSIGN] Fetching OptiqoFlow schema...`)
                            const schema = await getOptiqoflowSchema()
                            connectionRecord.schema_json = schema
                            console.log(`[TENANT_ASSIGN] Fetched schema: ${schema.tables.length} tables`)

                            // Build auto_join_info graph
                            const schemaJson = { schema: { tables: schema.tables } }
                            const graph = buildGraph(schemaJson)
                            console.log(`[TENANT_ASSIGN] Built graph with ${graph.nodes.size} nodes`)

                            connectionRecord.auto_join_info = {
                                graph: {
                                    nodes: Array.from(graph.nodes.entries()),
                                    adj: Array.from(graph.adj.entries())
                                }
                            }
                        } catch (schemaError: any) {
                            console.error(`[TENANT_ASSIGN] Failed to fetch schema or build graph:`, schemaError?.message)
                        }

                        const { error: connectionError } = await supabase
                            .from('data_connections')
                            .insert(connectionRecord)

                        if (connectionError) {
                            console.error('[TENANT_ASSIGN] Error creating OptiqoFlow connection:', connectionError)
                            // Don't fail tenant assignment, just log the error
                        } else {
                            console.log(`[TENANT_ASSIGN] Created immutable OptiqoFlow connection for organization ${organizationId}`)
                        }
                    }
                } else {
                    console.log(`[TENANT_ASSIGN] OptiqoFlow connection already exists for organization ${organizationId}, skipping creation`)
                }
            } catch (connError: any) {
                console.error('[TENANT_ASSIGN] Error in OptiqoFlow connection creation:', connError)
                // Don't fail tenant assignment
            }
        }

        return {
            success: true,
            organization: {
                ...updatedOrg,
                tenantName
            },
            message: tenantId
                ? `Organization successfully associated with tenant ${tenantName}`
                : 'Organization tenant association removed'
        }

    } catch (error: any) {
        console.error('Error updating organization tenant:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to update organization tenant'
        })
    }
})
