import { supabaseAdmin } from '../api/supabase'
import { db } from '../../lib/db'
import { dashboardAccess, dashboards, profiles } from '../../lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Check if a user has permission to use a specific data connection
 * @param connectionId - The ID of the data connection
 * @param userId - The ID of the user requesting access
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function checkConnectionPermission(connectionId: number, userId: string): Promise<boolean> {
    try {
        // First, get the connection details
        const { data: connection, error: connectionError } = await supabaseAdmin
            .from('data_connections')
            .select('owner_id, organization_id')
            .eq('id', connectionId)
            .single()

        if (connectionError || !connection) {
            console.error('Connection not found:', connectionId)
            return false
        }

        // Check direct ownership
        if (connection.owner_id === userId) {
            return true
        }

        // Check organization-based access
        if (connection.organization_id) {
            // Get user's profile to check organization membership and role
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('organization_id, role')
                .eq('user_id', userId)
                .single()

            if (profileError || !profile) {
                return false
            }

            // Regular user: check if they're in the same organization
            if (profile.organization_id === connection.organization_id) {
                // Users in the organization have access to organization-owned connections
                return true
            }
        }

        return false
    } catch (error) {
        console.error('Error checking connection permission:', error)
        return false
    }
}

/**
 * Check if a user can access multiple connections
 * @param connectionIds - Array of connection IDs to check
 * @param userId - The ID of the user requesting access
 * @returns Promise<boolean[]> - Array of boolean results for each connection
 */
export async function checkMultipleConnectionPermissions(connectionIds: number[], userId: string): Promise<boolean[]> {
    const results = await Promise.all(
        connectionIds.map(connectionId => checkConnectionPermission(connectionId, userId))
    )
    return results
}

/**
 * Check if a user has permission to access a specific dashboard
 * @param dashboardId - The ID of the dashboard
 * @param userId - The ID of the user requesting access (optional - if not provided, only checks public access)
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function checkDashboardPermission(dashboardId: string, userId?: string): Promise<boolean> {
    try {
        // Get dashboard info
        const dashboard = await db
            .select({
                id: dashboards.id,
                creator: dashboards.creator,
                organizationId: dashboards.organizationId,
                isPublic: dashboards.isPublic
            })
            .from(dashboards)
            .where(eq(dashboards.id, dashboardId))
            .limit(1)
            .then(rows => rows[0])

        if (!dashboard) {
            return false
        }

        // If dashboard is public, anyone can access it
        if (dashboard.isPublic) {
            return true
        }

        // If no user ID provided, can't access non-public dashboard
        if (!userId) {
            return false
        }

        // Get user profile
        const userProfile = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, userId))
            .limit(1)
            .then(rows => rows[0])

        // Check permissions:
        // 1. Dashboard creator always has access
        if (dashboard.creator === userId) {
            return true
        }

        // 2. SUPERADMIN and ADMIN in the same organization have access
        // Strict org isolation: SUPERADMINs are also restricted to their org context
        if (userProfile && ['SUPERADMIN', 'ADMIN'].includes(userProfile.role) && userProfile.organizationId === dashboard.organizationId) {
            return true
        }

        // 3. Check explicit access via dashboard_access table (user or group only)
        // Note: target_type='org' is NOT checked here because:
        // - Admins already have access via the role check above
        // - Editors/Viewers need explicit sharing per requirements
        const accessRecord = await db
            .select()
            .from(dashboardAccess)
            .where(and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, userId)
            ))
            .limit(1)
            .then(rows => rows[0])

        if (accessRecord) {
            return true
        }

        // No access if user profile not found
        if (!userProfile) {
            return false
        }

        return false
    } catch (error) {
        console.error('Error checking dashboard permission:', error)
        return false
    }
}

/**
 * Check if a user has edit permission for a specific dashboard
 * @param dashboardId - The ID of the dashboard
 * @param userId - The ID of the user requesting access
 * @returns Promise<boolean> - True if user has edit permission, false otherwise
 */
export async function checkEditPermission(dashboardId: string, userId: string): Promise<boolean> {
    try {
        // Get dashboard info
        const dashboard = await db
            .select({
                id: dashboards.id,
                creator: dashboards.creator,
                organizationId: dashboards.organizationId
            })
            .from(dashboards)
            .where(eq(dashboards.id, dashboardId))
            .limit(1)
            .then(rows => rows[0])

        if (!dashboard) {
            return false
        }

        // Dashboard creator always has edit access
        if (dashboard.creator === userId) {
            return true
        }

        // Get user profile
        const userProfile = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, userId))
            .limit(1)
            .then(rows => rows[0])

        // SUPERADMIN and ADMIN in the same organization have edit access
        // Strict org isolation: SUPERADMINs are also restricted to their org context
        if (userProfile && ['SUPERADMIN', 'ADMIN'].includes(userProfile.role) && userProfile.organizationId === dashboard.organizationId) {
            return true
        }

        // Check explicit edit access via dashboard_access table (user only)
        // Note: target_type='org' is NOT checked here because:
        // - Admins already have edit access via the role check above
        // - Editors/Viewers need explicit sharing per requirements
        const editAccessRecord = await db
            .select()
            .from(dashboardAccess)
            .where(and(
                eq(dashboardAccess.dashboardId, dashboardId),
                eq(dashboardAccess.accessLevel, 'edit'),
                eq(dashboardAccess.targetType, 'user'),
                eq(dashboardAccess.targetUserId, userId)
            ))
            .limit(1)
            .then(rows => rows[0])

        return !!editAccessRecord
    } catch (error) {
        console.error('Error checking edit permission:', error)
        return false
    }
}
