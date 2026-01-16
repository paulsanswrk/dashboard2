import { createClient } from '@supabase/supabase-js'
import { capitalizeRole } from '../../utils/roleUtils'

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
    const { firstName, lastName, role } = body

    // Capitalize and validate role if provided
    let capitalizedRole: string | null = null
    if (role) {
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

    // Get user's profile (organization_id and role)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    // SUPERADMIN can manage users in any organization
    const isSuperAdmin = profile.role === 'SUPERADMIN'

    if (!isSuperAdmin && !profile.organization_id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'User not associated with any organization'
      }
    }

    // Check if target user exists (for SUPERADMIN, no org filter; for others, filter by same org)
    let targetUserQuery = supabase
      .from('profiles')
      .select('user_id, organization_id')
      .eq('user_id', targetUserId)

    if (!isSuperAdmin) {
      targetUserQuery = targetUserQuery.eq('organization_id', profile.organization_id)
    }

    const { data: existingUser, error: userError } = await targetUserQuery.single()

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

    // Prepare update data
    const updateData: any = {}
    if (firstName !== undefined) updateData.first_name = firstName
    if (lastName !== undefined) updateData.last_name = lastName
    if (capitalizedRole !== null) updateData.role = capitalizedRole

    // Update the user (SUPERADMIN can update any user, others only in their org)
    let updateQuery = supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', targetUserId)

    if (!isSuperAdmin) {
      updateQuery = updateQuery.eq('organization_id', profile.organization_id)
    }

    const { data: updatedUser, error: updateError } = await updateQuery
      .select('user_id, first_name, last_name, role, created_at')
      .single()

    if (updateError) {
      console.error('Error updating user:', updateError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to update user'
      }
    }

    // Transform the response to match frontend format
    const transformedUser = {
      id: updatedUser.user_id,
      email: `user-${updatedUser.user_id.slice(0, 8)}@company.com`, // Placeholder email
      name: updatedUser.first_name && updatedUser.last_name
        ? `${updatedUser.first_name} ${updatedUser.last_name}`
        : updatedUser.first_name || updatedUser.last_name || '',
      role: updatedUser.role || 'EDITOR',
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      createdAt: updatedUser.created_at
    }

    return {
      success: true,
      user: transformedUser,
      message: 'User updated successfully'
    }

  } catch (error: any) {
    console.error('Update user error:', error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
