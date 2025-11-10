<template>
  <UModal :model-value="isOpen" @update:model-value="$emit('update:isOpen', $event)">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Delete Report</h3>
      </template>

      <div class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete <strong>"{{ reportToDelete?.report_title || 'this report' }}"</strong>?
          This action cannot be undone and will permanently remove the scheduled report.
        </p>

        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="$emit('closeModal')" :disabled="loading">
            Cancel
          </UButton>
          <UButton color="red" @click="$emit('confirmDelete')" :loading="loading" :disabled="loading">
            Delete Report
          </UButton>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup>
const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  reportToDelete: {
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
