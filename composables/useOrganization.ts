import {computed, ref} from 'vue'

export interface OrganizationDetails {
  id: string
  name: string
  viewer_count: number
  created_at: string
  created_by?: string
  user_count: number
  total_members: number
}

export const useOrganization = () => {
  const organizationDetails = ref<OrganizationDetails | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get organization details from user profile (no API call needed)
  const getOrganizationDetails = (userProfile: any) => {
    if (!userProfile?.organization) {
      organizationDetails.value = null
      return null
    }

    // Use organization data from user profile
    const org = userProfile.organization
    
    // For now, we'll use a placeholder for user count since the API is failing
    // In a real scenario, you might want to get this from a different source
    const estimatedUserCount = 1 // At least the current user
    
    organizationDetails.value = {
      id: org.id,
      name: org.name,
      viewer_count: org.viewer_count || 0,
      created_at: org.created_at,
      created_by: org.created_by,
      user_count: estimatedUserCount,
      total_members: estimatedUserCount + (org.viewer_count || 0)
    }

    return organizationDetails.value
  }

  // Fetch user count for the organization
  const fetchUserCount = async (organizationId: string) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await $fetch(`/api/organizations/details?id=${organizationId}`, {
        credentials: 'include'
      })

      if (fetchError) {
        throw new Error(fetchError)
      }

      // Update the existing organization details with user count
      if (organizationDetails.value) {
        organizationDetails.value.user_count = data.organization.user_count || 0
        organizationDetails.value.total_members = (data.organization.user_count || 0) + (data.organization.viewer_count || 0)
      }

      return data.organization
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user count'
      console.error('Error fetching user count:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Computed properties
  const hasOrganization = computed(() => !!organizationDetails.value)
  const organizationName = computed(() => organizationDetails.value?.name || 'Unknown Organization')
  const totalMembers = computed(() => organizationDetails.value?.total_members || 0)
  const userCount = computed(() => organizationDetails.value?.user_count || 0)
  const viewerCount = computed(() => organizationDetails.value?.viewer_count || 0)

    // Update organization name
    const updateOrganizationName = async (organizationId: string, newName: string) => {
        try {
            loading.value = true
            error.value = null

            const response = await $fetch(`/api/organizations/${organizationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${(await useSupabaseClient().auth.getSession()).data.session?.access_token}`
                },
                body: {
                    name: newName
                }
            })

            if (response.success && organizationDetails.value) {
                // Update the local organization details
                organizationDetails.value.name = newName
            }

            return response
        } catch (err: any) {
            error.value = err.message || 'Failed to update organization name'
            console.error('Error updating organization name:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

  // Clear organization data
  const clearOrganization = () => {
    organizationDetails.value = null
    error.value = null
  }

  return {
    organizationDetails,
    loading,
    error,
    getOrganizationDetails,
    fetchUserCount,
      updateOrganizationName,
    hasOrganization,
    organizationName,
    totalMembers,
    userCount,
    viewerCount,
    clearOrganization
  }
}
