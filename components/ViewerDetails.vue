<template>
  <div v-if="selectedViewer">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold">Viewer Details</h2>
      <button 
        @click="$emit('closeMobilePanel')"
        class="lg:hidden p-1 hover:bg-gray-200 rounded"
      >
        <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
      </button>
    </div>
    <UCard>
      <div class="p-4 lg:p-6 space-y-4">
        <UFormField label="First Name">
          <UInput v-model="selectedViewer.firstName" />
        </UFormField>

        <UFormField label="Last Name">
          <UInput v-model="selectedViewer.lastName" />
        </UFormField>

        <UFormField label="Email">
          <UInput v-model="selectedViewer.email" disabled />
        </UFormField>

        <UFormField label="Viewer Type">
          <USelect 
            v-model="selectedViewer.type"
            :options="viewerTypeOptions"
          />
        </UFormField>

        <UFormField label="Group">
          <USelect 
            v-model="selectedViewer.group"
            :options="groupOptions"
          />
        </UFormField>
        
        <div class="flex flex-col sm:flex-row gap-2 pt-4">
          <button 
            @click="$emit('saveViewer')" 
            :disabled="loading"
            class="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            Save Changes
          </button>
          <UButton color="red" variant="outline" @click="$emit('confirmDeleteViewer')" :disabled="loading" class="w-full sm:w-auto">
            Delete Viewer
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
  
  <div v-else class="flex items-center justify-center h-full text-gray-500">
    <div class="text-center">
      <Icon name="i-heroicons-eye" class="w-12 h-12 mx-auto mb-4 text-gray-300"/>
      <p>Select a viewer to view details</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedViewer: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['closeMobilePanel', 'saveViewer', 'confirmDeleteViewer'])

const viewerTypeOptions = [
  { label: 'Internal', value: 'Internal' },
  { label: 'External', value: 'External' }
]

const groupOptions = [
  { label: 'Sales', value: 'Sales' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Finance', value: 'Finance' }
]
</script>
