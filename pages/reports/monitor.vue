<template>
  <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between py-6 px-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Email Queue Monitor</h1>
        <div class="flex gap-2">
          <USelect
            v-model="statusFilter"
            :options="statusFilterOptions"
            placeholder="Filter by status"
            class="w-48"
          />
          <UButton
            @click="fetchQueue"
            variant="outline"
            icon="i-heroicons-arrow-path"
            :loading="loading"
          >
            Refresh
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
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-if="loading" class="text-center">
                <td colspan="6" class="px-6 py-4">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin h-5 w-5 mx-auto" />
                </td>
              </tr>
              <tr v-else-if="queueItems.length === 0" class="text-center">
                <td colspan="6" class="px-6 py-4 text-gray-500 dark:text-gray-400">
                  No queue items found.
                </td>
              </tr>
              <tr v-else v-for="item in queueItems" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    <UButton
                      variant="link"
                      size="xs"
                      @click="showReportDetails(item.report_id)"
                      class="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
                @click="currentPage--"
              >
                Previous
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                :disabled="currentPage === totalPages"
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useScheduledReportsService } from '~/composables/useScheduledReportsService'

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
const statusFilter = ref('')

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

const statusFilterOptions = [
  { label: 'All Statuses', value: '' },
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

// Methods
const fetchQueue = async () => {
  loading.value = true
  try {
    const { items, total } = await listEmailQueue(statusFilter.value || undefined, currentPage.value, pageSize)
    queueItems.value = items
    totalCount.value = total

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
  } finally {
    loading.value = false
  }
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
})

// Page meta - requires authentication
definePageMeta({
  middleware: 'auth'
})
</script>
