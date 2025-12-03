<template>
  <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between py-6 px-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Reports</h1>
        <UButton
          color="orange"
          @click="navigateTo('/reports/create')"
          icon="i-heroicons-plus"
          class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
        >
          Create New Report
        </UButton>
      </div>

      <!-- Reports List -->
      <div>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Your Reports</h2>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Interval & Time
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-if="loading" class="text-center">
                  <td colspan="6" class="px-6 py-4">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin h-5 w-5 mx-auto" />
                  </td>
                </tr>
                <tr v-else-if="reports.length === 0" class="text-center">
                  <td colspan="6" class="px-6 py-4 text-gray-500 dark:text-gray-400">
                    No reports found. Create your first scheduled report.
                  </td>
                </tr>
                <tr v-else v-for="report in reports" :key="report.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ report.report_title }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ getIntervalDisplay(report) }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ report.send_time }} ({{ report.timezone }})
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ getRecipientCount(report) }} Recipients
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="getStatusClasses(report.status)"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    >
                      {{ report.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ getNextRunTime(report) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <UButton
                      variant="outline"
                      size="xs"
                      color="gray"
                      @click="editReport(report)"
                      icon="i-heroicons-pencil"
                      class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      Edit
                    </UButton>
                    <UButton
                      variant="outline"
                      :color="report.status === 'Active' ? 'gray' : 'green'"
                      size="xs"
                      @click="toggleReportStatus(report)"
                      :icon="report.status === 'Active' ? 'i-heroicons-pause' : 'i-heroicons-play'"
                      class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      {{ report.status === 'Active' ? 'Pause' : 'Activate' }}
                    </UButton>
                    <UButton
                      variant="outline"
                      size="xs"
                      color="red"
                      @click="deleteReport(report)"
                      icon="i-heroicons-trash"
                      class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
                    >
                      Delete
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <DeleteReportModal
        :is-open="deleteModalOpen"
        :report-to-delete="reportToDelete"
        :loading="deleteLoading"
        @update:is-open="deleteModalOpen = $event"
        @close-modal="closeDeleteModal"
        @confirm-delete="confirmDeleteReport"
      />
    </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useScheduledReportsService} from '~/composables/useScheduledReportsService'

const { listReports, toggleReportStatus: toggleStatus, deleteReport: deleteReportService, getEmailQueueForReport } = useScheduledReportsService()
const toast = useToast()

const reports = ref([])
const loading = ref(true)
const nextRunTimes = ref(new Map())

// Delete modal state
const deleteModalOpen = ref(false)
const reportToDelete = ref(null)
const deleteLoading = ref(false)

// Types
type Report = Awaited<ReturnType<typeof listReports>>[0]

const fetchReports = async () => {
  try {
    loading.value = true
    reports.value = await listReports()

    // Fetch next run times for all reports
    const runTimePromises = reports.value.map(async (report) => {
      try {
        const queueItems = await getEmailQueueForReport(report.id)
        if (queueItems.length > 0) {
          return [report.id, new Date(queueItems[0].scheduled_for).toLocaleString()]
        }
        return [report.id, 'No upcoming runs']
      } catch (error) {
        console.error(`Error fetching next run time for report ${report.id}:`, error)
        return [report.id, 'Error loading']
      }
    })

    const runTimeResults = await Promise.all(runTimePromises)
    nextRunTimes.value = new Map(runTimeResults)

  } catch (error) {
    console.error('Error fetching reports:', error)
    // Show error toast notification
    toast.add({
      title: 'Error',
      description: 'Failed to fetch reports. Please try again.',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

const toggleReportStatus = async (report: Report) => {
  try {
    const result = await toggleStatus(report.id, report.status)
    report.status = result.newStatus
    toast.add({
      title: 'Success',
      description: `Report ${result.newStatus === 'Active' ? 'activated' : 'paused'} successfully`,
      color: 'green'
    })
  } catch (error) {
    console.error('Error updating report status:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to update report status',
      color: 'red'
    })
  }
}

const deleteReport = (report: Report) => {
  reportToDelete.value = report
  deleteModalOpen.value = true
}

const closeDeleteModal = () => {
  deleteModalOpen.value = false
  reportToDelete.value = null
  deleteLoading.value = false
}

const confirmDeleteReport = async () => {
  if (!reportToDelete.value) return

  try {
    deleteLoading.value = true
    await deleteReportService(reportToDelete.value.id)
    reports.value = reports.value.filter(r => r.id !== reportToDelete.value.id)
    toast.add({
      title: 'Success',
      description: 'Report deleted successfully',
      color: 'green'
    })
    closeDeleteModal()
  } catch (error) {
    console.error('Error deleting report:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to delete report',
      color: 'red'
    })
  } finally {
    deleteLoading.value = false
  }
}

const editReport = (report: Report) => {
  navigateTo(`/reports/edit/${report.id}`)
}

const getIntervalDisplay = (report: Report) => {
  if (report.interval === 'WEEKLY' && report.day_of_week) {
    const days = report.day_of_week.map(d => d.slice(0, 2)).join(', ')
    return `Weekly on ${days}`
  }
  return report.interval.charAt(0) + report.interval.slice(1).toLowerCase()
}

const getRecipientCount = (report: Report) => {
  return Array.isArray(report.recipients) ? report.recipients.length : 0
}

const getStatusClasses = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    case 'Paused':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}

// Get next run time from the pre-fetched data
const getNextRunTime = (report: Report) => {
  // Paused reports don't have next runs
  if (report.status === 'Paused') {
    return 'Paused'
  }

  return nextRunTimes.value.get(report.id) || 'Loading...'
}

onMounted(() => {
  fetchReports()
})

// Page meta - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>
