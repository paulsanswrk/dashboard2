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

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-orange-600" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div class="text-center">
        <UIcon name="i-heroicons-exclamation-circle" class="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Report</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
        <UButton color="orange" @click="navigateTo('/reports')">
          Return to Reports
        </UButton>
      </div>
    </div>

    <!-- Form Container -->
    <div v-else-if="report" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <CreateReportForm
        :editing-report="report"
        @report-created="onReportUpdated"
        @cancel="onCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useScheduledReportsService} from '~/composables/useScheduledReportsService'
import CreateReportForm from '~/components/reports/CreateReportForm.vue'

const route = useRoute()
const toast = useToast()
const { getReport } = useScheduledReportsService()

const loading = ref(true)
const error = ref<string | null>(null)
const report = ref(null)

const loadReport = async () => {
  try {
    loading.value = true
    error.value = null
    
    const reportId = route.params.id as string
    const data = await getReport(reportId)
    
    if (!data) {
      error.value = 'Report not found'
      return
    }
    
    report.value = data
  } catch (err: any) {
    console.error('Error loading report:', err)
    error.value = err.message || 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const onReportUpdated = () => {
  navigateTo('/reports')
}

const onCancel = () => {
  navigateTo('/reports')
}

onMounted(() => {
  loadReport()
})

// Page meta - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>

