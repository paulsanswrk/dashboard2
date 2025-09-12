import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return createError({
        statusCode: 500,
        statusMessage: 'Missing Supabase configuration'
      })
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      return createError({
        statusCode: 401,
        statusMessage: 'Authorization header required'
      })
    }

    // Extract token from "Bearer <token>"
    const token = authorization.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    const userId = user.id
    const viewerId = getRouterParam(event, 'id')

    if (!viewerId) {
      return createError({
        statusCode: 400,
        statusMessage: 'Viewer ID is required'
      })
    }

    // Get user's organization from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      return createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    if (!profile.organization_id) {
      return createError({
        statusCode: 400,
        statusMessage: 'User not associated with any organization'
      })
    }

    // Check if viewer exists and belongs to the user's organization
    const { data: existingViewer, error: viewerError } = await supabase
      .from('viewers')
      .select('user_id, organization_id')
      .eq('user_id', viewerId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (viewerError) {
      if (viewerError.code === 'PGRST116') {
        return createError({
          statusCode: 404,
          statusMessage: 'Viewer not found'
        })
      }
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to check viewer'
      })
    }

    // Delete the viewer
    const { error: deleteError } = await supabase
      .from('viewers')
      .delete()
      .eq('user_id', viewerId)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Error deleting viewer:', deleteError)
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to delete viewer'
      })
    }

    return {
      success: true,
      message: 'Viewer deleted successfully',
      viewerId: viewerId
    }

  } catch (error: any) {
    console.error('Delete viewer error:', error)
    
    return createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})