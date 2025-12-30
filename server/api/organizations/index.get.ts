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

    // Build the query to get organizations with user counts
    let query = supabase
      .from('organizations')
      .select('*')
        .order('name', {ascending: true})

      // If user is not superadmin, only show their organization
      if (profileData.role !== 'SUPERADMIN') {
      query = query.eq('id', profileData.organization_id)
    }

    const { data: organizations, error } = await query

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch organizations: ${error.message}`
      })
    }

    // Get user counts for each organization
    const organizationsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        // Count profiles (internal users)
        const { count: profileCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        // Count viewers
        const { count: viewerCount } = await supabase
          .from('viewers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)

        return {
          ...org,
          user_count: (profileCount || 0) + (viewerCount || 0),
          profile_count: profileCount || 0,
          viewer_count: viewerCount || 0,
          licenses: org.viewer_count || 0, // Add licenses field from database viewer_count
          status: 'active' // Set all organizations as active as requested
        }
      })
    )

    return {
      success: true,
      organizations: organizationsWithCounts
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch organizations'
    })
  }
})
