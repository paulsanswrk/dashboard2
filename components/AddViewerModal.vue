<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Add Viewer</h3>
    </template>

    <template #body>
      <form @submit.prevent="$emit('addViewer', newViewer)" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Email" required>
            <UInput placeholder="viewer@example.com" v-model="newViewer.email" type="email" required class="w-full"/>
          </UFormField>
          <UFormField label="First Name">
            <UInput placeholder="First Name" v-model="newViewer.firstName" class="w-full"/>
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Last Name">
            <UInput placeholder="Last Name" v-model="newViewer.lastName" class="w-full"/>
          </UFormField>
          <UFormField label="Language">
            <USelect
                v-model="newViewer.language"
                :options="languageOptions"
                placeholder="English"
            />
          </UFormField>
        </div>

        <UFormField label="Viewer Type" required>
          <USelect
              v-model="newViewer.type"
              :options="viewerTypeOptions"
              placeholder="Select type"
              required
          />
        </UFormField>

        <UFormField label="Groups">
          <USelect
              v-model="newViewer.group"
              :options="groupOptions"
              placeholder="Select group"
          />
        </UFormField>

        <UFormField>
          <UCheckbox v-model="newViewer.sendInvitation" label="Send invitation emails"/>
        </UFormField>

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
    </template>
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
