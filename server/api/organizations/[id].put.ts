import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    const organizationId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { name } = body

    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization name is required'
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
        statusMessage: 'Only admins can update organizations'
      })
    }

    // Update organization
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update({ name })
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update organization: ${error.message}`
      })
    }

    if (!organization) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Organization not found'
      })
    }

    return {
      success: true,
      organization
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to update organization'
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
