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

    // Fetch viewers for the current organization using admin client
    const { data: viewers, error: viewersError } = await supabase
      .from('viewers')
      .select(`
        user_id,
        first_name,
        last_name,
        viewer_type,
        group_name,
        created_at
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (viewersError) {
      console.error('Error fetching viewers:', viewersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch viewers'
      })
    }

    // Transform the data to match the expected format
    const transformedViewers = viewers.map(viewer => ({
      id: viewer.user_id,
      email: `user-${viewer.user_id.slice(0, 8)}@viewer.com`, // Placeholder email
      name: viewer.first_name && viewer.last_name 
        ? `${viewer.first_name} ${viewer.last_name}` 
        : viewer.first_name || viewer.last_name || '',
      type: viewer.viewer_type || 'Viewer',
      group: viewer.group_name || '',
      firstName: viewer.first_name || '',
      lastName: viewer.last_name || '',
      createdAt: viewer.created_at
    }))

    return {
      success: true,
      viewers: transformedViewers,
      total: transformedViewers.length
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
