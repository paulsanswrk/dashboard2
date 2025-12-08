import {createClient} from '@supabase/supabase-js'

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
        statusMessage: 'Only admins can update organizations'
      })
    }

    const organizationId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { name, licenses } = body

    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

    // Build update object
    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name
    }
    
    if (licenses !== undefined) {
      // Validate licenses is a non-negative integer
      const licensesNum = parseInt(licenses)
      if (isNaN(licensesNum) || licensesNum < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Licenses must be a non-negative integer'
        })
      }
      updateData.viewer_count = licensesNum
    }

    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update'
      })
    }

    // Update organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update organization: ${error.message}`
      })
    }

    if (!organization) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Organization not found'
      })
    }

    // Get updated user counts
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    const { count: viewerCount } = await supabase
      .from('viewers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    const organizationWithCounts = {
      ...organization,
      user_count: (profileCount || 0) + (viewerCount || 0),
      profile_count: profileCount || 0,
      viewer_count: viewerCount || 0,
      licenses: organization.viewer_count || 0,
      status: 'active'
    }

    return {
      success: true,
      organization: organizationWithCounts
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to update organization'
    })
  }
})
