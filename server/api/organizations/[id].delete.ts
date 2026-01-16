import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Supabase configuration'
      })
    }

    // Create Supabase client with service role (bypasses RLS)
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

    const userId = user.id

    // Get user profile to check role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Check if user is admin or superadmin
    if (profileData.role !== 'ADMIN' && profileData.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can delete organizations'
      })
    }

    const organizationId = getRouterParam(event, 'id')
    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

    // Get organization details before deletion
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Organization not found'
      })
    }

    // Delete all users in the organization first (profiles)
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .eq('organization_id', organizationId)

    if (profilesError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete organization users: ${profilesError.message}`
      })
    }

    // Note: Viewers are now stored in profiles table with role=VIEWER, 
    // so they are already deleted with the profiles delete above

    // Delete all dashboards created by users in this organization
    const { data: orgUsers } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId)

    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map(u => u.user_id)
      const { error: dashboardsError } = await supabase
        .from('dashboards')
        .delete()
        .in('owner_id', userIds)

      if (dashboardsError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to delete organization dashboards: ${dashboardsError.message}`
        })
      }
    }

    // Finally, delete the organization
    const { error: orgDeleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (orgDeleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete organization: ${orgDeleteError.message}`
      })
    }

    return {
      success: true,
      message: `Organization "${organization.name}" and all associated users have been deleted successfully`
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to delete organization'
    })
  }
})
