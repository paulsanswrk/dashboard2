import { createClient } from '@supabase/supabase-js'
import { capitalizeRole } from '../../utils/roleUtils'

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

    const userId = user.id

    // Get the request body
    const body = await readBody(event)
    const { email, firstName, lastName, role } = body

    if (!email) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Email is required'
      }
    }

    // Capitalize and validate role
    let capitalizedRole: string
    try {
      capitalizedRole = capitalizeRole(role || 'EDITOR')
    } catch (error: any) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: error.message
      }
    }

    // Get user's organization from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (!profile.organization_id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'User not associated with any organization'
      }
    }

    // Create a new user in Supabase Auth first (passwordless)
    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (createUserError) {
      console.error('Error creating auth user:', createUserError)
      setResponseStatus(event, 400)
      return {
        success: false,
        error: `Failed to create user: ${createUserError.message}`
      }
    }

    const newUserId = authData.user.id

    // Create the profile
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUserId,
        organization_id: profile.organization_id,
        first_name: firstName || null,
        last_name: lastName || null,
        role: capitalizedRole
      })
      .select('user_id, first_name, last_name, role, created_at')
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUserId)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to create user profile'
      }
    }

    // Transform the response to match frontend format
    const transformedUser = {
      id: newUser.user_id,
      email: email,
      name: newUser.first_name && newUser.last_name 
        ? `${newUser.first_name} ${newUser.last_name}` 
        : newUser.first_name || newUser.last_name || '',
      role: newUser.role || 'EDITOR',
      firstName: newUser.first_name || '',
      lastName: newUser.last_name || '',
      createdAt: newUser.created_at
    }

    return {
      success: true,
      user: transformedUser,
      message: 'User created successfully. They will receive a magic link to log in.'
    }

  } catch (error: any) {
    console.error('Create user error:', error)
    
    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
