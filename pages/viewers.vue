<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
    <!-- Mobile Viewers Toggle -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('viewers')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
        Viewers ({{ viewers.length }})
      </UButton>
    </div>

    <!-- Viewers List -->
    <div 
      :class="[
        'border-r p-4 lg:p-6 transition-all duration-300',
        'w-full lg:w-1/3',
        mobilePanel === 'viewers' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 class="text-xl font-bold">Viewers</h2>
        <UButton size="sm" @click="openAddViewerModal" class="w-full sm:w-auto">
          <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
          Add Viewer
        </UButton>
      </div>
      
      <div class="space-y-2">
        <UCard 
          v-for="viewer in viewers" 
          :key="viewer.id"
          class="cursor-pointer hover:bg-gray-50"
          @click="selectViewer(viewer)"
        >
          <div class="p-4">
            <div>
              <h4 class="font-medium truncate">{{ viewer.name }}</h4>
              <p class="text-sm text-gray-600 truncate">{{ viewer.email }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <UBadge :color="viewer.type === 'External' ? 'red' : 'blue'" class="text-xs">
                  {{ viewer.type }}
                </UBadge>
                <UBadge color="gray" class="text-xs">
                  {{ viewer.group }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Viewer Details -->
    <div class="flex-1 p-4 lg:p-6">
      <div v-if="selectedViewer">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Viewer Details</h2>
          <button 
            @click="closeMobilePanel"
            class="lg:hidden p-1 hover:bg-gray-200 rounded"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
        <UCard>
          <div class="p-4 lg:p-6 space-y-4">
            <UFormGroup label="Name">
              <UInput v-model="selectedViewer.name" />
            </UFormGroup>
            
            <UFormGroup label="Email">
              <UInput v-model="selectedViewer.email" />
            </UFormGroup>
            
            <UFormGroup label="Viewer Type">
              <USelect 
                v-model="selectedViewer.type"
                :options="viewerTypeOptions"
              />
            </UFormGroup>
            
            <UFormGroup label="Group">
              <USelect 
                v-model="selectedViewer.group"
                :options="groupOptions"
              />
            </UFormGroup>
            
            <div class="flex flex-col sm:flex-row gap-2 pt-4">
              <UButton @click="saveViewer" class="w-full sm:w-auto">
                Save Changes
              </UButton>
              <UButton color="red" variant="outline" @click="deleteViewer" class="w-full sm:w-auto">
                Delete Viewer
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
      
      <div v-else class="flex items-center justify-center h-full text-gray-500">
        <div class="text-center">
          <Icon name="heroicons:eye" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a viewer to view details</p>
        </div>
      </div>
    </div>

    <!-- Add Viewer Modal -->
    <UModal v-model="showAddViewerModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add Viewer</h3>
        </template>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Email">
              <UInput placeholder="viewer@example.com" v-model="newViewer.email" />
            </UFormGroup>
            <UFormGroup label="First Name">
              <UInput placeholder="First Name" v-model="newViewer.firstName" />
            </UFormGroup>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Last Name">
              <UInput placeholder="Last Name" v-model="newViewer.lastName" />
            </UFormGroup>
            <UFormGroup label="Language">
              <USelect 
                v-model="newViewer.language"
                :options="languageOptions"
                placeholder="English"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Viewer Type">
            <USelect 
              v-model="newViewer.type"
              :options="viewerTypeOptions"
              placeholder="Select type"
            />
          </UFormGroup>

          <UFormGroup label="Groups">
            <USelect 
              v-model="newViewer.group"
              :options="groupOptions"
              placeholder="Select group"
            />
          </UFormGroup>

          <UCheckbox v-model="newViewer.sendInvitation">
            Send invitation emails
          </UCheckbox>

          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="closeAddViewerModal">
              Cancel
            </UButton>
            <UButton @click="addViewer">
              Add Viewer
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
const selectedViewer = ref(null)
const showAddViewerModal = ref(false)
const mobilePanel = ref(null)

const viewers = ref([
  { 
    id: 1, 
    email: 'viewer1@external.com', 
    name: 'Alice Brown', 
    type: 'External', 
    group: 'Sales' 
  },
  { 
    id: 2, 
    email: 'viewer2@external.com', 
    name: 'Bob Wilson', 
    type: 'Internal', 
    group: 'Marketing' 
  }
])

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
  // Close mobile panel after selection
  closeMobilePanel()
}

const openAddViewerModal = () => {
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

const addViewer = () => {
  const viewer = {
    id: Date.now(),
    email: newViewer.value.email,
    name: `${newViewer.value.firstName} ${newViewer.value.lastName}`,
    type: newViewer.value.type,
    group: newViewer.value.group
  }
  
  viewers.value.push(viewer)
  closeAddViewerModal()
  console.log('Viewer added:', viewer)
}

const saveViewer = () => {
  if (selectedViewer.value) {
    const viewerIndex = viewers.value.findIndex(v => v.id === selectedViewer.value.id)
    if (viewerIndex !== -1) {
      viewers.value[viewerIndex] = { ...selectedViewer.value }
    }
    console.log('Viewer saved:', selectedViewer.value)
  }
}

const deleteViewer = () => {
  if (selectedViewer.value) {
    const viewerIndex = viewers.value.findIndex(v => v.id === selectedViewer.value.id)
    if (viewerIndex !== -1) {
      viewers.value.splice(viewerIndex, 1)
      selectedViewer.value = null
    }
    console.log('Viewer deleted')
  }
}
</script>
