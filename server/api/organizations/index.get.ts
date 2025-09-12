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

    // Get user profile to check role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', (await getUserFromSession(accessToken, refreshToken)).id)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    let query = supabaseAdmin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    // If user is not admin, only show their organization
    if (profileData.role !== 'ADMIN') {
      query = query.eq('id', profileData.organization_id)
    }

    const { data: organizations, error } = await query

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch organizations: ${error.message}`
      })
    }

    return {
      success: true,
      organizations
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch organizations'
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
