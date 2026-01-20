<template>
  <div class="space-y-8">
    <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ props.editingReport ? 'Edit Scheduled Report' : 'Create New Scheduled Report' }}
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ props.editingReport ? 'Update your report settings and schedule.' : 'Configure your report settings and schedule automatic delivery.' }}
      </p>
    </div>

    <form @submit.prevent="saveReport" class="space-y-8">
      <!-- Grid container for cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recipients & Message Section -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Recipients & Message</h3>

          <div class="grid grid-cols-1 gap-6">
            <!-- Report Title -->
            <div>
              <UFormField label="Report Title" required>
                <UInput
                    v-model="reportForm.report_title"
                    placeholder="Enter report title"
                    class="w-full"
                    required
                />
              </UFormField>
            </div>

            <!-- Recipients -->
            <div>
              <UFormField label="Recipients" required>
                <div class="space-y-3">
                  <div v-for="(recipient, index) in recipients" :key="index" class="flex gap-2">
                    <UInput
                        v-model="recipients[index]"
                        placeholder="Enter email address or select user"
                        class="flex-1"
                        type="email"
                    />
                    <UButton
                        variant="outline"
                        size="sm"
                        color="red"
                        :ui="{ base: 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors' }"
                        @click="removeRecipient(index)"
                        icon="i-heroicons-minus"
                    />
                  </div>
                  <UButton
                      variant="outline"
                      color="orange"
                      size="sm"
                      :ui="{ base: 'cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
                      @click="addRecipient"
                      icon="i-heroicons-plus"
                  >
                    Add Recipient
                  </UButton>
                </div>
              </UFormField>
            </div>

            <!-- Email Subject -->
            <div>
              <UFormField label="Email Subject" required>
                <UInput
                    v-model="reportForm.email_subject"
                    placeholder="Enter email subject"
                    class="w-full"
                    required
                />
              </UFormField>
            </div>

            <!-- Email Message -->
            <div>
              <UFormField label="Email Message">
                <UTextarea
                    v-model="reportForm.email_message"
                    placeholder="Add a custom message to your report email..."
                    class="w-full"
                    :rows="4"
                    :maxlength="500"
                />
                <div class="text-sm text-gray-500 mt-1">
                  {{ (reportForm.email_message || '').length }}/500 characters
                </div>
              </UFormField>
            </div>
          </div>
        </div>

        <!-- Content Selection Section -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Content Selection</h3>

          <div class="grid grid-cols-1 gap-6">
            <!-- Scope Selection -->
            <div>
              <UFormField label="Report Scope" required>
                <fieldset class="flex gap-2" aria-label="Report Scope">
                  <legend class="sr-only">Report Scope</legend>
                  <label
                      v-for="scopeOption in scopeOptions"
                      :key="scopeOption.value"
                      class="cursor-pointer"
                  >
                    <input
                        class="sr-only"
                        type="radio"
                        name="report-scope"
                        :value="scopeOption.value"
                        v-model="reportForm.scope"
                    />
                    <span :class="getToggleButtonClasses(reportForm.scope === scopeOption.value)">
                      {{ scopeOption.label }}
                    </span>
                  </label>
                </fieldset>
              </UFormField>
            </div>

            <!-- Content Selector -->
            <div>
              <UFormField :label="contentSelectorLabel" required>
                <USelect
                    v-model="reportForm.content_id"
                    :items="contentOptions"
                    :loading="contentLoading"
                    placeholder="Select content to report on"
                    required
                    class="w-full"
                    :ui="{ content: 'cursor-pointer' }"
                />
              </UFormField>
            </div>

            <!-- Time Frame -->
            <div>
              <UFormField label="Time Frame" required>
                <USelect
                    v-model="reportForm.time_frame"
                    :items="timeFrameOptions"
                    required
                    class="w-full"
                    :ui="{ content: 'cursor-pointer' }"
                />
              </UFormField>
            </div>

            <!-- Export Formats -->
            <div>
              <UFormField label="Export Formats" required>
                <div class="flex flex-wrap gap-2">
                  <UButton
                      v-for="format in formatOptions"
                      :key="format.value"
                      :color="selectedFormats.includes(format.value) ? 'orange' : 'neutral'"
                      :variant="selectedFormats.includes(format.value) ? 'solid' : 'outline'"
                      :ui="selectedFormats.includes(format.value)
                      ? { base: 'cursor-pointer bg-orange-500 text-white hover:bg-orange-600 shadow-sm ring-2 ring-orange-500/30 transition-all' }
                      : { base: 'cursor-pointer text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all' }"
                      size="sm"
                      @click="toggleFormat(format.value)"
                  >
                    <UIcon
                        :name="getFormatIcon(format.value)"
                        class="w-4 h-4 mr-1"
                    />
                    {{ format.label }}
                  </UButton>
                </div>
              </UFormField>
            </div>
          </div>
        </div>
      </div>

      <!-- Schedule Configuration Section (full width) -->
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Schedule Configuration</h3>

        <div class="grid grid-cols-1 gap-6">
          <!-- Interval -->
          <div>
            <UFormField label="Frequency" required>
              <fieldset class="flex gap-2" aria-label="Frequency">
                <legend class="sr-only">Frequency</legend>
                <label
                  v-for="intervalOption in intervalOptions"
                  :key="intervalOption.value"
                  class="cursor-pointer"
                >
                  <input
                      class="sr-only"
                      type="radio"
                      name="report-interval"
                      :value="intervalOption.value"
                      v-model="reportForm.interval"
                  />
                  <span :class="getToggleButtonClasses(reportForm.interval === intervalOption.value)">
                    {{ intervalOption.label }}
                  </span>
                </label>
              </fieldset>
            </UFormField>
          </div>

          <!-- Send Time -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <UFormField label="Send Time (HH:MM)" required>
                <UInput
                  v-model="reportForm.send_time"
                  type="time"
                  class="w-full"
                  required
                />
              </UFormField>
            </div>

            <!-- Timezone -->
            <ClientOnly>
              <div>
                <UFormField label="Timezone" required>
                  <USelect
                    v-model="reportForm.timezone"
                    :items="timezoneOptions"
                    placeholder="Select timezone"
                    required
                    class="w-full"
                    :ui="{ content: 'cursor-pointer' }"
                  />
                </UFormField>
              </div>
              <template #fallback>
                <div>
                  <UFormField label="Timezone" required>
                    <UInput
                      value="Loading timezone..."
                      disabled
                    />
                  </UFormField>
                </div>
              </template>
            </ClientOnly>
          </div>

          <!-- Day of Week (only for weekly) -->
          <div v-if="reportForm.interval === 'WEEKLY'">
            <UFormField label="Days of Week" required>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <UCheckbox
                  v-for="day in dayOfWeekOptions"
                  :key="day.value"
                  v-model="selectedDays"
                  :value="day.value"
                  :label="day.label"
                />
              </div>
            </UFormField>
          </div>

          <!-- Status -->
          <div>
            <UFormField label="Status" required>
              <fieldset class="flex gap-2" aria-label="Status">
                <legend class="sr-only">Status</legend>
                <label
                  v-for="statusOption in statusOptions"
                  :key="statusOption.value"
                  class="cursor-pointer"
                >
                  <input
                      class="sr-only"
                      type="radio"
                      name="report-status"
                      :value="statusOption.value"
                      v-model="reportForm.status"
                  />
                  <span :class="getToggleButtonClasses(reportForm.status === statusOption.value)">
                    {{ statusOption.label }}
                  </span>
                </label>
              </fieldset>
            </UFormField>
          </div>
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="hasSubmitted && validationErrors.length > 0" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              Please fix the following errors:
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <ul class="list-disc pl-5 space-y-1">
                <li v-for="error in validationErrors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <UButton
          type="button"
          variant="outline"
          color="gray"
          :ui="{ base: 'cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors' }"
          @click="$emit('cancel')"
          :disabled="saving || sendingNow"
        >
          Cancel
        </UButton>
        <UButton
          v-if="props.editingReport"
          type="button"
          variant="outline"
          color="blue"
          :ui="{ base: 'cursor-pointer bg-white dark:bg-gray-800 border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors' }"
          :loading="sendingNow"
          :disabled="saving || sendingNow"
          @click.prevent="sendReportNow"
        >
          <UIcon name="i-heroicons-paper-airplane" class="w-4 h-4 mr-1" />
          Send Now
        </UButton>
        <UButton
          type="submit"
          color="orange"
          :ui="{ base: 'cursor-pointer bg-orange-500 hover:bg-orange-600 text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
          :loading="saving"
          :disabled="sendingNow"
        >
          {{ props.editingReport ? 'Update Scheduled Report' : 'Create Scheduled Report' }}
        </UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'

// Props
const props = defineProps<{
  editingReport?: any
}>()

// Emits
const emit = defineEmits<{
  'report-created': []
  cancel: []
}>()

// Services
const { listDashboards } = useDashboardsService()

// Toast notifications
const toast = useToast()

// Form state
const reportForm = ref({
  report_title: '',
  recipients: [],
  email_subject: '',
  email_message: '',
  scope: 'Dashboard' as 'Dashboard' | 'Single Tab',
  content_id: '',
  time_frame: 'Last week',
  formats: [] as string[],
  interval: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
  send_time: '08:00',
  timezone: 'UTC', // Will be set to user's timezone on client mount
  day_of_week: [] as string[],
  status: 'Active' as 'Active' | 'Paused'
})

// UI state
const saving = ref(false)
const sendingNow = ref(false)
const contentLoading = ref(false)
const hasSubmitted = ref(false)
const recipients = ref([''])
const selectedFormats = ref(['PDF'])
const selectedDays = ref(['Mo', 'Tu', 'We', 'Th', 'Fr'])

// Options
const scopeOptions = [
  { label: 'Dashboard', value: 'Dashboard' },
  {label: 'Single Tab', value: 'Single Tab'}
]

const timeFrameOptions = [
  { label: 'As On Dashboard', value: 'As On Dashboard' },
  {label: 'Yesterday', value: 'Yesterday'},
  {label: 'Last week', value: 'Last week'},
  {label: 'Last month', value: 'Last month'},
  {label: 'Last quarter', value: 'Last quarter'},
  {label: 'Last year', value: 'Last year'},
  {label: 'Today', value: 'Today'},
  {label: 'This week', value: 'This week'},
  {label: 'This month', value: 'This month'},
  {label: 'This quarter', value: 'This quarter'},
  {label: 'This year', value: 'This year'},
  {label: 'All times', value: 'All times'}
]

const formatOptions = [
  { label: 'XLS', value: 'XLS' },
  { label: 'CSV', value: 'CSV' },
  {label: 'PDF', value: 'PDF'}
]

const intervalOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' }
]

const dayOfWeekOptions = [
  { label: 'Monday', value: 'Mo' },
  { label: 'Tuesday', value: 'Tu' },
  { label: 'Wednesday', value: 'We' },
  { label: 'Thursday', value: 'Th' },
  { label: 'Friday', value: 'Fr' },
  { label: 'Saturday', value: 'Sa' },
  { label: 'Sunday', value: 'Su' }
]

const statusOptions = [
  { label: 'Active', value: 'Active' },
  {label: 'Paused', value: 'Paused'}
]

const toggleButtonBaseClasses = 'rounded-md font-medium inline-flex items-center px-2.5 py-1.5 text-xs gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const getToggleButtonClasses = (isActive: boolean) => [
  toggleButtonBaseClasses,
  isActive
      ? 'bg-orange-500 text-white border border-transparent focus-visible:ring-orange-500 focus-visible:ring-offset-orange-100 hover:bg-orange-600'
      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
].join(' ')

// Timezone options using Intl.supportedValuesOf() API
const timezoneOptions = computed(() => {
  try {
    // Use the modern Intl.supportedValuesOf API to get all supported timezones
    const supportedTimezones = Intl.supportedValuesOf('timeZone')

    // Use a Set to dedupe by GMT offset (e.g., "GMT+7") - keep only one timezone per offset
    const seenOffsets = new Set<string>()
    const options: Array<{ label: string; value: string; offsetMinutes: number }> = []

    for (const tz of supportedTimezones) {
      // Get the offset in minutes for sorting
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: tz,
        timeZoneName: 'short'
      })
      const offset = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || ''

      // Skip if we've already seen this GMT offset
      if (seenOffsets.has(offset)) continue
      seenOffsets.add(offset)

      // Calculate offset in minutes for proper numeric sorting
      // Parse offset like "GMT+5:30" or "GMT-10" into minutes
      let offsetMinutes = 0
      const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/)
      if (match) {
        const sign = match[1] === '+' ? 1 : -1
        const hours = parseInt(match[2], 10)
        const minutes = match[3] ? parseInt(match[3], 10) : 0
        offsetMinutes = sign * (hours * 60 + minutes)
      }

      options.push({
        label: `${offset} ${tz.replace('_', ' ')}`,
        value: tz,
        offsetMinutes
      })
    }

    // Sort by numeric offset (ascending: negative to positive)
    return options
      .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
      .map(({ label, value }) => ({ label, value }))
  } catch (error) {
    console.warn('Intl.supportedValuesOf not available, falling back to UTC only')
    // Minimal fallback for environments without Intl support
    return [
      {label: 'GMT+00:00 UTC', value: 'UTC'}
    ]
  }
})

// Content options based on scope
const contentOptions = ref([])
const contentSelectorLabel = computed(() =>
    reportForm.value.scope === 'Dashboard' ? 'Select Dashboard' : 'Select Tab'
)

// Load content options
const loadContentOptions = async (scope: string) => {
  contentLoading.value = true
  try {
    if (scope === 'Dashboard') {
      // Load dashboards using the dashboards service API
      const dashboards = await listDashboards()
      contentOptions.value = (dashboards || []).map(d => ({
        label: d.name,
        value: d.id
      }))
    } else {
      // Load dashboard tabs via API
      const tabs = await $fetch<Array<{ id: string; name: string; dashboard_name: string }>>('/api/dashboard-tabs')
      contentOptions.value = (tabs || []).map(t => ({
        label: `${t.dashboard_name} - ${t.name}`,
        value: t.id
      }))
    }
  } catch (error) {
    console.error('Error loading content options:', error)
    contentOptions.value = []
  } finally {
    contentLoading.value = false
  }
}

// Track if this is the initial load (to avoid clearing content_id when editing)
const isInitialScopeLoad = ref(true)

// Watch for scope changes to load appropriate content
watch(() => reportForm.value.scope, async (newScope) => {
  // Only clear the content selection when scope is changed by user action, not on initial load
  if (!isInitialScopeLoad.value) {
    reportForm.value.content_id = ''
  }
  isInitialScopeLoad.value = false
  await loadContentOptions(newScope)
}, { immediate: true })

// Sync form data with computed properties
watch(selectedFormats, (newFormats) => {
  reportForm.value.formats = newFormats
}, { immediate: true })

watch(selectedDays, (newDays) => {
  reportForm.value.day_of_week = newDays
}, { immediate: true })

watch(recipients, (newRecipients) => {
  reportForm.value.recipients = newRecipients.filter(r => r.trim() !== '')
}, { immediate: true })

// Form validation
const isFormValid = computed(() => {
  const validRecipients = recipients.value.filter(r => r.trim() !== '')

  return (
    reportForm.value.report_title.trim() !== '' &&
    validRecipients.length > 0 &&
    reportForm.value.email_subject.trim() !== '' &&
    reportForm.value.content_id !== '' &&
    reportForm.value.formats.length > 0 &&
    reportForm.value.send_time !== '' &&
    reportForm.value.timezone !== '' &&
    (reportForm.value.interval !== 'WEEKLY' || reportForm.value.day_of_week.length > 0)
  )
})

// Validation errors
const validationErrors = computed(() => {
  const errors = []

  if (!reportForm.value.report_title.trim()) {
    errors.push('Report title is required')
  }

  // Check recipients directly from the recipients array, filtered for non-empty values
  const validRecipients = recipients.value.filter(r => r.trim() !== '')
  if (validRecipients.length === 0) {
    errors.push('At least one recipient is required')
  }

  if (!reportForm.value.email_subject.trim()) {
    errors.push('Email subject is required')
  }

  if (!reportForm.value.content_id) {
    errors.push('Content selection is required')
  }

  if (reportForm.value.formats.length === 0) {
    errors.push('At least one export format must be selected')
  }

  if (!reportForm.value.send_time) {
    errors.push('Send time is required')
  }

  if (!reportForm.value.timezone) {
    errors.push('Timezone selection is required')
  }

  if (reportForm.value.interval === 'WEEKLY' && reportForm.value.day_of_week.length === 0) {
    errors.push('At least one day of the week must be selected for weekly reports')
  }

  return errors
})

// Recipient management
const addRecipient = () => {
  recipients.value.push('')
}

const removeRecipient = (index: number) => {
  if (recipients.value.length > 1) {
    // Remove the recipient field entirely
    recipients.value.splice(index, 1)
  } else {
    // If this is the only recipient, just clear the field
    recipients.value[index] = ''
  }
}

// Format management
const toggleFormat = (formatValue: string) => {
  const index = selectedFormats.value.indexOf(formatValue)
  if (index > -1) {
    selectedFormats.value.splice(index, 1)
  } else {
    selectedFormats.value.push(formatValue)
  }
}

const getFormatIcon = (formatValue: string) => {
  switch (formatValue) {
    case 'XLS':
      return 'i-heroicons-table-cells'
    case 'CSV':
      return 'i-heroicons-queue-list'
    case 'PDF':
      return 'i-heroicons-document-text' // More specific PDF-like document icon
    default:
      return 'i-heroicons-document'
  }
}

// Send report immediately
const sendReportNow = async () => {
  if (sendingNow.value || !props.editingReport?.id) return
  
  sendingNow.value = true
  try {
    const response = await $fetch(`/api/reports/${props.editingReport.id}/send-now`, {
      method: 'POST'
    })
    
    if (response.success) {
      toast.add({
        title: 'Report Sent',
        description: 'The report has been queued for immediate delivery.',
        color: 'green'
      })
    } else {
      throw new Error(response.message || 'Failed to send report')
    }
  } catch (error: any) {
    console.error('Error sending report:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to send report. Please try again.',
      color: 'red'
    })
  } finally {
    sendingNow.value = false
  }
}

// Save report
const saveReport = async () => {
  hasSubmitted.value = true

  if (!isFormValid.value) {
    // Scroll to validation errors if they exist
    nextTick(() => {
      const errorElement = document.querySelector('.bg-red-50, .bg-red-900\\/20')
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
    return
  }

  saving.value = true
  try {
    // Prepare the request payload
    const payload = {
      ...(props.editingReport && { id: props.editingReport.id }), // Include ID for updates
      report_title: reportForm.value.report_title,
      recipients: recipients.value.filter(r => r.trim() !== ''), // Use filtered recipients
      email_subject: reportForm.value.email_subject,
      email_message: reportForm.value.email_message,
      scope: reportForm.value.scope,
      // Send the appropriate content field based on scope
      dashboard_id: reportForm.value.scope === 'Dashboard' ? reportForm.value.content_id : undefined,
      tab_id: reportForm.value.scope === 'Single Tab' ? reportForm.value.content_id : undefined,
      time_frame: reportForm.value.time_frame,
      formats: reportForm.value.formats,
      interval: reportForm.value.interval,
      send_time: reportForm.value.send_time,
      timezone: reportForm.value.timezone,
      day_of_week: reportForm.value.interval === 'WEEKLY' ? reportForm.value.day_of_week : undefined,
      status: reportForm.value.status
    }

    // Call server API route (uses service role, bypasses RLS)
    const response = await $fetch('/api/reports', {
      method: props.editingReport ? 'PUT' : 'POST',
      body: payload
    })

    if (!response.success) {
      throw new Error(`Failed to ${props.editingReport ? 'update' : 'create'} report`)
    }

    // Reset form
    resetForm()

    // Emit success
    emit('report-created')

    // Show success toast
    toast.add({
      title: 'Success',
      description: props.editingReport ? 'Report updated successfully' : 'Report created successfully',
      color: 'green'
    })

  } catch (error: any) {
    console.error('Error saving report:', error)
    // Show error toast with specific message
    const action = props.editingReport ? 'update' : 'create'
    toast.add({
      title: 'Error',
      description: error.response?.data?.message || `Failed to ${action} report. Please try again.`,
      color: 'red'
    })
    if (error.response?.status === 400) {
      // Validation error from server
      console.error('Validation error:', error.response._data)
    }
  } finally {
    saving.value = false
  }
}

// Reset form
const resetForm = () => {
  hasSubmitted.value = false
    reportForm.value = {
      report_title: '',
      recipients: [],
      email_subject: '',
      email_message: '',
      scope: 'Dashboard',
      content_id: '',
      time_frame: 'Last week',
      formats: [],
      interval: 'DAILY',
      send_time: '08:00',
      timezone: getUserTimezone(),
      day_of_week: [],
      status: 'Active'
    }
  recipients.value = ['']
  selectedFormats.value = ['PDF']
  selectedDays.value = ['Mo', 'Tu', 'We', 'Th', 'Fr']
}

// Get user timezone (client-side safe)
const getUserTimezone = () => {
  if (process.client) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      return 'UTC'
    }
  }
  return 'UTC'
}

// Watch for editing report changes
watch(() => props.editingReport, (newReport) => {
  hasSubmitted.value = false
  if (newReport) {
    // Reset flag so scope watcher doesn't clear content_id on this load
    isInitialScopeLoad.value = true
    
    // Populate form with existing report data
    reportForm.value = {
      report_title: newReport.report_title || '',
      recipients: newReport.recipients || [],
      email_subject: newReport.email_subject || '',
      email_message: newReport.email_message || '',
      scope: newReport.scope || 'Dashboard',
      // Set content_id based on which field is populated (fallback to old content_id for unmigrated data)
      content_id: newReport.dashboard_id || newReport.chart_id?.toString() || newReport.content_id || '',
      time_frame: newReport.time_frame || 'Last week',
      formats: newReport.formats || ['PDF'],
      interval: newReport.interval || 'DAILY',
      send_time: newReport.send_time || '08:00',
      timezone: newReport.timezone || getUserTimezone(),
      day_of_week: newReport.day_of_week || [],
      status: newReport.status || 'Active'
    }

    // Update reactive arrays
    recipients.value = newReport.recipients?.filter(r => r.trim() !== '') || ['']
    selectedFormats.value = newReport.formats || ['PDF']
    selectedDays.value = newReport.day_of_week || []

    // Load content options for the selected scope
    nextTick(() => {
      loadContentOptions(reportForm.value.scope)
    })
  } else {
    // Reset form for new report creation
    isInitialScopeLoad.value = true
    resetForm()
  }
}, { immediate: true })

onMounted(() => {
  // Set user timezone on client side only (prevents hydration mismatch)
  if (!props.editingReport && reportForm.value.timezone === 'UTC') {
    reportForm.value.timezone = getUserTimezone()
  }
  
  // Load initial content options
  loadContentOptions(reportForm.value.scope)
})
</script>
