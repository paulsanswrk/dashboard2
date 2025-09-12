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

    // Get the request body
    const body = await readBody(event)
    const { firstName, lastName, type, group } = body

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

    // Update the viewer
    const { data: updatedViewer, error: updateError } = await supabase
      .from('viewers')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        viewer_type: type || 'Viewer',
        group_name: group || null
      })
      .eq('user_id', viewerId)
      .eq('organization_id', profile.organization_id)
      .select('user_id, first_name, last_name, viewer_type, group_name, created_at')
      .single()

    if (updateError) {
      console.error('Error updating viewer:', updateError)
      return createError({
        statusCode: 500,
        statusMessage: 'Failed to update viewer'
      })
    }

    // Transform the response to match frontend format
    const transformedViewer = {
      id: updatedViewer.user_id,
      email: `user-${updatedViewer.user_id.slice(0, 8)}@viewer.com`, // Placeholder email
      name: updatedViewer.first_name && updatedViewer.last_name 
        ? `${updatedViewer.first_name} ${updatedViewer.last_name}` 
        : updatedViewer.first_name || updatedViewer.last_name || '',
      type: updatedViewer.viewer_type || 'Viewer',
      group: updatedViewer.group_name || '',
      firstName: updatedViewer.first_name || '',
      lastName: updatedViewer.last_name || '',
      createdAt: updatedViewer.created_at
    }

    return {
      success: true,
      viewer: transformedViewer,
      message: 'Viewer updated successfully'
    }

  } catch (error: any) {
    console.error('Update viewer error:', error)
    
    if (error.statusCode) {
      return error
    }
    
    return createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
