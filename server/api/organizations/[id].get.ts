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

    // Get organization ID from route
    const organizationId = getRouterParam(event, 'id')
    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

    // Build the query to get organization
    let query = supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)

    // If user is not admin, only allow access to their organization
    if (profileData.role !== 'ADMIN') {
      query = query.eq('id', profileData.organization_id)
    }

    const { data: organization, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Organization not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch organization: ${error.message}`
      })
    }

    // Get user counts for the organization
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    const { count: viewerCount } = await supabase
      .from('viewers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    // Get dashboards count for the organization (dashboards created by users in this organization)
    const { count: dashboardsCount } = await supabase
      .from('dashboards')
      .select('*', { count: 'exact', head: true })
      .in('owner_id', 
        await supabase
          .from('profiles')
          .select('user_id')
          .eq('organization_id', organization.id)
          .then(({ data }) => data?.map(p => p.user_id) || [])
      )

    // Get actual users and viewers data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, role, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    const { data: viewers } = await supabase
      .from('viewers')
      .select('user_id, first_name, last_name, viewer_type, group_name, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    const organizationWithCounts = {
      ...organization,
      user_count: (profileCount || 0) + (viewerCount || 0),
      profile_count: profileCount || 0,
      viewer_count: viewerCount || 0,
      dashboards_count: dashboardsCount || 0,
      licenses: organization.viewer_count || 0, // Add licenses field from database viewer_count
      status: 'active', // Set all organizations as active as requested
      profiles: profiles || [],
      viewers: viewers || []
    }

    return {
      success: true,
      organization: organizationWithCounts
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch organization'
    })
  }
})
