import { createClient } from '@supabase/supabase-js'

export async function getUserFromSession(accessToken: string, refreshToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error || !sessionData.session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session'
    })
  }

  return sessionData.user
}

export async function getSessionFromEvent(event: any) {
  const accessToken = getCookie(event, 'sb-access-token')
  const refreshToken = getCookie(event, 'sb-refresh-token')

  if (!accessToken || !refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No valid session found'
    })
  }

  return getUserFromSession(accessToken, refreshToken)
}
