import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../api/supabase'
import { getCookie } from 'h3'

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

/**
 * Attempts to read the authenticated user from either Authorization header (Bearer token)
 * or Supabase auth cookies. Returns a Supabase user with id/email.
 */
export async function getAuthUserFromEvent(event: any) {
  const auth = getHeader(event, 'authorization')
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) {
      return user
    }
  }
  return getSessionFromEvent(event)
}
