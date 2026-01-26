import { createClient } from '@supabase/supabase-js'
import { validateNewViewerRole } from '../../../utils/roleUtils'
import { generateMagicLink, generateViewerInvitationTemplate, sendEmail } from '../../../utils/emailUtils'

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

    // Parse request body
    const body = await readBody(event)
    const { email, firstName, lastName, type, group, organizationId, sendInvitation } = body

    // Always create new viewers as VIEWER (ignore any role passed in)
    const viewerRole = validateNewViewerRole()

    // Validate required fields
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
        last_name: lastName,
        viewer_type: type || 'Viewer',
        group_name: group
      }
    })

    if (createUserError) {
      console.error('Error creating auth user for viewer:', createUserError)
      setResponseStatus(event, 400)
      return {
        success: false,
        error: `Failed to create viewer user: ${createUserError.message}`
      }
    }

    const newViewerId = authData.user.id

    // Create the profile with VIEWER role
    const { data: newViewer, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: newViewerId,
        organization_id: organizationId,
        first_name: firstName || null,
        last_name: lastName || null,
        role: viewerRole,
        viewer_type: type || 'Viewer',
        group_name: group || null
      })
      .select('user_id, first_name, last_name, role, viewer_type, group_name, created_at')
      .single()

    if (createError) {
      console.error('Error creating viewer profile:', createError)
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newViewerId)
      setResponseStatus(event, 500)
      return {
        success: false,
        error: 'Failed to create viewer profile'
      }
    }

    // Transform the data to match the expected format
    const transformedViewer = {
      id: newViewer.user_id,
      email: email,
      name: newViewer.first_name && newViewer.last_name
        ? `${newViewer.first_name} ${newViewer.last_name}`
        : newViewer.first_name || newViewer.last_name || '',
      type: newViewer.viewer_type || 'Viewer',
      group: newViewer.group_name || '',
      firstName: newViewer.first_name || '',
      lastName: newViewer.last_name || '',
      role: newViewer.role || 'VIEWER',
      organizationId: organizationId,
      organizationName: organization.name,
      createdAt: newViewer.created_at
    }

    // Send invitation email if requested
    if (sendInvitation) {
      try {
        // Get the site URL from environment variables
        const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : 'http://localhost:3000'

        const confirmationUrl = generateMagicLink(newViewerId, email, siteUrl)
        const emailTemplate = generateViewerInvitationTemplate({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          type: type || 'Viewer',
          group: group || undefined,
          confirmationUrl,
          siteUrl
        })

        const emailSent = await sendEmail(email, emailTemplate)
        if (emailSent) {
          console.log(`Viewer invitation email sent to ${email}`)
        } else {
          console.warn(`Failed to send viewer invitation email to ${email}`)
        }
      } catch (emailError) {
        console.error('Error sending viewer invitation email:', emailError)
        // Don't fail the viewer creation if email fails
      }
    }

    return {
      success: true,
      viewer: transformedViewer,
      message: sendInvitation
        ? 'Viewer created successfully. They will receive an invitation email to access the dashboards.'
        : 'Viewer created successfully.'
    }

  } catch (error: any) {
    console.error('Create admin viewer error:', error)

    setResponseStatus(event, 500)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
})
