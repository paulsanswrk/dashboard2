import { ref, computed, watch } from 'vue'
import { getRedirectPathFromProfile, type UserRole } from '~/server/utils/redirectUtils'

export interface Organization {
  id: string
  name: string
  viewer_count: number
  created_at: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId: string | null
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  organization?: Organization
  avatar_url?: string | null
  created_at: string
}

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // User profile state
  const userProfile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)
  
  console.log('🏗️ Auth composable: Initializing with user:', user.value)

  // Computed properties
  const isAuthenticated = computed(() => !!user.value)
  
  const isAdmin = computed(() => {
    return userProfile.value?.role === 'ADMIN'
  })

  // Clear messages
  const clearMessages = () => {
    error.value = null
    success.value = null
  }

  // Set message with auto-clear
  const setMessage = (message: string, type: 'success' | 'error') => {
    clearMessages()
    if (type === 'success') {
      success.value = message
    } else {
      error.value = message
    }
    
    // Auto-clear after 5 seconds
    setTimeout(() => {
      clearMessages()
    }, 5000)
  }

  // Sign up with organization
  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'EDITOR', organizationName?: string) => {
    try {
      loading.value = true
      clearMessages()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            role,
            organizationName
          }
        }
      })

      if (signUpError) throw signUpError

      // Create profile for the user
      if (data.user) {
        try {
          await createUserProfile(data.user, { firstName, lastName, role, organizationName })
          console.log('Profile created successfully for user:', data.user.id)
        } catch (profileError) {
          console.error('Profile creation error during signup:', profileError)
          // Continue anyway - profile creation is not critical for basic functionality
        }
      }

      if (data.user && !data.session) {
        setMessage('Please check your email for verification link', 'success')
        return { success: true, requiresEmailConfirmation: true }
      }

      // If user has a session, they're immediately authenticated
      if (data.user && data.session) {
        setMessage('Account created successfully!', 'success')
        return { success: true, requiresEmailConfirmation: false }
      }

      // Fallback case
      setMessage('Account created successfully!', 'success')
      return { success: true, requiresEmailConfirmation: true }
    } catch (err: any) {
      setMessage(err.message || 'Registration failed', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      loading.value = true
      clearMessages()

      console.log('🔐 Client: Starting login for email:', email)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      console.log('✅ Client: Login successful:', data.user?.id)
      setMessage('Login successful!', 'success')
      
      return { 
        user: data.user,
        success: true
      }
    } catch (err: any) {
      console.log('❌ Client: Login error:', err)
      setMessage(err.message || 'Login failed', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      loading.value = true
      clearMessages()

      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        throw signOutError
      }

      // Clear local state
      userProfile.value = null
      setMessage('Signed out successfully', 'success')
      return { success: true }
    } catch (err: any) {
      setMessage(err.message || 'Logout failed', 'error')
      // Clear state even if API call fails
      userProfile.value = null
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Create user profile using server-side API (bypasses RLS)
  const createUserProfile = async (userData: any, profileData: any) => {
    try {
      if (!userData) throw new Error('User data is required')

      console.log('Creating profile for user:', userData.id, userData.email)

      // Call server-side API that uses service role
      const response = await $fetch('/api/auth/create-profile', {
        method: 'POST',
        body: {
          userId: userData.id,
          email: userData.email,
          userMetadata: userData.user_metadata,
          profileData
        }
      })

      if (response.success) {
        console.log(`Profile ${response.action} successfully:`, response.profile)
        return response.profile
      } else {
        throw new Error('Profile creation failed')
      }
    } catch (err: any) {
      console.error('Error in createUserProfile:', err)
      throw err
    }
  }

  // Get user profile
  const getUserProfile = async () => {
    try {
      if (!user.value) return null

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user.value.id)
        .single()

      if (profileError) throw profileError

      // Transform database fields to frontend format
      const transformedProfile = {
        id: data.user_id,
        email: user.value.email,
        firstName: data.first_name,
        lastName: data.last_name,
        organizationId: data.organization_id,
        role: data.role,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        organization: data.organization
      }

      // Update the reactive profile ref
      userProfile.value = transformedProfile
      return transformedProfile
    } catch (err: any) {
      console.error('Error fetching user profile:', err)
      userProfile.value = null
      return null
    }
  }

  // Load user profile for admin role checking
  const loadUserProfile = async () => {
    if (!user.value) {
      userProfile.value = null
      return
    }
    
    try {
      const profile = await getUserProfile()
      userProfile.value = profile
    } catch (err) {
      console.error('Error loading user profile:', err)
      userProfile.value = null
    }
  }

  // Fetch user profile and organization (legacy method for compatibility)
  const fetchUserProfile = async () => {
    return await loadUserProfile()
  }

  // Check if user can invite more users (license validation)
  const canInviteUsers = computed(() => {
    if (!userProfile.value) return false
    
    // Only admins can invite users
    return userProfile.value.role === 'ADMIN'
  })

  // Centralized redirect function based on user role
  const getRedirectPath = () => {
    return getRedirectPathFromProfile(userProfile.value)
  }

  // Navigate to appropriate dashboard based on user role
  const redirectToDashboard = async (retryCount = 0) => {
    // Wait for profile to load if not already loaded
    if (!userProfile.value && user.value) {
      console.log('🔄 Waiting for user profile to load... (attempt', retryCount + 1, ')')
      await loadUserProfile()
    }
    
    const redirectPath = getRedirectPath()
    if (redirectPath) {
      console.log('🔄 Redirecting to:', redirectPath)
      await navigateTo(redirectPath)
    } else if (retryCount < 3) {
      // Retry a few times if profile is not loaded yet
      console.log('⚠️ Profile not loaded yet, retrying in 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
      return redirectToDashboard(retryCount + 1)
    } else {
      console.warn('⚠️ No redirect path available after retries, user profile:', userProfile.value)
      // Fallback to login if no profile after retries
      await navigateTo('/login')
    }
  }

  // Update user profile
  const updateProfile = async (updates: { firstName?: string; lastName?: string; avatar_url?: string | null }) => {
    try {
      if (!user.value) throw new Error('User not authenticated')
      
      loading.value = true
      clearMessages()

      // Convert camelCase to snake_case for database
      const dbUpdates: any = {}
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
      if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (error) throw error

      // Transform the returned data to frontend format
      const transformedData = {
        firstName: data.first_name,
        lastName: data.last_name,
        avatar_url: data.avatar_url
      }

      // Update local profile state
      userProfile.value = { ...userProfile.value, ...transformedData }
      setMessage('Profile updated successfully!', 'success')
      return { success: true, profile: transformedData }
    } catch (err: any) {
      setMessage(err.message || 'Failed to update profile', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      if (!user.value) throw new Error('User not authenticated')
      
      loading.value = true
      clearMessages()

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage('Password updated successfully!', 'success')
      return { success: true }
    } catch (err: any) {
      setMessage(err.message || 'Failed to update password', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Upload avatar image
  const uploadAvatar = async (file: File) => {
    try {
      if (!user.value) throw new Error('User not authenticated')
      
      loading.value = true
      clearMessages()

      // Generate unique filename with user ID as folder
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.value.id}/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const result = await updateProfile({ avatar_url: urlData.publicUrl })
      
      if (result.success) {
        setMessage('Avatar uploaded successfully!', 'success')
      }
      
      return result
    } catch (err: any) {
      setMessage(err.message || 'Failed to upload avatar', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Delete avatar
  const deleteAvatar = async () => {
    try {
      if (!user.value) throw new Error('User not authenticated')
      
      loading.value = true
      clearMessages()

      // Update profile to remove avatar URL
      const result = await updateProfile({ avatar_url: null })
      
      if (result.success) {
        setMessage('Avatar removed successfully!', 'success')
      }
      
      return result
    } catch (err: any) {
      setMessage(err.message || 'Failed to remove avatar', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Resend confirmation email
  const resendConfirmationEmail = async (email: string) => {
    try {
      loading.value = true
      clearMessages()

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) throw error

      setMessage('Confirmation email sent!', 'success')
      return { success: true }
    } catch (err: any) {
      setMessage(err.message || 'Failed to resend confirmation email', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      loading.value = true
      clearMessages()

      console.log('🔑 Client: Starting password reset for email:', email)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      console.log('✅ Client: Password reset email sent successfully')
      setMessage('Password reset email sent! Check your email for instructions.', 'success')
      
      return { 
        success: true,
        message: 'Password reset email sent! Check your email for instructions.'
      }
    } catch (err: any) {
      console.log('❌ Client: Password reset error:', err)
      setMessage(err.message || 'Failed to send password reset email', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Sign in with magic link
  const signInWithMagicLink = async (email: string) => {
    try {
      loading.value = true
      clearMessages()

      console.log('🔗 Client: Starting magic link sign in for email:', email)

      const { data, error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (magicLinkError) throw magicLinkError

      console.log('✅ Client: Magic link sent successfully')
      setMessage('Magic link sent! Please check your email and click the link to sign in.', 'success')
      
      return { 
        success: true,
        message: 'Magic link sent! Please check your email and click the link to sign in.'
      }
    } catch (err: any) {
      console.log('❌ Client: Magic link error:', err)
      setMessage(err.message || 'Failed to send magic link', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Sign up with magic link (for new users)
  const signUpWithMagicLink = async (email: string, firstName: string, lastName: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'EDITOR', organizationName?: string) => {
    try {
      loading.value = true
      clearMessages()

      console.log('🔗 Client: Starting magic link sign up for email:', email)

      const { data, error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            firstName,
            lastName,
            role,
            organizationName,
            isSignUp: true
          }
        }
      })

      if (magicLinkError) throw magicLinkError

      console.log('✅ Client: Magic link sent successfully for sign up')
      setMessage('Magic link sent! Please check your email and click the link to complete your registration.', 'success')
      
      return { 
        success: true,
        message: 'Magic link sent! Please check your email and click the link to complete your registration.'
      }
    } catch (err: any) {
      console.log('❌ Client: Magic link sign up error:', err)
      setMessage(err.message || 'Failed to send magic link', 'error')
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Watch for user changes and load profile
  watch(user, async (newUser) => {
    if (newUser) {
      await loadUserProfile()
    } else {
      userProfile.value = null
    }
  }, { immediate: true })

  return {
    // State
    user,
    userProfile: computed(() => userProfile.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    success: computed(() => success.value),
    
    // Computed
    isAuthenticated,
    isAdmin,
    canInviteUsers,
    
    // Methods
    signUp,
    signIn,
    signOut,
    signInWithMagicLink,
    signUpWithMagicLink,
    fetchUserProfile,
    createUserProfile,
    getUserProfile,
    loadUserProfile,
    updateProfile,
    updatePassword,
    uploadAvatar,
    deleteAvatar,
    resendConfirmationEmail,
    resetPassword,
    getRedirectPath,
    redirectToDashboard,
    clearMessages
  }
}
