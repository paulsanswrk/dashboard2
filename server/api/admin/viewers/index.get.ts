import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Missing Supabase configuration'
      }
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: 'Authorization header required'
      }
    }

    // Extract token from "Bearer <token>"
    const token = authorization.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }

    const userId = user.id

    // Get user's profile to check if they have admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    // Fetch all viewers (profiles with VIEWER role) across all organizations
    const { data: viewers, error: viewersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        role,
        viewer_type,
        group_name,
        organization_id,
        created_at,
        organizations!inner(
          id,
          name
        )
      `)
      .eq('role', 'VIEWER')
      .order('created_at', { ascending: false })

    if (viewersError) {
      console.error('Error fetching viewers:', viewersError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to fetch viewers'
      }
    }

    // Get email addresses for all viewers
    const userIds = viewers.map(v => v.user_id)
    const { data: authUsers, error: listUsersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (listUsersError) {
      console.error('Error fetching auth users:', listUsersError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to fetch user emails'
      }
    }

    // Create a map of user_id to email
    const userEmailMap = new Map()
    authUsers.users.forEach(user => {
      if (userIds.includes(user.id)) {
        userEmailMap.set(user.id, user.email)
      }
    })

    // Transform the data to match the expected format
    const transformedViewers = viewers.map(viewer => ({
      id: viewer.user_id,
      email: userEmailMap.get(viewer.user_id) || `user-${viewer.user_id.slice(0, 8)}@viewer.com`,
      name: viewer.first_name && viewer.last_name 
        ? `${viewer.first_name} ${viewer.last_name}` 
        : viewer.first_name || viewer.last_name || '',
      type: viewer.viewer_type || 'Viewer',
      group: viewer.group_name || '',
      firstName: viewer.first_name || '',
      lastName: viewer.last_name || '',
      role: viewer.role || 'VIEWER',
      organizationId: viewer.organization_id,
      organizationName: viewer.organizations?.name || 'Unknown Organization',
      createdAt: viewer.created_at
    }))

    return {
      success: true,
      viewers: transformedViewers,
      total: transformedViewers.length
    }

  } catch (error: any) {
    console.error('Get admin viewers error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
