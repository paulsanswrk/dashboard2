import {supabaseAdmin} from '../api/supabase'

/**
 * Check if a user has permission to use a specific data connection
 * @param connectionId - The ID of the data connection
 * @param userId - The ID of the user requesting access
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function checkConnectionPermission(connectionId: number, userId: string): Promise<boolean> {
    try {
        // First, get the connection details
        const {data: connection, error: connectionError} = await supabaseAdmin
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
            const {data: profile, error: profileError} = await supabaseAdmin
                .from('profiles')
                .select('organization_id, role')
                .eq('user_id', userId)
                .single()

            if (profileError || !profile) {
                // User might be a viewer, check viewers table
                const {data: viewer, error: viewerError} = await supabaseAdmin
                    .from('viewers')
                    .select('organization_id')
                    .eq('user_id', userId)
                    .single()

                if (viewerError || !viewer) {
                    return false
                }

                // Viewer has access if they're in the same organization as the connection
                return viewer.organization_id === connection.organization_id
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
