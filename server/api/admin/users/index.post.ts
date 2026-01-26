import { createClient } from '@supabase/supabase-js'
import { validateNewUserRole } from '../../../utils/roleUtils'
import { generateMagicLink, generateUserInvitationTemplate, sendEmail } from '../../../utils/emailUtils'

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
    const { email, firstName, lastName, role, organizationId } = body

    if (!email) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Email is required'
      }
    }

    if (!organizationId) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Organization ID is required'
      }
    }

    // Always create new users as EDITOR (ignore any role passed in)
    const userRole = validateNewUserRole(role)

    // Get user's profile to check if they have admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    // Verify that the target organization exists
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
      organizationId: organizationId,
      organizationName: organization.name,
      createdAt: newUser.created_at
    }

    // Send invitation email
    try {
      const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000'

      const confirmationUrl = generateMagicLink(newUserId, email, siteUrl)
      const emailTemplate = generateUserInvitationTemplate({
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role: userRole,
        confirmationUrl,
        siteUrl
      })

      const emailSent = await sendEmail(email, emailTemplate)
      if (emailSent) {
        console.log(`Invitation email sent to ${email}`)
      } else {
        console.warn(`Failed to send invitation email to ${email}`)
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Don't fail the user creation if email fails
    }

    return {
      success: true,
      user: transformedUser,
      message: 'User created successfully. They will receive an invitation email to complete their account setup.'
    }

  } catch (error: any) {
    console.error('Create admin user error:', error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
