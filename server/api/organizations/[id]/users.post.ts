import { createClient } from '@supabase/supabase-js'
import { validateNewUserRole } from '../../../utils/roleUtils'
import { generateUserInvitationWithMagicLinkTemplate, sendEmail, generateMagicLink } from '../../../utils/emailUtils'

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
    const organizationId = getRouterParam(event, 'id')

    if (!organizationId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Organization ID is required'
      }
    }

    // Parse request body
    const body = await readBody(event)
    const { email, firstName, lastName, role = 'EDITOR' } = body

    // Validate required fields
    if (!email || !firstName || !lastName) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Missing required fields: email, firstName, lastName'
      }
    }

    // Always create new users as EDITOR (ignore any role passed in)
    const userRole = validateNewUserRole(role)

    // Verify the organization exists and user has access
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Organization not found'
      }
    }

    // Check if user has permission to add users to this organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    // Only ADMIN users can add users to any organization, others can only add to their own
    if (profile.role !== 'ADMIN' && profile.organization_id !== organizationId) {
      setResponseStatus(event, 403)
      return {
        success: false,
        error: 'Insufficient permissions to add users to this organization'
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
        organization_id: organizationId,
        first_name: firstName || null,
        last_name: lastName || null,
        role: userRole
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

    // Get site URL from runtime config
    const config = useRuntimeConfig()
    const siteUrl = config.public.siteUrl || 'http://localhost:3000'
    
    // Generate magic link for the new user
    const magicLink = generateMagicLink(newUserId, email, siteUrl)
    
    // Send invitation email with magic link
    try {
      const emailTemplate = generateUserInvitationWithMagicLinkTemplate({
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: userRole,
        organizationName: organization.name,
        confirmationUrl: magicLink,
        siteUrl: siteUrl
      })
      
      const emailSent = await sendEmail(email, emailTemplate)
      
      if (!emailSent) {
        console.warn('Failed to send invitation email to user:', email)
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Don't fail the user creation if email fails
    }

    // Transform the response to match frontend format
    const transformedUser = {
      id: newUser.user_id,
      email: email,
      name: `${newUser.first_name} ${newUser.last_name}`,
      role: newUser.role || 'EDITOR',
      firstName: newUser.first_name || '',
      lastName: newUser.last_name || '',
      createdAt: newUser.created_at
    }

    return {
      success: true,
      user: transformedUser,
      message: 'User created successfully and invitation email sent'
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
