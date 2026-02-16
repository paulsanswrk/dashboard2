<template>
  <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between py-6 px-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Email Queue Monitor</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Last updated: {{ lastUpdated ? formatDateTime(lastUpdated) : 'Never' }}
            <span v-if="autoRefreshEnabled" class="ml-2 text-green-600 dark:text-green-400">
              • Auto-refresh ON ({{ autoRefreshInterval }}s)
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <USelect
            v-model="statusFilter"
            :items="statusFilterOptions"
            placeholder="Filter by status"
            class="w-48"
          />
          <UButton
              @click="toggleAutoRefresh"
              :variant="autoRefreshEnabled ? 'solid' : 'outline'"
              :icon="autoRefreshEnabled ? 'i-heroicons-pause' : 'i-heroicons-play'"
              :ui="{ base: 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors' }"
              size="sm"
          >
            {{ autoRefreshEnabled ? 'Pause' : 'Auto' }}
          </UButton>
          <UButton
            @click="fetchQueue"
            variant="outline"
            icon="i-heroicons-arrow-path"
            :ui="{ base: 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors' }"
            :loading="loading"
          >
            Refresh
          </UButton>
          <UButton
              @click="runCronJob"
              variant="outline"
              icon="i-heroicons-play"
              :ui="{ base: 'cursor-pointer hover:bg-green-600 hover:text-white transition-colors' }"
              :loading="cronRunning"
              color="green"
          >
            Run Cron
          </UButton>
        </div>
      </div>

      <!-- Queue Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Report ID
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Scheduled For
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attempt Count
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Processed At
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Error Message
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="loading" class="text-center">
                <td colspan="7" class="px-6 py-4">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin h-5 w-5 mx-auto" />
                </td>
              </tr>
              <tr v-else-if="queueItems.length === 0" class="text-center">
                <td colspan="7" class="px-6 py-4 text-gray-500 dark:text-gray-400">
                  No queue items found.
                </td>
              </tr>
              <tr v-else v-for="item in queueItems" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    <UButton
                        variant="outline"
                      size="xs"
                      @click="showReportDetails(item.report_id)"
                        :ui="{ base: 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors' }"
                        color="blue"
                    >
                      {{ item.report_id.slice(0, 8) }}...
                    </UButton>
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ getReportTitle(item.report_id) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900 dark:text-white">
                    {{ formatDateTime(item.scheduled_for) }}
                  </div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ timeAgo(item.scheduled_for) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="getStatusClasses(item.delivery_status)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ item.delivery_status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ item.attempt_count }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ item.processed_at ? formatDateTime(item.processed_at) : '-' }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                  <div v-if="item.error_message" class="truncate" :title="item.error_message">
                    {{ item.error_message }}
                  </div>
                  <span v-else class="text-gray-400 dark:text-gray-500">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex gap-2">
                    <UButton
                        v-if="item.delivery_status === 'FAILED' && item.attempt_count < 3"
                        @click="retryQueueItem(item)"
                        variant="outline"
                        size="xs"
                        icon="i-heroicons-arrow-path"
                        :ui="{ base: 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors' }"
                        color="blue"
                        :loading="retryingItems.has(item.id)"
                    >
                      Retry
                    </UButton>
                    <UButton
                        v-if="item.delivery_status === 'PENDING'"
                        @click="cancelQueueItem(item)"
                        variant="outline"
                        size="xs"
                        icon="i-heroicons-x-mark"
                        :ui="{ base: 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors' }"
                        color="red"
                    >
                      Cancel
                    </UButton>
                    <UButton
                        @click="showDetails(item)"
                        variant="outline"
                        size="xs"
                        icon="i-heroicons-eye"
                        :ui="{ base: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' }"
                        color="gray"
                    >
                      Details
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalCount > pageSize" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, totalCount) }} of {{ totalCount }} results
            </div>
            <div class="flex gap-2">
              <UButton
                variant="outline"
                size="sm"
                :disabled="currentPage === 1"
                :ui="{ base: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' }"
                @click="currentPage--"
              >
                Previous
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                :disabled="currentPage === totalPages"
                :ui="{ base: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' }"
                @click="currentPage++"
              >
                Next
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-heroicons-clock" class="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Pending</h3>
              <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ stats.pending }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-heroicons-check-circle" class="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Sent</h3>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.sent }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Failed</h3>
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats.failed }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <UIcon name="i-heroicons-x-circle" class="h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Cancelled</h3>
              <p class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{ stats.cancelled }}</p>
            </div>
          </div>
        </div>
      </div>

    <!-- Queue Item Details Modal -->
    <UModal v-model:open="showDetailsModal" class="w-full max-w-2xl mx-4">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Queue Item Details</h3>
      </template>

      <template #body>
        <div v-if="selectedQueueItem" class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <div class="border-b border-gray-200 dark:border-gray-700 pb-2">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic Information</h4>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Queue ID</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white font-mono">{{ selectedQueueItem.id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <span
                    :class="getStatusClasses(selectedQueueItem.delivery_status)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1"
                >
                    {{ selectedQueueItem.delivery_status }}
                  </span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Report ID</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white font-mono">{{ selectedQueueItem.report_id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Title</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ getReportTitle(selectedQueueItem.report_id) }}</p>
              </div>
            </div>

            <div class="border-b border-gray-200 dark:border-gray-700 pb-2">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduling</h4>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled For</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDateTime(selectedQueueItem.scheduled_for) }}</p>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ timeAgo(selectedQueueItem.scheduled_for) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Processed At</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white">
                  {{ selectedQueueItem.processed_at ? formatDateTime(selectedQueueItem.processed_at) : 'Not processed' }}
                </p>
              </div>
            </div>

            <div class="border-b border-gray-200 dark:border-gray-700 pb-2">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery Information</h4>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Attempt Count</label>
                <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ selectedQueueItem.attempt_count }}</p>
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipients (To)</label>
                <div class="mt-1">
                  <div v-if="selectedQueueItem.reports?.recipients && selectedQueueItem.reports.recipients.length > 0" class="flex flex-wrap gap-2">
                      <span
                          v-for="recipient in selectedQueueItem.reports.recipients"
                          :key="recipient"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      >
                        {{ recipient }}
                      </span>
                  </div>
                  <p v-else class="text-sm text-gray-500 dark:text-gray-400">No recipients found</p>
                </div>
              </div>
            </div>

            <div v-if="selectedQueueItem.error_message" class="border-b border-gray-200 dark:border-gray-700 pb-2">
              <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Error Information</h4>
            </div>

            <div v-if="selectedQueueItem.error_message" class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Error Message</label>
              <div class="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p class="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{{ selectedQueueItem.error_message }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
              variant="outline"
              :ui="{ base: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' }"
              @click="showDetailsModal = false"
          >
            Close
          </UButton>
        </div>
      </template>
    </UModal>
    </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'
import {useScheduledReportsService} from '~/composables/useScheduledReportsService'

// Toast notifications
const toast = useToast()

const { listEmailQueue } = useScheduledReportsService()

// State
const loading = ref(false)
const queueItems = ref([])
const reports = ref(new Map())
const currentPage = ref(1)
const pageSize = 50
const totalCount = ref(0)
const statusFilter = ref('ALL')
const lastUpdated = ref(null)
const autoRefreshEnabled = ref(false)
const autoRefreshInterval = ref(30) // seconds
const cronRunning = ref(false)
const retryingItems = ref(new Set())
const showDetailsModal = ref(false)
const selectedQueueItem = ref(null)

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

const statusFilterOptions = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]

const stats = computed(() => {
  const counts = {
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0
  }

  queueItems.value.forEach((item: any) => {
    switch (item.delivery_status) {
      case 'PENDING':
        counts.pending++
        break
      case 'SENT':
        counts.sent++
        break
      case 'FAILED':
        counts.failed++
        break
      case 'CANCELLED':
        counts.cancelled++
        break
    }
  })

  return counts
})

// Auto-refresh functionality
let refreshTimer: NodeJS.Timeout | null = null

const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    if (autoRefreshEnabled.value) {
      fetchQueue()
    }
  }, autoRefreshInterval.value * 1000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
    toast.add({
      title: 'Auto-refresh enabled',
      description: `Refreshing every ${autoRefreshInterval.value} seconds`,
      color: 'green'
    })
  } else {
    stopAutoRefresh()
    toast.add({
      title: 'Auto-refresh disabled',
      color: 'gray'
    })
  }
}

// Methods
const fetchQueue = async () => {
  loading.value = true
  try {
    const status = statusFilter.value === 'ALL' ? undefined : statusFilter.value
    const { items, total } = await listEmailQueue(status, currentPage.value, pageSize)
    queueItems.value = items
    totalCount.value = total
    lastUpdated.value = new Date().toISOString()

    // Cache report titles
    items.forEach((item: any) => {
      if (item.reports?.report_title) {
        reports.value.set(item.report_id, item.reports.report_title)
      }
    })

  } catch (error) {
    console.error('Error fetching email queue:', error)
    queueItems.value = []
    totalCount.value = 0
    toast.add({
      title: 'Error fetching queue',
      description: 'Failed to load email queue data',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

const runCronJob = async () => {
  cronRunning.value = true
  try {
    const response = await $fetch('/api/cron/process-reports', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-token'}`
      }
    })

    toast.add({
      title: 'Cron job completed',
      description: `Processed ${response.processed} reports (${response.successful} successful, ${response.failed} failed)`,
      color: 'green'
    })

    // Refresh the queue after cron job
    await fetchQueue()

  } catch (error: any) {
    console.error('Error running cron job:', error)
    toast.add({
      title: 'Cron job failed',
      description: error.message || 'Failed to execute cron job',
      color: 'red'
    })
  } finally {
    cronRunning.value = false
  }
}

const retryQueueItem = async (item: any) => {
  retryingItems.value.add(item.id)
  try {
    // Reset the queue item to pending and increment attempt count
    const {error} = await $fetch('/api/email-queue/retry', {
      method: 'POST',
      body: {queueItemId: item.id}
    })

    if (error) throw error

    toast.add({
      title: 'Queue item reset',
      description: 'Item has been reset to pending status for retry',
      color: 'blue'
    })

    await fetchQueue()

  } catch (error: any) {
    console.error('Error retrying queue item:', error)
    toast.add({
      title: 'Retry failed',
      description: error.message || 'Failed to reset queue item',
      color: 'red'
    })
  } finally {
    retryingItems.value.delete(item.id)
  }
}

const cancelQueueItem = async (item: any) => {
  try {
    const confirmed = await confirm('Cancel Queue Item', 'Are you sure you want to cancel this queue item? It will not be processed.')
    if (!confirmed) return

    const {error} = await $fetch('/api/email-queue/cancel', {
      method: 'POST',
      body: {queueItemId: item.id}
    })

    if (error) throw error

    toast.add({
      title: 'Queue item cancelled',
      description: 'Item has been marked as cancelled',
      color: 'orange'
    })

    await fetchQueue()

  } catch (error: any) {
    console.error('Error cancelling queue item:', error)
    toast.add({
      title: 'Cancellation failed',
      description: error.message || 'Failed to cancel queue item',
      color: 'red'
    })
  }
}

const showDetails = (item: any) => {
  // Show detailed modal with queue item information
  selectedQueueItem.value = item
  showDetailsModal.value = true
}

const getReportTitle = (reportId: string) => {
  return reports.value.get(reportId) || 'Unknown Report'
}

const showReportDetails = (reportId: string) => {
  // Navigate to report edit page
  navigateTo(`/reports/edit/${reportId}`)

  // Show toast notification
  toast.add({
    title: 'Opening Report',
    description: 'Navigating to report details...',
    color: 'blue'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const timeAgo = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMs = date.getTime() - now.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMs < 0) {
    return 'Overdue'
  } else if (diffInMinutes < 60) {
    return `In ${diffInMinutes} minutes`
  } else if (diffInHours < 24) {
    return `In ${diffInHours} hours`
  } else {
    return `In ${diffInDays} days`
  }
}

const getStatusClasses = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
    case 'SENT':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
    case 'FAILED':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
    case 'CANCELLED':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
  }
}

// Watchers
watch([currentPage, statusFilter], () => {
  fetchQueue()
})

// Lifecycle
onMounted(() => {
  fetchQueue()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Page meta - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>
