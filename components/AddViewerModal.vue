<template>
  <UModal :model-value="isOpen" @update:model-value="$emit('update:isOpen', $event)">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">Add Viewer</h3>
      </template>
      
      <form @submit.prevent="$emit('addViewer', newViewer)" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Email" required>
            <UInput placeholder="viewer@example.com" v-model="newViewer.email" type="email" required />
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

        <UFormGroup label="Viewer Type" required>
          <USelect 
            v-model="newViewer.type"
            :options="viewerTypeOptions"
            placeholder="Select type"
            required
          />
        </UFormGroup>

        <UFormGroup label="Groups">
          <USelect 
            v-model="newViewer.group"
            :options="groupOptions"
            placeholder="Select group"
          />
        </UFormGroup>

        <UFormGroup>
          <UCheckbox v-model="newViewer.sendInvitation" label="Send invitation emails" />
        </UFormGroup>

        <!-- Error display in modal -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton type="button" variant="outline" @click="$emit('closeModal')" :disabled="loading">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading" :disabled="loading" color="green">
            Add Viewer
          </UButton>
        </div>
      </form>
    </UCard>
  </UModal>
</template>

<script setup>
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:isOpen', 'closeModal', 'addViewer'])

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

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
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
})
</script>
