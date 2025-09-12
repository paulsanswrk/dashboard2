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

    // Get user's organization from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (!profile.organization_id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'User not associated with any organization'
      }
    }

    // Fetch users (profiles) for the current organization
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        role,
        created_at
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to fetch users'
      }
    }

    // Transform the data to match the expected format
    const transformedUsers = users.map(user => ({
      id: user.user_id,
      email: `user-${user.user_id.slice(0, 8)}@company.com`, // Placeholder email
      name: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.first_name || user.last_name || '',
      role: user.role || 'Editor',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      createdAt: user.created_at
    }))

    return {
      success: true,
      users: transformedUsers,
      total: transformedUsers.length
    }

  } catch (error: any) {
    console.error('Get users error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
