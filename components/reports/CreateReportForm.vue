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
                    @click="removeRecipient(index)"
                    icon="i-heroicons-minus"
                  />
                </div>
                <UButton
                  variant="outline"
                  color="orange"
                  size="sm"
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
              <div class="flex gap-2">
                <UButton
                  v-for="scopeOption in scopeOptions"
                  :key="scopeOption.value"
                  :variant="reportForm.scope === scopeOption.value ? 'solid' : 'outline'"
                  :color="reportForm.scope === scopeOption.value ? 'orange' : undefined"
                  :ui="reportForm.scope === scopeOption.value ? {} : { base: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
                  size="sm"
                  @click="reportForm.scope = scopeOption.value"
                >
                  {{ scopeOption.label }}
                </UButton>
              </div>
            </UFormField>
          </div>

          <!-- Content Selector -->
          <div>
            <UFormField :label="contentSelectorLabel" required>
              <USelect
                v-model="reportForm.content_id"
                :options="contentOptions"
                :loading="contentLoading"
                placeholder="Select content to report on"
                required
              />
            </UFormField>
          </div>

          <!-- Time Frame -->
          <div>
            <UFormField label="Time Frame" required>
              <USelect
                v-model="reportForm.time_frame"
                :options="timeFrameOptions"
                required
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
                  :variant="selectedFormats.includes(format.value) ? 'solid' : 'outline'"
                  :color="selectedFormats.includes(format.value) ? 'orange' : undefined"
                  :ui="selectedFormats.includes(format.value) ? {} : { base: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
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

      <!-- Schedule Configuration Section -->
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">Schedule Configuration</h3>

        <div class="grid grid-cols-1 gap-6">
          <!-- Interval -->
          <div>
            <UFormField label="Frequency" required>
              <div class="flex gap-2">
                <UButton
                  v-for="intervalOption in intervalOptions"
                  :key="intervalOption.value"
                  :variant="reportForm.interval === intervalOption.value ? 'solid' : 'outline'"
                  :color="reportForm.interval === intervalOption.value ? 'orange' : undefined"
                  :ui="reportForm.interval === intervalOption.value ? {} : { base: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
                  size="sm"
                  @click="reportForm.interval = intervalOption.value"
                >
                  {{ intervalOption.label }}
                </UButton>
              </div>
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
                    :options="timezoneOptions"
                    placeholder="Select timezone"
                    required
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
              <div class="flex gap-2">
                <UButton
                  v-for="statusOption in statusOptions"
                  :key="statusOption.value"
                  :variant="reportForm.status === statusOption.value ? 'solid' : 'outline'"
                  :color="reportForm.status === statusOption.value ? 'orange' : undefined"
                  :ui="reportForm.status === statusOption.value ? {} : { base: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
                  size="sm"
                  @click="reportForm.status = statusOption.value"
                >
                  {{ statusOption.label }}
                </UButton>
              </div>
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
          variant="outline"
          color="gray"
          :ui="{ base: 'hover:bg-gray-100 dark:hover:bg-gray-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors' }"
          @click="$emit('cancel')"
          :disabled="saving"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          color="orange"
          :ui="{ base: 'hover:bg-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors' }"
          :loading="saving"
        >
          {{ props.editingReport ? 'Update Scheduled Report' : 'Create Scheduled Report' }}
        </UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

// Props
const props = defineProps<{
  editingReport?: any
}>()

// Emits
const emit = defineEmits<{
  'report-created': []
  cancel: []
}>()

// Supabase client
const supabase = useSupabaseClient()

// Toast notifications
const toast = useToast()

// Form state
const reportForm = ref({
  report_title: '',
  recipients: [],
  email_subject: '',
  email_message: '',
  scope: 'Dashboard' as 'Dashboard' | 'Single Chart',
  content_id: '',
  time_frame: 'Last 7 Days',
  formats: [] as string[],
  interval: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
  send_time: '08:00',
  timezone: 'UTC', // Will be set to user's timezone on client mount
  day_of_week: [] as string[],
  status: 'Active' as 'Active' | 'Paused' | 'Draft'
})

// UI state
const saving = ref(false)
const contentLoading = ref(false)
const hasSubmitted = ref(false)
const recipients = ref([''])
const selectedFormats = ref(['PDF'])
const selectedDays = ref(['Mo', 'Tu', 'We', 'Th', 'Fr'])

// Options
const scopeOptions = [
  { label: 'Dashboard', value: 'Dashboard' },
  { label: 'Single Chart', value: 'Single Chart' }
]

const timeFrameOptions = [
  { label: 'As On Dashboard', value: 'As On Dashboard' },
  { label: 'Last 7 Days', value: 'Last 7 Days' },
  { label: 'Last 30 Days', value: 'Last 30 Days' },
  { label: 'Last Quarter', value: 'Last Quarter' }
]

const formatOptions = [
  { label: 'XLS', value: 'XLS' },
  { label: 'CSV', value: 'CSV' },
  { label: 'PDF', value: 'PDF' },
  { label: 'PNG', value: 'PNG' }
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
  { label: 'Paused', value: 'Paused' },
  { label: 'Draft', value: 'Draft' }
]

// Timezone options - comprehensive list
const timezoneOptions = computed(() => {
  try {
    // Try to get supported timezones from Intl API
    const supportedTimezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []

    if (supportedTimezones.length > 0) {
      return supportedTimezones.map(tz => {
        // Create a user-friendly display name
        const now = new Date()
        const offset = new Intl.DateTimeFormat('en', {
          timeZone: tz,
          timeZoneName: 'short'
        }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || ''

        return {
          label: `${offset} ${tz.replace('_', ' ')}`,
          value: tz
        }
      }).sort((a, b) => a.label.localeCompare(b.label))
    }
  } catch (error) {
    // Fallback to common timezones if Intl API fails
  }

  // Fallback hardcoded list of common timezones
  return [
    { label: 'GMT+00:00 Europe/London', value: 'Europe/London' },
    { label: 'GMT+01:00 Europe/Berlin', value: 'Europe/Berlin' },
    { label: 'GMT+01:00 Europe/Paris', value: 'Europe/Paris' },
    { label: 'GMT-05:00 America/New_York', value: 'America/New_York' },
    { label: 'GMT-08:00 America/Los_Angeles', value: 'America/Los_Angeles' },
    { label: 'GMT+08:00 Asia/Shanghai', value: 'Asia/Shanghai' },
    { label: 'GMT+09:00 Asia/Tokyo', value: 'Asia/Tokyo' },
    { label: 'GMT+10:00 Australia/Sydney', value: 'Australia/Sydney' },
    { label: 'GMT-03:00 America/Sao_Paulo', value: 'America/Sao_Paulo' }
  ]
})

// Content options based on scope
const contentOptions = ref([])
const contentSelectorLabel = computed(() =>
  reportForm.value.scope === 'Dashboard' ? 'Select Dashboard' : 'Select Chart'
)

// Load content options
const loadContentOptions = async (scope: string) => {
  contentLoading.value = true
  try {
    if (scope === 'Dashboard') {
      // Load dashboards
      const { data: dashboards, error } = await supabase
        .from('dashboards')
        .select('id, name')
        .order('name')

      if (error) throw error
      contentOptions.value = (dashboards || []).map(d => ({
        label: d.name,
        value: d.id
      }))
    } else {
      // Load charts - using the charts table
      const { data: charts, error } = await supabase
        .from('charts')
        .select('id, name')
        .order('name')

      if (error) throw error
      contentOptions.value = (charts || []).map(c => ({
        label: c.name,
        value: c.id.toString()
      }))
    }
  } catch (error) {
    console.error('Error loading content options:', error)
    contentOptions.value = []
  } finally {
    contentLoading.value = false
  }
}

// Watch for scope changes to load appropriate content
watch(() => reportForm.value.scope, async (newScope) => {
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
    case 'PNG':
      return 'i-heroicons-photo'
    default:
      return 'i-heroicons-document'
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
      chart_id: reportForm.value.scope === 'Single Chart' ? parseInt(reportForm.value.content_id) : undefined,
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
      description: 'Report created successfully',
      color: 'green'
    })

  } catch (error: any) {
    console.error('Error saving report:', error)
    // Show error toast with specific message
    toast.add({
      title: 'Error',
      description: error.response?.data?.message || 'Failed to create report. Please try again.',
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
      time_frame: 'Last 7 Days',
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
    // Populate form with existing report data
    reportForm.value = {
      report_title: newReport.report_title || '',
      recipients: newReport.recipients || [],
      email_subject: newReport.email_subject || '',
      email_message: newReport.email_message || '',
      scope: newReport.scope || 'Dashboard',
      // Set content_id based on which field is populated (fallback to old content_id for unmigrated data)
      content_id: newReport.dashboard_id || newReport.chart_id?.toString() || newReport.content_id || '',
      time_frame: newReport.time_frame || 'Last 7 Days',
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
