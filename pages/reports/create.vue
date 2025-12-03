<template>
  <div class="space-y-6">
    <!-- Header with Back Button -->
    <div class="flex items-center gap-4 py-6 px-6">
      <UButton
        variant="ghost"
        color="gray"
        icon="i-heroicons-arrow-left"
        @click="navigateTo('/reports')"
      >
        Back to Reports
      </UButton>
    </div>

    <!-- Form Container -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <CreateReportForm
        @report-created="onReportCreated"
        @cancel="onCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CreateReportForm from "../../components/reports/CreateReportForm.vue";

const toast = useToast()

const onReportCreated = () => {
  navigateTo('/reports')
}

const onCancel = () => {
  navigateTo('/reports')
}

// Page meta - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>

