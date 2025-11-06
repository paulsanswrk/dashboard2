import { supabaseAdmin } from '../supabase'
import { getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const profileId = getRouterParam(event, 'id')

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

    // Check if user can delete this profile
    const canDelete = 
      currentUserProfile.role === 'ADMIN' || // Admins can delete any profile
      (currentUserProfile.role === 'EDITOR' && profileId === user.id) // Editors can delete their own profile

    if (!canDelete) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to delete this profile'
      })
    }

    // Prevent users from deleting their own profile if they're the only admin
    if (profileId === user.id && currentUserProfile.role === 'ADMIN') {
      // Check if there are other admins
      const { data: otherAdmins, error: adminsError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('role', 'ADMIN')
        .neq('user_id', user.id)
        .limit(1)

      if (adminsError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to check admin count: ${adminsError.message}`
        })
      }

      if (!otherAdmins || otherAdmins.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot delete the last admin user'
        })
      }
    }

    // Delete the user from auth (this will cascade delete the profile due to foreign key)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profileId)

    if (authError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete user: ${authError.message}`
      })
    }

    return {
      success: true,
      message: 'Profile deleted successfully'
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to delete profile'
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
