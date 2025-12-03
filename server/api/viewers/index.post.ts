import {createClient} from '@supabase/supabase-js'
import {validateNewViewerRole} from '../../utils/roleUtils'
import {generateMagicLink, generateViewerInvitationTemplate, sendEmail} from '../../utils/emailUtils'

export default defineEventHandler(async (event) => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Supabase configuration'
      })
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authorization = getHeader(event, 'authorization')
    if (!authorization) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authorization header required'
      })
    }

    // Extract token from "Bearer <token>"
    const token = authorization.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    const userId = user.id

    // Parse request body
    const body = await readBody(event)
    const { email, firstName, lastName, type, group, sendInvitation } = body

    // Always create new viewers as VIEWER (ignore any role passed in)
    const viewerRole = validateNewViewerRole()

    // Validate required fields
    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email is required'
      })
    }

    // Get user's organization from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    if (!profile.organization_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User not associated with any organization'
      })
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
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to create viewer user: ${createUserError.message}`
      })
    }

    const newViewerId = authData.user.id

    // Create the profile with VIEWER role
    const { data: newViewer, error: createError } = await supabase
      .from('profiles')
      .insert({
        user_id: newViewerId,
        organization_id: profile.organization_id,
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create viewer profile'
      })
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
      createdAt: newViewer.created_at
    }

    // Send invitation email if requested
    if (sendInvitation) {
      try {
        const confirmationUrl = generateMagicLink(newViewerId, email)
        const emailTemplate = generateViewerInvitationTemplate({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          type: type || 'Viewer',
          group: group || undefined,
            confirmationUrl,
            siteUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'
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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
