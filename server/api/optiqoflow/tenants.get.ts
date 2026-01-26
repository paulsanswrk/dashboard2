import { createClient } from '@supabase/supabase-js'
import { pgClient } from '../../../lib/db'

/**
 * GET /api/optiqoflow/tenants
 * Lists available tenants from optiqoflow.tenants for organization mapping
 * Only accessible by SUPERADMIN
 * Uses pgClient (Drizzle) for direct SQL access to optiqoflow schema
 */
export default defineEventHandler(async (event) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Missing Supabase configuration'
            })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get the authorization header
        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Authorization header required'
            })
        }

        // Extract token from "Bearer <token>"
        const token = authorization.replace('Bearer ', '')

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            })
        }

        // Check if user is SUPERADMIN
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (profileError || profileData.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only superadmins can access tenant list'
            })
        }

        // Fetch tenants from optiqoflow schema using pgClient (Drizzle)
        const tenants = await pgClient.unsafe(`
            SELECT id, name 
            FROM optiqoflow.tenants 
            ORDER BY name
        `) as Array<{ id: string; name: string }>

        return {
            success: true,
            tenants: tenants || []
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to fetch tenants'
        })
    }
})
