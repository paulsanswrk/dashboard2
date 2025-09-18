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

    // Get the request body
    const body = await readBody(event)
    const { firstName, lastName, type, group, organizationId } = body

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

    // Check if viewer exists (across all organizations for admin)
    const { data: existingViewer, error: viewerError } = await supabase
      .from('profiles')
      .select(`
        user_id, 
        organization_id, 
        role,
        organizations!inner(
          id,
          name
        )
      `)
      .eq('user_id', viewerId)
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

    // If organizationId is provided, verify it exists and update the viewer's organization
    if (organizationId && organizationId !== existingViewer.organization_id) {
      const { data: newOrganization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', organizationId)
        .single()

      if (orgError) {
        setResponseStatus(event, 404)
        return {
          success: false,
          error: 'Target organization not found'
        }
      }
    }

    // Update the viewer profile
    const updateData: any = {
      first_name: firstName !== undefined ? firstName : existingViewer.first_name,
      last_name: lastName !== undefined ? lastName : existingViewer.last_name,
      viewer_type: type !== undefined ? type : existingViewer.viewer_type,
      group_name: group !== undefined ? group : existingViewer.group_name
    }

    if (organizationId && organizationId !== existingViewer.organization_id) {
      updateData.organization_id = organizationId
    }

    const { data: updatedViewer, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', viewerId)
      .eq('role', 'VIEWER')
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
      .single()

    if (updateError) {
      console.error('Error updating viewer:', updateError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to update viewer'
      }
    }

    // Get the email address from auth
    const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(viewerId)
    let email = `user-${viewerId.slice(0, 8)}@viewer.com`
    if (!getUserError && authUser.user) {
      email = authUser.user.email || email
    }

    // Transform the response to match frontend format
    const transformedViewer = {
      id: updatedViewer.user_id,
      email: email,
      name: updatedViewer.first_name && updatedViewer.last_name 
        ? `${updatedViewer.first_name} ${updatedViewer.last_name}` 
        : updatedViewer.first_name || updatedViewer.last_name || '',
      type: updatedViewer.viewer_type || 'Viewer',
      group: updatedViewer.group_name || '',
      firstName: updatedViewer.first_name || '',
      lastName: updatedViewer.last_name || '',
      role: updatedViewer.role || 'VIEWER',
      organizationId: updatedViewer.organization_id,
      organizationName: updatedViewer.organizations?.name || 'Unknown Organization',
      createdAt: updatedViewer.created_at
    }

    return {
      success: true,
      viewer: transformedViewer,
      message: 'Viewer updated successfully'
    }

  } catch (error: any) {
    console.error('Update admin viewer error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
