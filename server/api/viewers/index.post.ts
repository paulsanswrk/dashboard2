import { createClient } from '@supabase/supabase-js'

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

    // Check if viewer already exists
/*    const { data: existingViewer } = await supabase
      .from('viewers')
      .select('user_id')
      .eq('user_id', userId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (existingViewer) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Viewer already exists'
      })
    }*/

    // Create viewer record using admin client
    const { data: newViewer, error: createError } = await supabase
      .from('viewers')
      .insert({
        user_id: userId,
        organization_id: profile.organization_id,
        first_name: firstName || null,
        last_name: lastName || null,
        viewer_type: type || 'Viewer',
        group_name: group || null
      })
      .select(`
        user_id,
        first_name,
        last_name,
        viewer_type,
        group_name,
        created_at
      `)
      .single()

    if (createError) {
      console.error('Error creating viewer:', createError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create viewer'
      })
    }

    // Transform the data to match the expected format
    const transformedViewer = {
      id: newViewer.user_id,
      email: `user-${newViewer.user_id.slice(0, 8)}@viewer.com`, // Placeholder email
      name: newViewer.first_name && newViewer.last_name 
        ? `${newViewer.first_name} ${newViewer.last_name}` 
        : newViewer.first_name || newViewer.last_name || '',
      type: newViewer.viewer_type || 'Viewer',
      group: newViewer.group_name || '',
      firstName: newViewer.first_name || '',
      lastName: newViewer.last_name || '',
      createdAt: newViewer.created_at
    }

    // TODO: Send invitation email if sendInvitation is true
    if (sendInvitation) {
      // Implement email sending logic here
      console.log('Sending invitation email to:', email)
    }

    return {
      success: true,
      viewer: transformedViewer
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
