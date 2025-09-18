export const useViewersManagement = (scope: 'organization' | 'admin' = 'organization') => {
  const selectedViewer = ref(null)
  const showAddViewerModal = ref(false)
  const showDeleteConfirmModal = ref(false)
  const viewerToDelete = ref(null)
  const mobilePanel = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Search and selection state
  const searchQuery = ref('')
  const selectedViewers = ref(new Set())
  const showBulkDeleteConfirm = ref(false)

  // Reactive data for viewers
  const viewersData = ref(null)
  const pending = ref(false)
  const fetchError = ref(null)

  // Fetch viewers data from API
  const fetchViewers = async () => {
    try {
      pending.value = true
      fetchError.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/viewers' : '/api/viewers'

      const response = await $fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      viewersData.value = response
    } catch (err) {
      fetchError.value = err
      console.error('Error fetching viewers:', err)
    } finally {
      pending.value = false
    }
  }

  // Watch for user authentication and fetch data
  const user = useSupabaseUser()
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchViewers()
    } else {
      viewersData.value = null
    }
  }, { immediate: true })

  // Refresh function
  const refresh = () => fetchViewers()

  const viewers = computed(() => viewersData.value?.viewers || [])
  const totalViewers = computed(() => viewersData.value?.total || 0)

  // Search functionality
  const filteredViewers = computed(() => {
    if (!searchQuery.value.trim()) {
      return viewers.value
    }
    
    const query = searchQuery.value.toLowerCase()
    return viewers.value.filter(viewer => 
      viewer.name?.toLowerCase().includes(query) ||
      viewer.email?.toLowerCase().includes(query) ||
      viewer.type?.toLowerCase().includes(query) ||
      viewer.group?.toLowerCase().includes(query)
    )
  })

  // Selection functionality
  const isAllSelected = computed(() => {
    return filteredViewers.value.length > 0 && 
           filteredViewers.value.every(viewer => selectedViewers.value.has(viewer.id))
  })

  const toggleSelectAll = (checked) => {
    if (checked) {
      filteredViewers.value.forEach(viewer => {
        selectedViewers.value.add(viewer.id)
      })
    } else {
      filteredViewers.value.forEach(viewer => {
        selectedViewers.value.delete(viewer.id)
      })
    }
  }

  const toggleViewerSelection = (viewerId, checked) => {
    if (checked) {
      selectedViewers.value.add(viewerId)
    } else {
      selectedViewers.value.delete(viewerId)
    }
  }

  // Watch for fetch errors
  watch(fetchError, (newError) => {
    if (newError) {
      error.value = newError.data?.statusMessage || newError.message || 'Failed to load viewers'
    }
  })

  const newViewer = ref({
    email: '',
    firstName: '',
    lastName: '',
    language: '',
    type: '',
    group: '',
    sendInvitation: false
  })

  const viewerTypeOptions = [
    { label: 'Internal', value: 'Internal' },
    { label: 'External', value: 'External' }
  ]

  const groupOptions = [
    { label: 'Sales', value: 'Sales' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Finance', value: 'Finance' }
  ]

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'German', value: 'de' },
    { label: 'French', value: 'fr' }
  ]

  const toggleMobilePanel = (panel) => {
    mobilePanel.value = mobilePanel.value === panel ? null : panel
  }

  const closeMobilePanel = () => {
    mobilePanel.value = null
  }

  const selectViewer = (viewer) => {
    selectedViewer.value = { ...viewer }
    // Debug: Log the selected viewer data
    console.log('Selected viewer:', {
      id: selectedViewer.value.id,
      firstName: selectedViewer.value.firstName,
      lastName: selectedViewer.value.lastName,
      type: selectedViewer.value.type,
      group: selectedViewer.value.group
    })
    // Close mobile panel after selection
    closeMobilePanel()
  }

  const openAddViewerModal = () => {
    error.value = null
    showAddViewerModal.value = true
  }

  const closeAddViewerModal = () => {
    showAddViewerModal.value = false
    newViewer.value = {
      email: '',
      firstName: '',
      lastName: '',
      language: '',
      type: '',
      group: '',
      sendInvitation: false
    }
  }

  const addViewer = async (viewerData) => {
    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/viewers' : '/api/viewers'

      const response = await $fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: {
          email: viewerData.email,
          firstName: viewerData.firstName,
          lastName: viewerData.lastName,
          type: viewerData.type,
          group: viewerData.group,
          sendInvitation: viewerData.sendInvitation
        }
      })
    
      if (response.success) {
        // Refresh the viewers list
        await refresh()
        closeAddViewerModal()
        console.log('Viewer added:', response.viewer)
      }
    } catch (err) {
      error.value = err.data?.statusMessage || 'Failed to add viewer'
      console.error('Error adding viewer:', err)
    } finally {
      loading.value = false
    }
  }

  const saveViewer = async () => {
    if (!selectedViewer.value) return

    try {
      loading.value = true
      error.value = null

      // Debug: Log the current selectedViewer values
      console.log('Saving viewer with data:', {
        id: selectedViewer.value.id,
        firstName: selectedViewer.value.firstName,
        lastName: selectedViewer.value.lastName,
        type: selectedViewer.value.type,
        group: selectedViewer.value.group
      })

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/viewers' : '/api/viewers'

      const response = await $fetch(`${endpoint}/${selectedViewer.value.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          firstName: selectedViewer.value.firstName,
          lastName: selectedViewer.value.lastName,
          type: selectedViewer.value.type,
          group: selectedViewer.value.group
        }
      })

      if (response.success) {
        // Reload the viewers list to get fresh data
        await refresh()
        
        // Update the selected viewer with the response data
        selectedViewer.value = { ...response.viewer }
        
        console.log('Viewer saved successfully:', response.viewer)
      }
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to save viewer'
      console.error('Error saving viewer:', err)
    } finally {
      loading.value = false
    }
  }

  const confirmDeleteViewer = () => {
    if (selectedViewer.value) {
      viewerToDelete.value = selectedViewer.value
      showDeleteConfirmModal.value = true
    }
  }

  const deleteViewer = async () => {
    if (!viewerToDelete.value) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/viewers' : '/api/viewers'

      const response = await $fetch(`${endpoint}/${viewerToDelete.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.success) {
        // Reload the viewers list to get fresh data
        await refresh()
        
        // Clear selection if deleted viewer was selected
        if (selectedViewer.value?.id === viewerToDelete.value.id) {
          selectedViewer.value = null
        }
        
        // Clear selection from selected viewers
        selectedViewers.value.clear()
        
        // Close modals
        showDeleteConfirmModal.value = false
        viewerToDelete.value = null
        
        console.log('Viewer deleted successfully')
      }
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to delete viewer'
      console.error('Error deleting viewer:', err)
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
    if (selectedViewers.value.size > 0) {
      showBulkDeleteConfirm.value = true
    }
  }

  const bulkDeleteViewers = async () => {
    if (selectedViewers.value.size === 0) return

    try {
      loading.value = true
      error.value = null

      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use different API endpoints based on scope
      const endpoint = scope === 'admin' ? '/api/admin/viewers' : '/api/viewers'

      // Delete each selected viewer
      const deletePromises = Array.from(selectedViewers.value).map(viewerId => 
        $fetch(`${endpoint}/${viewerId}`, {
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
        error.value = `${failures.length} viewer(s) could not be deleted`
      }

      // Check for any successful deletions
      const successfulDeletions = results.filter(result => result.status === 'fulfilled' && result.value.success)
      
      if (successfulDeletions.length > 0) {
        // Reload the viewers list to get fresh data
        await refresh()
        
        // Clear selection
        selectedViewers.value.clear()
        
        // Clear selected viewer if it was deleted
        const deletedIds = successfulDeletions.map(result => result.value.viewerId)
        if (selectedViewer.value && deletedIds.includes(selectedViewer.value.id)) {
          selectedViewer.value = null
        }
        
        console.log(`Successfully deleted ${successfulDeletions.length} viewer(s)`)
      }
      
      // Close modal
      showBulkDeleteConfirm.value = false
    } catch (err) {
      error.value = err.data?.statusMessage || err.message || 'Failed to delete viewers'
      console.error('Error bulk deleting viewers:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    selectedViewer,
    showAddViewerModal,
    showDeleteConfirmModal,
    viewerToDelete,
    mobilePanel,
    loading,
    error,
    searchQuery,
    selectedViewers,
    showBulkDeleteConfirm,
    viewersData,
    pending,
    fetchError,
    viewers,
    totalViewers,
    filteredViewers,
    isAllSelected,
    newViewer,
    viewerTypeOptions,
    groupOptions,
    languageOptions,

    // Methods
    fetchViewers,
    refresh,
    toggleMobilePanel,
    closeMobilePanel,
    selectViewer,
    openAddViewerModal,
    closeAddViewerModal,
    addViewer,
    saveViewer,
    confirmDeleteViewer,
    deleteViewer,
    addToGroup,
    confirmBulkDelete,
    bulkDeleteViewers,
    toggleSelectAll,
    toggleViewerSelection
  }
}
