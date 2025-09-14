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
    const viewerId = getRouterParam(event, 'id')

    if (!viewerId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Viewer ID is required'
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

    // Check if viewer exists and belongs to the user's organization
    const { data: existingViewer, error: viewerError } = await supabase
      .from('profiles')
      .select('user_id, organization_id, role')
      .eq('user_id', viewerId)
      .eq('organization_id', profile.organization_id)
      .eq('role', 'VIEWER')
      .single()

    if (viewerError) {
      if (viewerError.code === 'PGRST116') {
        setResponseStatus(event, 404)
        return {
          success: false,
          error: 'Viewer not found'
        }
      }
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to check viewer'
      }
    }

    // Delete the viewer profile and auth user
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', viewerId)
      .eq('organization_id', profile.organization_id)
      .eq('role', 'VIEWER')

    if (!deleteError) {
      // Also delete the auth user
      await supabase.auth.admin.deleteUser(viewerId)
    }

    if (deleteError) {
      console.error('Error deleting viewer:', deleteError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to delete viewer'
      }
    }

    return {
      success: true,
      message: 'Viewer deleted successfully',
      viewerId: viewerId
    }

  } catch (error: any) {
    console.error('Delete viewer error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})