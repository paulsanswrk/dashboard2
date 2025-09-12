import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
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

    // Get user profile to check role and organization
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    let query = supabaseAdmin
      .from('profiles')
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
      .order('created_at', { ascending: false })

    // If user is not admin, only show profiles from their organization
    if (currentUserProfile.role !== 'ADMIN') {
      query = query.eq('organization_id', currentUserProfile.organization_id)
    }

    const { data: profiles, error } = await query

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch profiles: ${error.message}`
      })
    }

    return {
      success: true,
      profiles
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch profiles'
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
