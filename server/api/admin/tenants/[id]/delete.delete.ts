import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { AuthHelper } from '~/server/utils/authHelper'
import { pgClient } from '~/lib/db'

/**
 * DELETE /api/admin/tenants/[id]
 * 
 * Deletes a tenant and all related dashboard objects.
 * SUPERADMIN only.
 * 
 * Query parameters:
 * - dry_run: boolean (default: true) - Preview deletion without executing
 * - unlink_organizations: boolean (default: true) - Unlink vs delete organizations
 * - confirm: boolean (required for actual deletion)
 */
export default defineEventHandler(async (event) => {
    try {
        // SUPERADMIN authorization
        await AuthHelper.requireRole(event, 'SUPERADMIN')

        const tenantId = getRouterParam(event, 'id')
        if (!tenantId) {
            throw createError({
                statusCode: 400,
                message: 'Tenant ID is required'
            })
        }

        // Parse query parameters
        const query = getQuery(event)
        const dryRun = query.dry_run !== 'false' // Default to true
        const unlinkOrganizations = query.unlink_organizations !== 'false' // Default to true
        const confirm = query.confirm === 'true'

        // Safety check: require confirmation for actual deletion
        if (!dryRun && !confirm) {
            throw createError({
                statusCode: 400,
                message: 'Deletion requires explicit confirmation. Set confirm=true query parameter.'
            })
        }

        console.log(`[TENANT_DELETE] Starting tenant deletion:`, {
            tenantId,
            dryRun,
            unlinkOrganizations,
            confirm
        })

        // Call SQL cleanup function
        const result = await pgClient.unsafe(`
            SELECT tenants.delete_tenant_completely(
                $1::uuid,
                $2::boolean,
                false, -- Never delete optiqoflow data via API
                $3::boolean
            ) as result
        `, [tenantId, unlinkOrganizations, dryRun])

        const cleanupResult = result[0]?.result

        if (!cleanupResult) {
            throw createError({
                statusCode: 500,
                message: 'Cleanup function returned no result'
            })
        }

        if (!cleanupResult.success) {
            throw createError({
                statusCode: 500,
                message: cleanupResult.error || 'Cleanup failed',
                data: cleanupResult
            })
        }

        console.log(`[TENANT_DELETE] ${dryRun ? 'Dry-run' : 'Actual deletion'} completed:`, cleanupResult)

        // Return detailed response
        return {
            success: true,
            dry_run: dryRun,
            tenant_id: tenantId,
            tenant_short_name: cleanupResult.tenant_short_name,
            deleted: cleanupResult.deleted,
            warnings: cleanupResult.warnings || [],
            action: cleanupResult.action_planned || cleanupResult.action_taken,
            message: dryRun
                ? 'Dry-run completed. Use dry_run=false&confirm=true to execute deletion.'
                : 'Tenant deleted successfully.'
        }

    } catch (error: any) {
        console.error('[TENANT_DELETE] Error:', error)

        // Re-throw createError errors
        if (error.statusCode) {
            throw error
        }

        // Wrap other errors
        throw createError({
            statusCode: 500,
            message: error?.message || 'Failed to delete tenant'
        })
    }
})
