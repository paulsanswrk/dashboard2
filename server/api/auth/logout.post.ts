import { supabaseUser } from '../supabase'

export default defineEventHandler(async (event) => {
  try {
    // Get session from cookies
    const accessToken = getCookie(event, 'sb-access-token')
    const refreshToken = getCookie(event, 'sb-refresh-token')

    if (accessToken && refreshToken) {
      // Set the session for the user client
      const { error } = await supabaseUser.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (!error) {
        // Sign out the user
        await supabaseUser.auth.signOut()
      }
    }

    // Clear cookies
    deleteCookie(event, 'sb-access-token')
    deleteCookie(event, 'sb-refresh-token')

    return {
      success: true,
      message: 'Logged out successfully'
    }

  } catch (error: any) {
    // Even if there's an error, clear the cookies
    deleteCookie(event, 'sb-access-token')
    deleteCookie(event, 'sb-refresh-token')
    
    return {
      success: true,
      message: 'Logged out successfully'
    }
  }
})
