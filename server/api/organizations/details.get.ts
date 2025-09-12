import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    // Get organization ID from query params
    const query = getQuery(event)
    const organizationId = query.id as string
    
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

    // Get user profile to check permissions
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

    // Check if user has access to this organization
    if (profileData.role !== 'ADMIN' && profileData.organization_id !== organizationId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied to this organization'
      })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Organization not found'
      })
    }

    // Get user count for this organization
    const { count: userCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to get user count: ${countError.message}`
      })
    }

    // Get viewer count for this organization
    const { count: viewerCount, error: viewerCountError } = await supabaseAdmin
      .from('viewers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (viewerCountError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to get viewer count: ${viewerCountError.message}`
      })
    }

    return {
      success: true,
      organization: {
        ...organization,
        user_count: userCount || 0,
        viewer_count: viewerCount || 0,
        total_members: (userCount || 0) + (viewerCount || 0)
      }
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch organization details'
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
