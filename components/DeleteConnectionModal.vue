<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
        Delete Data Source
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <Icon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500 mt-0.5"/>
          <div>
            <p class="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the data source "<strong>{{ connection?.internal_name }}</strong>"?
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              This action cannot be undone. All associated reports and dashboards may be affected.
            </p>
          </div>
        </div>

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
              color="red"
              class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
              :loading="loading"
              @click="$emit('confirmDelete')"
          >
            Delete Data Source
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
  connection: {
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

