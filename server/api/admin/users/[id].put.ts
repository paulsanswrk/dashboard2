import {createClient} from '@supabase/supabase-js'
import {capitalizeRole} from '../../../utils/roleUtils'

// Role hierarchy (higher number = higher privileges)
const roleHierarchy = {
    'VIEWER': 1,
    'EDITOR': 2,
    'ADMIN': 3,
    'SUPERADMIN': 4
}

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

    // Get the request body
    const body = await readBody(event)
    const { firstName, lastName, role, organizationId } = body

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

      // Capitalize and validate role if provided
      let capitalizedRole: string | null = null
      if (role) {
          // Prevent users from changing their own role
          if (targetUserId === userId) {
              setResponseStatus(event, 403)
              return {
                  success: false,
                  error: 'Users cannot change their own role'
              }
          }

          // Check if current user has permission to change roles (only ADMIN and SUPERADMIN)
          if (profile.role !== 'ADMIN' && profile.role !== 'SUPERADMIN') {
              setResponseStatus(event, 403)
              return {
                  success: false,
                  error: 'Insufficient permissions to change user roles'
              }
          }

          // Check if the new role is not higher than the assigner's role
          const assignerRoleLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0
          const newRoleLevel = roleHierarchy[role.toUpperCase() as keyof typeof roleHierarchy] || 0

          if (newRoleLevel > assignerRoleLevel) {
              setResponseStatus(event, 403)
              return {
                  success: false,
                  error: 'Cannot assign a role higher than your own role level'
              }
          }

          try {
              capitalizedRole = capitalizeRole(role)
          } catch (error: any) {
              setResponseStatus(event, 400)
              return {
                  success: false,
                  error: error.message
              }
          }
      }

    // Check if target user exists (across all organizations for admin)
    const { data: existingUser, error: userError } = await supabase
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
      .eq('user_id', targetUserId)
      .in('role', ['EDITOR', 'ADMIN'])
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

    // If organizationId is provided, verify it exists and update the user's organization
    if (organizationId && organizationId !== existingUser.organization_id) {
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

    // Prepare update data
    const updateData: any = {}
    if (firstName !== undefined) updateData.first_name = firstName
    if (lastName !== undefined) updateData.last_name = lastName
    if (capitalizedRole !== null) updateData.role = capitalizedRole
    if (organizationId && organizationId !== existingUser.organization_id) {
      updateData.organization_id = organizationId
    }

    // Update the user
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', targetUserId)
      .select(`
        user_id, 
        first_name, 
        last_name, 
        role, 
        organization_id,
        created_at,
        organizations!inner(
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to update user'
      }
    }

    // Get the email address from auth
    const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId)
    let email = `user-${targetUserId.slice(0, 8)}@company.com`
    if (!getUserError && authUser.user) {
      email = authUser.user.email || email
    }

    // Transform the response to match frontend format
    const transformedUser = {
      id: updatedUser.user_id,
      email: email,
      name: updatedUser.first_name && updatedUser.last_name 
        ? `${updatedUser.first_name} ${updatedUser.last_name}` 
        : updatedUser.first_name || updatedUser.last_name || '',
      role: updatedUser.role || 'EDITOR',
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      organizationId: updatedUser.organization_id,
      organizationName: updatedUser.organizations?.name || 'Unknown Organization',
      createdAt: updatedUser.created_at
    }

    return {
      success: true,
      user: transformedUser,
      message: 'User updated successfully'
    }

  } catch (error: any) {
    console.error('Update admin user error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
