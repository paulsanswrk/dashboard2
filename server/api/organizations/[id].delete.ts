import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    const organizationId = getRouterParam(event, 'id')

    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
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

    // Check if user is admin
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    if (profileData.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can delete organizations'
      })
    }

    // Check if organization has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(1)

    if (usersError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to check organization users: ${usersError.message}`
      })
    }

    if (users && users.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete organization with existing users'
      })
    }

    // Delete organization
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete organization: ${error.message}`
      })
    }

    return {
      success: true,
      message: 'Organization deleted successfully'
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to delete organization'
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
