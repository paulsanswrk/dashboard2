import { supabaseUser } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    // Get session from cookies
    const accessToken = getCookie(event, 'sb-access-token')
    const refreshToken = getCookie(event, 'sb-refresh-token')

    console.log('🔍 /api/auth/me: Checking for session cookies')
    console.log('🍪 Access token present:', !!accessToken)
    console.log('🍪 Refresh token present:', !!refreshToken)

    if (!accessToken || !refreshToken) {
      console.log('❌ /api/auth/me: No valid session cookies found')
      throw createError({
        statusCode: 401,
        statusMessage: 'No valid session found'
      })
    }

    // Set the session for the user client
    console.log('🔄 /api/auth/me: Setting Supabase session')
    const { data: sessionData, error: sessionError } = await supabaseUser.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (sessionError || !sessionData.session) {
      console.log('❌ /api/auth/me: Session validation failed:', sessionError?.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid session'
      })
    }

    console.log('✅ /api/auth/me: Session validated for user:', sessionData.user.id)
    const userId = sessionData.user.id

    // Get user profile from database
    const { data: profileData, error: profileError } = await supabaseUser
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        role,
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    return {
      success: true,
      user: {
        id: userId,
        email: sessionData.user.email,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        role: profileData.role,
        organizationId: profileData.organization_id,
        organization: profileData.organizations
      }
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to get user data'
    })
  }
})
