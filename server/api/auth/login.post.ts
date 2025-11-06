import { supabaseUser } from '../supabase'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password } = body

    console.log('🔐 Login attempt for email:', email)

    if (!email || !password) {
      console.log('❌ Missing email or password')
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and password are required'
      })
    }

    // Authenticate user with Supabase Auth
    const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.log('❌ Supabase auth error:', authError.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    console.log('✅ Supabase auth successful for user:', authData.user.id)
    const userId = authData.user.id

    // Get user profile from database
    console.log('🔍 Fetching user profile for user:', userId)
    const { data: profileData, error: profileError } = await supabaseUser
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        role,
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.log('❌ Profile fetch error:', profileError.message)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    console.log('✅ Profile found:', {
      userId: profileData.user_id,
      name: `${profileData.first_name} ${profileData.last_name}`,
      role: profileData.role,
      organizationId: profileData.organization_id
    })

    // Set session cookie
    const session = authData.session
    if (session) {
      console.log('🍪 Setting session cookies')
      setCookie(event, 'sb-access-token', session.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      
      setCookie(event, 'sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
      console.log('✅ Session cookies set successfully')
    } else {
      console.log('⚠️ No session data available')
    }

    const response = {
      success: true,
      user: {
        id: userId,
        email: authData.user.email,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        role: profileData.role,
        organizationId: profileData.organization_id,
        organization: profileData.organizations
      },
      session: {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at
      }
    }

    console.log('🎉 Login successful, returning response:', {
      success: response.success,
      userId: response.user.id,
      email: response.user.email,
      role: response.user.role
    })

    return response

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Login failed'
    })
  }
})
