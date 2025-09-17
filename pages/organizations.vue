<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-heading font-bold tracking-tight">Organizations</h1>
      <UButton color="orange" @click="openCreateOrganizationModal">
        <Icon name="heroicons:plus" class="w-4 h-4 mr-1" />
        New Organization
      </UButton>
    </div>

    <!-- Organizations Table -->
    <UCard class="bg-white dark:bg-gray-800">
      <template #header>
        <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">All Organizations</h3>
      </template>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
              <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Users</th>
              <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
              <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
              <th class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="org in organizations" :key="org.id" class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <Icon name="heroicons:building-office" class="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 dark:text-white">{{ org.name }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ org.id }}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:users" class="w-4 h-4 text-gray-400" />
                  <span class="text-gray-900 dark:text-white">{{ org.user_count || 0 }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-gray-900 dark:text-white">
                {{ formatDate(org.created_at) }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="org.status === 'active' ? 'green' : 'gray'" variant="soft">
                  {{ org.status || 'Active' }}
                </UBadge>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center justify-end gap-2">
                  <UButton variant="ghost" size="sm" @click="editOrganization(org)">
                    <Icon name="heroicons:pencil" class="w-4 h-4" />
                  </UButton>
                  <UButton variant="ghost" size="sm" color="red" @click="deleteOrganization(org)">
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Create/Edit Organization Modal -->
    <UModal v-model="isCreateModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            {{ editingOrganization ? 'Edit Organization' : 'Create New Organization' }}
          </h3>
        </template>
        
        <form @submit.prevent="saveOrganization" class="space-y-4">
          <UFormGroup label="Organization Name" required>
            <UInput v-model="organizationForm.name" placeholder="Enter organization name" />
          </UFormGroup>
          
          <UFormGroup label="Description">
            <UTextarea v-model="organizationForm.description" placeholder="Enter organization description" />
          </UFormGroup>
          
          <div class="flex justify-end gap-3 pt-4">
            <UButton variant="ghost" @click="closeCreateModal">Cancel</UButton>
            <UButton type="submit" color="orange" :loading="isLoading">
              {{ editingOrganization ? 'Update' : 'Create' }} Organization
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
// Authentication
const { userProfile } = useAuth()

// State
const organizations = ref([])
const isLoading = ref(false)
const isCreateModalOpen = ref(false)
const editingOrganization = ref(null)

// Form data
const organizationForm = ref({
  name: '',
  description: ''
})

// Load organizations
const loadOrganizations = async () => {
  try {
    isLoading.value = true
    // Mock data for now - replace with actual API call
    organizations.value = [
      {
        id: '1',
        name: 'Acme Corporation',
        description: 'Main organization',
        user_count: 12,
        created_at: '2024-01-15T10:30:00Z',
        status: 'active'
      },
      {
        id: '2',
        name: 'Tech Solutions Inc',
        description: 'Technology solutions provider',
        user_count: 8,
        created_at: '2024-02-20T14:15:00Z',
        status: 'active'
      }
    ]
  } catch (error) {
    console.error('Error loading organizations:', error)
  } finally {
    isLoading.value = false
  }
}

// Format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Modal functions
const openCreateOrganizationModal = () => {
  editingOrganization.value = null
  organizationForm.value = { name: '', description: '' }
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
  editingOrganization.value = null
  organizationForm.value = { name: '', description: '' }
}

const editOrganization = (org) => {
  editingOrganization.value = org
  organizationForm.value = {
    name: org.name,
    description: org.description || ''
  }
  isCreateModalOpen.value = true
}

// Save organization
const saveOrganization = async () => {
  try {
    isLoading.value = true
    
    if (editingOrganization.value) {
      // Update existing organization
      const index = organizations.value.findIndex(org => org.id === editingOrganization.value.id)
      if (index !== -1) {
        organizations.value[index] = {
          ...organizations.value[index],
          ...organizationForm.value
        }
      }
    } else {
      // Create new organization
      const newOrg = {
        id: Date.now().toString(),
        ...organizationForm.value,
        user_count: 0,
        created_at: new Date().toISOString(),
        status: 'active'
      }
      organizations.value.unshift(newOrg)
    }
    
    closeCreateModal()
  } catch (error) {
    console.error('Error saving organization:', error)
  } finally {
    isLoading.value = false
  }
}

// Delete organization
const deleteOrganization = async (org) => {
  if (confirm(`Are you sure you want to delete "${org.name}"?`)) {
    try {
      const index = organizations.value.findIndex(o => o.id === org.id)
      if (index !== -1) {
        organizations.value.splice(index, 1)
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
    }
  }
}

// Load organizations on mount
onMounted(() => {
  loadOrganizations()
})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
