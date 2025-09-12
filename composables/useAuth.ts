import { ref, computed, watch } from 'vue'

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
  role: 'ADMIN' | 'EDITOR'
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
  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: 'ADMIN' | 'EDITOR' = 'EDITOR', organizationName?: string) => {
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

      setMessage('Account created successfully!', 'success')
      return { success: true, requiresEmailConfirmation: false }
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
        .select('*')
        .eq('user_id', user.value.id)
        .single()

      if (profileError) throw profileError

      // Update the reactive profile ref
      userProfile.value = data
      return data
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

  // Update user profile
  const updateProfile = async (updates: { firstName?: string; lastName?: string; avatar_url?: string | null }) => {
    try {
      if (!user.value) throw new Error('User not authenticated')
      
      loading.value = true
      clearMessages()

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (error) throw error

      // Update local profile state
      userProfile.value = { ...userProfile.value, ...data }
      setMessage('Profile updated successfully!', 'success')
      return { success: true, profile: data }
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

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.value.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

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
    fetchUserProfile,
    createUserProfile,
    getUserProfile,
    loadUserProfile,
    updateProfile,
    updatePassword,
    uploadAvatar,
    deleteAvatar,
    clearMessages
  }
}
