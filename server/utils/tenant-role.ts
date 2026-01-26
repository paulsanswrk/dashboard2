/**
 * Tenant Role Management
 * 
 * Ensures tenant roles have correct permissions including optiqoflow schema access.
 * This handles role creation and permission granting when new tenant schemas are created.
 */

import { pgClient } from '../../lib/db'

/**
 * Creates or updates a tenant role with all required permissions
 * 
 * @param shortName - Tenant's short name (e.g., 'acme_cleaning_co')
 * @returns Success status
 */
export async function ensureTenantRole(shortName: string): Promise<{ success: boolean; error?: string }> {
    const schemaName = `tenant_${shortName}`
    const roleName = `tenant_${shortName}_role`

    try {
        console.log(`[TenantRole] Ensuring role ${roleName} has correct permissions`)

        // Check if role exists
        const roleCheck = await pgClient`
            SELECT 1 FROM pg_roles WHERE rolname = ${roleName}
        `

        const roleExists = roleCheck.length > 0

        if (!roleExists) {
            // Create the role
            console.log(`[TenantRole] Creating role: ${roleName}`)
            await pgClient.unsafe(`CREATE ROLE ${roleName}`)
        }

        // Grant permissions on tenant-specific schema
        console.log(`[TenantRole] Granting permissions on schema: ${schemaName}`)
        await pgClient.unsafe(`GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName}`)
        await pgClient.unsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schemaName} TO ${roleName}`)
        await pgClient.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT SELECT ON TABLES TO ${roleName}`)

        // Grant permissions on optiqoflow schema (base tables)
        console.log(`[TenantRole] Granting permissions on optiqoflow schema`)
        await pgClient.unsafe(`GRANT USAGE ON SCHEMA optiqoflow TO ${roleName}`)
        await pgClient.unsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA optiqoflow TO ${roleName}`)

        // Set default search_path for the role
        // Note: This is overridden at query time to include optiqoflow
        await pgClient.unsafe(`ALTER ROLE ${roleName} SET search_path TO ${schemaName}`)

        // Grant role to service_role so we can SET ROLE to it
        await pgClient.unsafe(`GRANT ${roleName} TO service_role`)

        console.log(`[TenantRole] Successfully configured role: ${roleName}`)
        return { success: true }
    } catch (error: any) {
        console.error(`[TenantRole] Failed to ensure role ${roleName}:`, error.message)
        return { success: false, error: error.message }
    }
}

/**
 * Grants optiqoflow schema permissions to all existing tenant roles
 * Useful for migrating existing tenants to the new permission model
 */
export async function grantOptiqoflowToAllTenantRoles(): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
        console.log(`[TenantRole] Granting optiqoflow permissions to all tenant roles`)

        // Get all tenant roles
        const roles = await pgClient`
            SELECT rolname 
            FROM pg_roles 
            WHERE rolname LIKE 'tenant_%_role'
            ORDER BY rolname
        ` as Array<{ rolname: string }>

        console.log(`[TenantRole] Found ${roles.length} tenant roles`)

        for (const role of roles) {
            const roleName = role.rolname

            try {
                await pgClient.unsafe(`GRANT USAGE ON SCHEMA optiqoflow TO ${roleName}`)
                await pgClient.unsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA optiqoflow TO ${roleName}`)
                console.log(`[TenantRole] Granted optiqoflow permissions to ${roleName}`)
            } catch (err: any) {
                console.error(`[TenantRole] Failed to grant permissions to ${roleName}:`, err.message)
            }
        }

        // Set default privileges for future tables
        await pgClient.unsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA optiqoflow GRANT SELECT ON TABLES TO PUBLIC`)

        console.log(`[TenantRole] Successfully updated ${roles.length} tenant roles`)
        return { success: true, updated: roles.length }
    } catch (error: any) {
        console.error(`[TenantRole] Failed to grant optiqoflow permissions:`, error.message)
        return { success: false, updated: 0, error: error.message }
    }
}
