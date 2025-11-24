<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
        Rename Data Source
      </h3>
    </template>

    <template #body>
      <form @submit.prevent="handleRename" class="space-y-4">
        <UFormField label="New Name" required>
          <UInput
              v-model="newName"
              placeholder="Enter new name"
              class="w-full"
              :disabled="loading"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
              variant="ghost"
              class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              @click="$emit('closeModal')"
              :disabled="loading"
          >
            Cancel
          </UButton>
          <UButton
              type="submit"
              color="orange"
              class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              :loading="loading"
              :disabled="!newName.trim() || newName.trim() === connection?.internal_name"
          >
            Rename
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
  connection: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isOpen', 'closeModal', 'confirmRename'])

const newName = ref('')

// Reset form when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue && props.connection) {
    newName.value = props.connection.internal_name
  }
})

function handleRename() {
  if (!newName.value.trim() || newName.value.trim() === props.connection?.internal_name) return

  emit('confirmRename', {
    id: props.connection.id,
    newName: newName.value.trim()
  })
}
</script>

