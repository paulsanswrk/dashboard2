<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-semibold text-red-600">Delete Viewer</h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to delete <strong>{{ viewerToDelete?.name || 'this viewer' }}</strong>?
          This action cannot be undone.
        </p>

        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="$emit('closeModal')" :disabled="loading">
            Cancel
          </UButton>
          <UButton color="red" @click="$emit('confirmDelete')" :loading="loading" :disabled="loading">
            Delete Viewer
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  viewerToDelete: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isOpen', 'closeModal', 'confirmDelete'])
</script>
