// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { organizations, profiles, dataConnections } from '~/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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

        // Fetch organization details first (before update) to check for tenant changes
        const organization = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1)
            .then(rows => rows[0])

        if (!organization) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Organization not found'
            })
        }

        const oldTenantId = organization.tenantId
        const newTenantId = tenantId || null

        // Determine the type of change
        const isAssigning = !oldTenantId && newTenantId
        const isUnassigning = oldTenantId && !newTenantId
        const isChanging = oldTenantId && newTenantId && oldTenantId !== newTenantId

        // Update organization's tenant_id
        await db
            .update(organizations)
            .set({ tenantId: newTenantId })
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

        // Manage OptiqoFlow immutable connection based on the type of change
        try {
            // Check for existing OptiqoFlow connection
            const existingConnection = await db
                .select()
                .from(dataConnections)
                .where(and(
                    eq(dataConnections.organizationId, organizationId),
                    eq(dataConnections.storageLocation, 'optiqoflow'),
                    eq(dataConnections.isImmutable, true)
                ))
                .limit(1)
                .then(rows => rows[0])

            // Get Supabase configuration
            const supabaseUrl = process.env.SUPABASE_URL
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

            if (!supabaseUrl || !supabaseServiceKey) {
                console.error('[TENANT_MANAGE] Missing Supabase configuration')
            } else {
                const supabase = createClient(supabaseUrl, supabaseServiceKey)

                if (isUnassigning && existingConnection) {
                    // SCENARIO 1: Tenant being unassigned - delete the immutable connection
                    console.log(`[TENANT_UNASSIGN] Deleting OptiqoFlow connection (id: ${existingConnection.id}) for organization ${organizationId}`)

                    const { error: deleteError } = await supabase
                        .from('data_connections')
                        .delete()
                        .eq('id', existingConnection.id)

                    if (deleteError) {
                        console.error('[TENANT_UNASSIGN] Error deleting OptiqoFlow connection:', deleteError)
                    } else {
                        console.log(`[TENANT_UNASSIGN] Successfully deleted OptiqoFlow connection`)
                    }

                } else if (isChanging && existingConnection) {
                    // SCENARIO 2: Tenant being changed - update the existing connection
                    console.log(`[TENANT_CHANGE] Updating OptiqoFlow connection (id: ${existingConnection.id}) for organization ${organizationId}`)
                    console.log(`[TENANT_CHANGE] Changing from tenant ${oldTenantId} to ${newTenantId}`)

                    // Fetch updated schema and graph for the new tenant
                    let updatedSchema = null
                    let updatedAutoJoinInfo = null

                    try {
                        console.log(`[TENANT_CHANGE] Fetching OptiqoFlow schema for new tenant...`)
                        const schema = await getOptiqoflowSchema(newTenantId)
                        updatedSchema = schema
                        console.log(`[TENANT_CHANGE] Fetched schema: ${schema.tables.length} tables`)

                        // Build auto_join_info graph
                        const schemaJson = { schema: { tables: schema.tables } }
                        const graph = buildGraph(schemaJson)
                        console.log(`[TENANT_CHANGE] Built graph with ${graph.nodes.size} nodes`)

                        updatedAutoJoinInfo = {
                            graph: {
                                nodes: Array.from(graph.nodes.entries()),
                                adj: Array.from(graph.adj.entries())
                            }
                        }
                    } catch (schemaError: any) {
                        console.error(`[TENANT_CHANGE] Failed to fetch schema or build graph:`, schemaError?.message)
                    }

                    // Update the connection with new schema and auto_join_info
                    const updateData: any = {
                        updated_at: new Date().toISOString()
                    }

                    if (updatedSchema) {
                        updateData.schema_json = updatedSchema
                    }

                    if (updatedAutoJoinInfo) {
                        updateData.auto_join_info = updatedAutoJoinInfo
                    }

                    const { error: updateError } = await supabase
                        .from('data_connections')
                        .update(updateData)
                        .eq('id', existingConnection.id)

                    if (updateError) {
                        console.error('[TENANT_CHANGE] Error updating OptiqoFlow connection:', updateError)
                    } else {
                        console.log(`[TENANT_CHANGE] Successfully updated OptiqoFlow connection with new tenant schema`)
                    }

                } else if (isAssigning && !existingConnection) {
                    // SCENARIO 3: Tenant being assigned - create new immutable connection
                    console.log(`[TENANT_ASSIGN] Creating OptiqoFlow connection for organization ${organizationId}...`)

                    // Get organization name for unique connection name
                    const orgName = organization.name || 'Organization'

                    const connectionRecord: any = {
                        owner_id: organization.createdBy || user.id,  // Use org creator for consistency
                        organization_id: organizationId,
                        internal_name: `OptiqoFlow Data (${orgName})`,  // Unique per organization
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
                        console.log(`[TENANT_ASSIGN] Fetching OptiqoFlow schema for tenant ${newTenantId}...`)
                        const schema = await getOptiqoflowSchema(newTenantId)
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
            }
        } catch (connError: any) {
            console.error('[TENANT_MANAGE] Error in OptiqoFlow connection management:', connError)
            // Don't fail tenant assignment
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
