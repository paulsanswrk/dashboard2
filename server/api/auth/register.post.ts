import { supabaseAdmin } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password, firstName, lastName, role = 'EDITOR', organizationName } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: email, password, firstName, lastName'
      })
    }

    // Validate role
    if (!['ADMIN', 'EDITOR'].includes(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid role. Must be ADMIN or EDITOR'
      })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      throw createError({
        statusCode: 400,
        statusMessage: `Auth error: ${authError.message}`
      })
    }

    const userId = authData.user.id

    // Create or get organization
    let organizationId = null
    if (organizationName) {
      // Create new organization
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: organizationName,
          created_by: userId
        })
        .select()
        .single()

      if (orgError) {
        // If organization creation fails, clean up the user
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw createError({
          statusCode: 400,
          statusMessage: `Organization creation failed: ${orgError.message}`
        })
      }

      organizationId = orgData.id
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        role,
        organization_id: organizationId
      })
      .select()
      .single()

    if (profileError) {
      // If profile creation fails, clean up the user and organization
      await supabaseAdmin.auth.admin.deleteUser(userId)
      if (organizationId) {
        await supabaseAdmin.from('organizations').delete().eq('id', organizationId)
      }
      throw createError({
        statusCode: 400,
        statusMessage: `Profile creation failed: ${profileError.message}`
      })
    }

    // Return user data (without sensitive information)
    return {
      success: true,
      user: {
        id: userId,
        email: authData.user.email,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        role: profileData.role,
        organizationId: profileData.organization_id
      }
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Registration failed'
    })
  }
})
