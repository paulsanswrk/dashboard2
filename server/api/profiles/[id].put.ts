import {supabaseAdmin} from '../supabase'
import {capitalizeRole} from '../../utils/roleUtils'
import {getCookie} from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const profileId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { firstName, lastName, role, organizationId } = body

    if (!profileId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Profile ID is required'
      })
    }

    // Get current user from session
    const accessToken = getCookie(event, 'sb-access-token')
    const refreshToken = getCookie(event, 'sb-refresh-token')

    if (!accessToken || !refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const user = await getUserFromSession(accessToken, refreshToken)

    // Get current user profile to check permissions
    const { data: currentUserProfile, error: currentProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (currentProfileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Current user profile not found'
      })
    }

    // Check if user can update this profile
      const canUpdate =
          currentUserProfile.role === 'SUPERADMIN' || // Superadmins can update any profile
      currentUserProfile.role === 'ADMIN' || // Admins can update any profile
      (currentUserProfile.role === 'EDITOR' && profileId === user.id) || // Editors can update their own profile
      (currentUserProfile.role === 'EDITOR' && currentUserProfile.organization_id === organizationId) // Editors can update profiles in their organization

    if (!canUpdate) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to update this profile'
      })
    }

    // Capitalize and validate role if provided
    let capitalizedRole = null
    if (role) {
      try {
        capitalizedRole = capitalizeRole(role)
      } catch (error: any) {
        throw createError({
          statusCode: 400,
          statusMessage: error.message
        })
      }
    }

    // Only admins can change roles
    if (role && currentUserProfile.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can change user roles'
      })
    }

    // Prepare update data
    const updateData: any = {}
    if (firstName !== undefined) updateData.first_name = firstName
    if (lastName !== undefined) updateData.last_name = lastName
    if (capitalizedRole !== null) updateData.role = capitalizedRole
    if (organizationId !== undefined) updateData.organization_id = organizationId

    // Update profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', profileId)
      .select(`
        user_id,
        first_name,
        last_name,
        role,
        organization_id,
        created_at,
        organizations (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update profile: ${error.message}`
      })
    }

    if (!profile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Profile not found'
      })
    }

    return {
      success: true,
      profile
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to update profile'
    })
  }
})

// Helper function to get user from session
async function getUserFromSession(accessToken: string, refreshToken: string) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error || !sessionData.session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session'
    })
  }

  return sessionData.user
}
