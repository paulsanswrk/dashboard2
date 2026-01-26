import { createClient } from '@supabase/supabase-js'

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

    // Get the request body
    const body = await readBody(event)
    const { token, email } = body

    if (!token || !email) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Token and email are required'
      }
    }

    // Validate token format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(token)) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid token format'
      }
    }

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, role, organization_id')
      .eq('user_id', token)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        setResponseStatus(event, 404)
        return {
          success: false,
          error: 'Invalid or expired invitation link'
        }
      }
      throw profileError
    }

    // Check if the email matches (basic validation)
    // In a real implementation, you'd want to store the email in the invitation
    // and validate it matches the profile's associated user email

    // Get the user from Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(token)

    if (authError || !authUser.user) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User not found or invalid invitation'
      }
    }

    // Verify email matches
    if (authUser.user.email !== email) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Email does not match invitation'
      }
    }

    // Generate a session for the user
    const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth/callback`
      }
    })

    if (sessionError) {
      console.error('Error generating session:', sessionError)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to create session'
      }
    }

    return {
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        organizationId: profile.organization_id
      },
      sessionUrl: sessionData.properties?.action_link
    }

  } catch (error: any) {
    console.error('Verify invitation error:', error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
