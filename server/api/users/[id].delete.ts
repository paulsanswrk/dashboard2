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
    const targetUserId = getRouterParam(event, 'id')

    if (!targetUserId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'User ID is required'
      }
    }

    // Prevent users from deleting themselves
    if (targetUserId === userId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Cannot delete your own account'
      }
    }

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

    // Check if target user exists and belongs to the same organization
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('user_id, organization_id')
      .eq('user_id', targetUserId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        setResponseStatus(event, 404)
        return {
          success: false,
          error: 'User not found'
        }
      }
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to check user'
      }
    }

    // Delete the user profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to delete user'
      }
    }

    return {
      success: true,
      message: 'User deleted successfully',
      userId: targetUserId
    }

  } catch (error: any) {
    console.error('Delete user error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
