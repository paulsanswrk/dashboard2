import { createClient } from '@supabase/supabase-js'
import { capitalizeRole } from '../../utils/roleUtils'

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

    // Get the request body
    const body = await readBody(event)
    const { userId, email, userMetadata, profileData } = body

    if (!userId || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID and email are required'
      })
    }

    console.log('Creating profile for user:', userId, email)

    // Capitalize and validate role
    const rawRole = profileData?.role || userMetadata?.role || 'EDITOR'
    let capitalizedRole: string
    try {
      capitalizedRole = capitalizeRole(rawRole)
    } catch (error: any) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }

    // Prepare profile data for optiqo-dashboard structure
    const profileDataToCreate = {
      user_id: userId,
      first_name: profileData?.firstName || userMetadata?.firstName || null,
      last_name: profileData?.lastName || userMetadata?.lastName || null,
      role: capitalizedRole,
      organization_id: null, // Will be set later if organization is created
      created_at: new Date().toISOString()
    }

    console.log('Profile data to create:', profileDataToCreate)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (existingProfile) {
      console.log('Profile already exists, updating...')
      // Profile already exists, update it
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: profileDataToCreate.first_name,
          last_name: profileDataToCreate.last_name,
          role: capitalizedRole
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw createError({
          statusCode: 500,
          statusMessage: `Error updating profile: ${error.message}`
        })
      }

      console.log('Profile updated successfully:', data)
      return { success: true, profile: data, action: 'updated' }
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile existence:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: `Error checking profile: ${checkError.message}`
      })
    }

    // Handle organization creation if needed
    let organizationId = null
    if (profileData?.organizationName && capitalizedRole === 'ADMIN') {
      console.log('Creating organization for admin user...')
      
      // Check if organization already exists
      const { data: existingOrg, error: orgCheckError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', profileData.organizationName)
        .single()

      if (existingOrg) {
        organizationId = existingOrg.id
        console.log('Organization already exists:', organizationId)
      } else if (!orgCheckError || orgCheckError.code === 'PGRST116') {
        // Create new organization
        const { data: newOrg, error: orgCreateError } = await supabase
          .from('organizations')
          .insert({
            name: profileData.organizationName,
            viewer_count: 0,
            created_by: profileDataToCreate.user_id
          })
          .select()
          .single()

        if (orgCreateError) {
          console.error('Error creating organization:', orgCreateError)
          // Don't fail the entire request if organization creation fails
        } else {
          organizationId = newOrg.id
          console.log('Organization created successfully:', newOrg)
        }
      }
    }

    // Update profile data with organization ID
    profileDataToCreate.organization_id = organizationId

    // Profile doesn't exist, create it
    console.log('Profile does not exist, creating new one...')
    const { data: profile, error: createError } = await supabase
      .from('profiles')
      .insert(profileDataToCreate)
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      throw createError({
        statusCode: 500,
        statusMessage: `Error creating profile: ${createError.message}`
      })
    }

    console.log('Profile created successfully:', profile)

    return { 
      success: true, 
      profile, 
      action: 'created' 
    }

  } catch (error: any) {
    console.error('Error in create-profile API:', error)
    
    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }
    
    // Otherwise, create a new error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
