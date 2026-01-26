export const useUsersManagement = (scope: 'organization' | 'admin' = 'organization') => {
  const selectedUser = ref(null)
  const showAddUserModal = ref(false)
  const showDeleteConfirmModal = ref(false)
  const showBulkDeleteConfirm = ref(false)
  const userToDelete = ref(null)
  const mobilePanel = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Search and selection state
  const searchQuery = ref('')
  const selectedUsers = ref(new Set())

  // Reactive data for users
  const usersData = ref(null)
  const pending = ref(false)
  const fetchError = ref(null)

  const users = ref([])

  const totalUsers = computed(() => users.value.length)

  // Search functionality
  const filteredUsers = computed(() => {
    if (!searchQuery.value.trim()) {
      return users.value
    }

    const query = searchQuery.value.toLowerCase()
    return users.value.filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    )
  })

  // Selection functionality
  const isAllSelected = computed(() => {
    return filteredUsers.value.length > 0 &&
      filteredUsers.value.every(user => selectedUsers.value.has(user.id))
  })

  const toggleSelectAll = (checked) => {
    if (checked) {
      filteredUsers.value.forEach(user => {
        selectedUsers.value.add(user.id)
      })
    } else {
      filteredUsers.value.forEach(user => {
        selectedUsers.value.delete(user.id)
      })
    }
  }

  const toggleUserSelection = (userId, checked) => {
    if (checked) {
      selectedUsers.value.add(userId)
    } else {
      selectedUsers.value.delete(userId)
    }
  }

  const newUser = ref({
    email: '',
    firstName: '',
    lastName: ''
  })

  // API functions
  const fetchUsers = async () => {
    try {
      pending.value = true
      fetchError.value = null
      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/users' : '/api/users'

      const response = await $fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      if (response.success) {
        users.value = response.users
      }
    } catch (err) {
      fetchError.value = err
      console.error('Error fetching users:', err)
    } finally {
      pending.value = false
    }
  }

  // Watch for user authentication
  const user = useSupabaseUser()
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchUsers()
    } else {
      users.value = []
    }
  }, { immediate: true })

  // Refresh function
  const refresh = () => fetchUsers()

  // Watch for fetch errors
  watch(fetchError, (newError) => {
    if (newError) {
      error.value = newError.data?.statusMessage || newError.message || 'Failed to load users'
    }
  }, { immediate: true })

  // Mobile panel functions
  const toggleMobilePanel = (panel) => {
    mobilePanel.value = mobilePanel.value === panel ? null : panel
  }

  const closeMobilePanel = () => {
    mobilePanel.value = null
  }

  // User selection
  const selectUser = (user) => {
    selectedUser.value = { ...user }
    // Close mobile panel after selection
    closeMobilePanel()
  }

  // Add user functions
  const openAddUserModal = () => {
    error.value = null
    showAddUserModal.value = true
  }

  const closeAddUserModal = () => {
    showAddUserModal.value = false
    newUser.value = {
      email: '',
      firstName: '',
      lastName: ''
    }
  }

  const addUser = async (userData) => {
    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/users' : '/api/users'

      const response = await $fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      })

      if (response.success) {
        // Reload the users list to get fresh data
        await refresh()
        closeAddUserModal()
        console.log('User added:', response.user)
      }
    } catch (err) {
      error.value = err.data?.error || err.data?.statusMessage || 'Failed to add user'
      console.error('Error adding user:', err)
    } finally {
      loading.value = false
    }
  }

  // Save user function
  const saveUser = async () => {
    if (!selectedUser.value) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/users' : '/api/users'

      const response = await $fetch(`${endpoint}/${selectedUser.value.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          firstName: selectedUser.value.firstName,
          lastName: selectedUser.value.lastName,
          role: selectedUser.value.role
        }
      })

      if (response.success) {
        // Reload the users list to get fresh data
        await refresh()

        // Update the selected user with the response data
        selectedUser.value = { ...response.user }

        console.log('User saved successfully:', response.user)
      }
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to save user'
      console.error('Error saving user:', err)
    } finally {
      loading.value = false
    }
  }

  // Delete user functions
  const confirmDeleteUser = () => {
    if (selectedUser.value) {
      userToDelete.value = selectedUser.value
      showDeleteConfirmModal.value = true
    }
  }

  const deleteUser = async () => {
    if (!userToDelete.value) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/users' : '/api/users'

      const response = await $fetch(`${endpoint}/${userToDelete.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.success) {
        // Reload the users list to get fresh data
        await refresh()

        // Clear selection if deleted user was selected
        if (selectedUser.value?.id === userToDelete.value.id) {
          selectedUser.value = null
        }

        // Clear selection from selected users
        selectedUsers.value.clear()

        // Close modals
        showDeleteConfirmModal.value = false
        userToDelete.value = null

        console.log('User deleted successfully')
      }
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to delete user'
      console.error('Error deleting user:', err)
    } finally {
      loading.value = false
    }
  }

  // Bulk action functions
  const addToGroup = () => {
    console.log('Add to group functionality - to be implemented')
    // TODO: Implement add to group functionality
  }

  const confirmBulkDelete = () => {
    if (selectedUsers.value.size > 0) {
      showBulkDeleteConfirm.value = true
    }
  }

  const bulkDeleteUsers = async () => {
    if (selectedUsers.value.size === 0) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/users' : '/api/users'

      // Delete each selected user
      const deletePromises = Array.from(selectedUsers.value).map(userId =>
        $fetch(`${endpoint}/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })
      )

      const results = await Promise.allSettled(deletePromises)

      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some deletions failed:', failures)
        error.value = `${failures.length} user(s) could not be deleted`
      }

      // Check for any successful deletions
      const successfulDeletions = results.filter(result => result.status === 'fulfilled' && result.value.success)

      if (successfulDeletions.length > 0) {
        // Reload the users list to get fresh data
        await refresh()

        // Clear selection
        selectedUsers.value.clear()

        // Clear selected user if it was deleted
        const deletedIds = successfulDeletions.map(result => result.value.userId)
        if (selectedUser.value && deletedIds.includes(selectedUser.value.id)) {
          selectedUser.value = null
        }

        console.log(`Successfully deleted ${successfulDeletions.length} user(s)`)
      }

      // Close modal
      showBulkDeleteConfirm.value = false
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to delete users'
      console.error('Error bulk deleting users:', err)
    } finally {
      loading.value = false
    }
  }

  // Resend invitation function
  const resendInvitation = async () => {
    if (!selectedUser.value) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      const response = await $fetch(`/api/users/${selectedUser.value.id}/resend-invitation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.success) {
        // Show success message using toast
        const toast = useToast()
        toast.add({
          title: 'Success',
          description: response.message || 'Invitation email resent successfully',
          color: 'green'
        })

        console.log('Invitation email resent:', response.message)
      }
    } catch (err) {
      error.value = err.data?.error || err.data?.statusMessage || 'Failed to resend invitation email'
      console.error('Error resending invitation:', err)

      // Show error message using toast
      const toast = useToast()
      toast.add({
        title: 'Error',
        description: error.value,
        color: 'red'
      })
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    selectedUser,
    showAddUserModal,
    showDeleteConfirmModal,
    showBulkDeleteConfirm,
    userToDelete,
    mobilePanel,
    loading,
    error,
    searchQuery,
    selectedUsers,
    usersData,
    pending,
    fetchError,
    users,
    totalUsers,
    filteredUsers,
    isAllSelected,
    newUser,

    // Methods
    fetchUsers,
    refresh,
    toggleMobilePanel,
    closeMobilePanel,
    selectUser,
    openAddUserModal,
    closeAddUserModal,
    addUser,
    saveUser,
    confirmDeleteUser,
    deleteUser,
    addToGroup,
    confirmBulkDelete,
    bulkDeleteUsers,
    toggleSelectAll,
    toggleUserSelection,
    resendInvitation
  }
}
