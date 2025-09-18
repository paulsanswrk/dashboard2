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

    const body = await readBody(event)
    const { name } = body

    if (!name) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Organization name is required'
      }
    }

    // Check if user is admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (profileData.role !== 'ADMIN') {
      setResponseStatus(event, 403)
      return {
        success: false,
        error: 'Only admins can create organizations'
      }
    }

    // Create organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: `Failed to create organization: ${error.message}`
      }
    }

    return {
      success: true,
      organization
    }

  } catch (error: any) {
    console.error('Create organization error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
