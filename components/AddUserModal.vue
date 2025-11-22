<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">Add New User</h3>
    </template>

    <template #body>
      <form @submit.prevent="$emit('addUser', newUser)" class="space-y-4">
        <UFormField label="Email" required>
          <UInput v-model="newUser.email" placeholder="user@company.com" type="email" required class="w-full"/>
        </UFormField>

        <UFormField label="First Name">
          <UInput v-model="newUser.firstName" placeholder="John" class="w-full"/>
        </UFormField>

        <UFormField label="Last Name">
          <UInput v-model="newUser.lastName" placeholder="Doe" class="w-full"/>
        </UFormField>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton type="button" variant="outline" @click="$emit('closeModal')" :disabled="loading">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading" :disabled="loading" color="green">
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

const newUser = ref({
  email: '',
  firstName: '',
  lastName: ''
})

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    newUser.value = {
      email: '',
      firstName: '',
      lastName: ''
    }
  }
})
</script>
