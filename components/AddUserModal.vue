<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
        Add New User
      </h3>
    </template>

    <template #body>
      <form @submit.prevent="submitForm" class="space-y-4">
        <UFormField label="Email Address" required>
          <UInput v-model="newUser.email" type="email" placeholder="Enter email address" class="w-full"/>
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="First Name" required>
            <UInput v-model="newUser.firstName" placeholder="Enter first name" class="w-full"/>
          </UFormField>

          <UFormField label="Last Name" required>
            <UInput v-model="newUser.lastName" placeholder="Enter last name" class="w-full"/>
          </UFormField>
        </div>

        <UFormField label="Role">
          <USelect
            v-model="newUser.role"
            :items="roleOptions"
            placeholder="Select role"
            class="w-full"
          />
        </UFormField>

        <label class="flex items-center gap-2 pt-2 cursor-pointer">
          <UCheckbox
            v-model="newUser.sendInvitationEmail"
            color="primary"
            :ui="{ border: 'border-gray-300 dark:border-gray-500' }"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">Send invitation email</span>
        </label>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="$emit('closeModal')" :disabled="loading">
            Cancel
          </UButton>
          <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white dark:text-black cursor-pointer" :loading="loading">
            Add User
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

const emit = defineEmits(['update:isOpen', 'closeModal', 'addUser'])

const roleOptions = [
  {label: 'Editor', value: 'EDITOR'},
  {label: 'Admin', value: 'ADMIN'}
]

const newUser = ref({
  email: '',
  firstName: '',
  lastName: '',
  role: 'EDITOR',
  sendInvitationEmail: true
})

const submitForm = () => {
  emit('addUser', newUser.value)
}

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    newUser.value = {
      email: '',
      firstName: '',
      lastName: '',
      role: 'EDITOR',
      sendInvitationEmail: true
    }
  }
})
</script>
