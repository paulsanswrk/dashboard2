<template>
  <div class="space-y-6">
    <!-- Storage Location Selection -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Data Storage</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Choose how you want to access your data. Remote connections query your database directly while internal storage transfers data to Optiqo's data warehouse.
      </p>

      <URadioGroup
          v-model="storageLocation"
          :items="storageOptions"
          class="space-y-3"
      />
    </div>

    <!-- Internal Storage Configuration (shown when internal is selected) -->
    <div v-if="storageLocation === 'internal'" class="space-y-6 border-t pt-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sync Schedule</h3>

      <!-- Sync Status Display -->
      <div v-if="syncStatus" class="p-4 rounded-lg" :class="syncStatusClasses">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="syncStatusDotClasses"></div>
            <div>
              <p class="font-medium">{{ syncStatusLabel }}</p>
              <p v-if="syncProgress" class="text-sm opacity-80">
                {{ syncProgress.message || `${syncProgress.tables_done}/${syncProgress.tables_total} tables` }}
              </p>
            </div>
          </div>
          <span v-if="lastSyncAt" class="text-sm opacity-70">
            Last sync: {{ formatDate(lastSyncAt) }}
          </span>
        </div>
      </div>

      <!-- Schedule Configuration -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="Sync Interval" class="text-gray-900 dark:text-white">
          <USelect
              v-model="scheduleInterval"
              :items="intervalOptions"
              class="w-full"
          />
        </UFormField>

        <UFormField label="Time" class="text-gray-900 dark:text-white">
          <UInput
              v-model="scheduleTime"
              type="time"
              class="w-full"
          />
        </UFormField>

        <UFormField label="Timezone" class="text-gray-900 dark:text-white">
          <USelect
              v-model="scheduleTimezone"
              :items="timezoneOptions"
              class="w-full"
          />
        </UFormField>
      </div>

      <!-- Days of Week (for DAILY interval) -->
      <div v-if="scheduleInterval === 'DAILY'" class="space-y-2">
        <label class="text-sm font-medium text-gray-900 dark:text-white">Days to run</label>
        <div class="flex flex-wrap gap-2">
          <UButton
              v-for="day in weekDays"
              :key="day.value"
              size="sm"
              :variant="selectedDays.includes(day.value) ? 'solid' : 'outline'"
              :color="selectedDays.includes(day.value) ? 'primary' : 'gray'"
              @click="toggleDay(day.value)"
              class="cursor-pointer"
          >
            {{ day.label }}
          </UButton>
        </div>
      </div>

      <!-- Next Sync Info -->
      <div v-if="nextSyncAt" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Icon name="i-heroicons-clock" class="w-4 h-4"/>
          <span class="text-sm">Next scheduled sync: {{ formatDate(nextSyncAt) }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <UButton
            @click="saveSchedule"
            :loading="savingSchedule"
            :disabled="savingSchedule"
            color="primary"
            class="cursor-pointer"
        >
          <Icon name="i-heroicons-clock" class="w-4 h-4 mr-2"/>
          Save Schedule
        </UButton>

        <UButton
            @click="startSyncNow"
            :loading="startingSync"
            :disabled="startingSync"
            variant="outline"
            color="orange"
            class="cursor-pointer hover:bg-orange-50"
        >
          <Icon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2"/>
          {{ startingSync ? 'Starting...' : 'Sync Now' }}
        </UButton>
      </div>
    </div>

    <!-- Remote Storage Info -->
    <div v-else class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-start gap-3">
        <Icon name="i-heroicons-cloud" class="w-5 h-5 text-gray-500 mt-0.5"/>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Remote Connection</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Data will be queried directly from your database. No data is stored on Optiqo servers.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  connectionId: number | null
  initialStorageLocation?: string
}>()

const emit = defineEmits<{
  (e: 'storage-changed', value: string): void
  (e: 'schedule-saved'): void
}>()

// Storage options
const storageLocation = ref(props.initialStorageLocation || 'remote')
const storageOptions = [
  {
    label: 'Remote Connection',
    value: 'remote',
    description: 'Connect directly to your database. Queries are executed in real-time.'
  },
  {
    label: 'Internal Storage',
    value: 'internal',
    description: 'Transfer data to Optiqo for faster queries and offline access.'
  }
]

// Schedule configuration
const scheduleInterval = ref('DAILY')
const scheduleTime = ref('04:30')
const scheduleTimezone = ref('UTC')
const selectedDays = ref<string[]>(['Mo', 'Tu', 'We', 'Th', 'Fr'])

const intervalOptions = [
  {label: 'Hourly', value: 'HOURLY'},
  {label: 'Daily', value: 'DAILY'},
  {label: 'Weekly', value: 'WEEKLY'},
  {label: 'Monthly', value: 'MONTHLY'}
]

const timezoneOptions = [
  {label: 'UTC', value: 'UTC'},
  {label: 'Europe/Berlin', value: 'Europe/Berlin'},
  {label: 'Europe/London', value: 'Europe/London'},
  {label: 'America/New_York', value: 'America/New_York'},
  {label: 'America/Los_Angeles', value: 'America/Los_Angeles'},
  {label: 'Asia/Tokyo', value: 'Asia/Tokyo'}
]

const weekDays = [
  {label: 'Mon', value: 'Mo'},
  {label: 'Tue', value: 'Tu'},
  {label: 'Wed', value: 'We'},
  {label: 'Thu', value: 'Th'},
  {label: 'Fri', value: 'Fr'},
  {label: 'Sat', value: 'Sa'},
  {label: 'Sun', value: 'Su'}
]

// Sync status
const syncStatus = ref<string | null>(null)
const syncProgress = ref<any>(null)
const lastSyncAt = ref<string | null>(null)
const nextSyncAt = ref<string | null>(null)

// Loading states
const savingSchedule = ref(false)
const startingSync = ref(false)
const loadingStatus = ref(false)

// Computed classes for status display
const syncStatusClasses = computed(() => {
  switch (syncStatus.value) {
    case 'syncing':
    case 'queued':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
    case 'completed':
      return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    case 'error':
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
    default:
      return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
})

const syncStatusDotClasses = computed(() => {
  switch (syncStatus.value) {
    case 'syncing':
    case 'queued':
      return 'bg-blue-500 animate-pulse'
    case 'completed':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
})

const syncStatusLabel = computed(() => {
  switch (syncStatus.value) {
    case 'syncing':
      return 'Syncing data...'
    case 'queued':
      return 'Sync queued'
    case 'completed':
      return 'Last sync completed'
    case 'error':
      return 'Sync failed'
    case 'idle':
      return 'Waiting for next sync'
    default:
      return 'No sync configured'
  }
})

// Toggle day selection
const toggleDay = (day: string) => {
  const index = selectedDays.value.indexOf(day)
  if (index > -1) {
    selectedDays.value.splice(index, 1)
  } else {
    selectedDays.value.push(day)
  }
}

// Format date for display
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// Load sync status
const loadSyncStatus = async () => {
  if (!props.connectionId) return

  loadingStatus.value = true
  try {
    const response = await $fetch('/api/data-transfer/status', {
      params: {connectionId: props.connectionId}
    })

    const data = response as any
    if (data.syncStatus !== 'no_sync') {
      syncStatus.value = data.syncStatus as string
      syncProgress.value = data.syncProgress
      lastSyncAt.value = data.lastSyncAt as string | null
      nextSyncAt.value = data.nextSyncAt as string | null

      const schedule = data.schedule
      if (schedule) {
        scheduleInterval.value = schedule.interval || 'DAILY'
        scheduleTime.value = schedule.time || '04:30'
        scheduleTimezone.value = schedule.timezone || 'UTC'
        if (schedule.daysOfWeek) {
          selectedDays.value = schedule.daysOfWeek
        }
      }
    }
  } catch (error) {
    console.error('Failed to load sync status:', error)
  } finally {
    loadingStatus.value = false
  }
}

// Save schedule
const saveSchedule = async () => {
  if (!props.connectionId) return

  savingSchedule.value = true
  try {
    const response = await $fetch('/api/data-transfer/schedule', {
      method: 'POST',
      body: {
        connectionId: props.connectionId,
        interval: scheduleInterval.value,
        time: scheduleTime.value,
        timezone: scheduleTimezone.value,
        daysOfWeek: scheduleInterval.value === 'DAILY' ? selectedDays.value : undefined
      }
    })

    nextSyncAt.value = response.nextSyncAt
    emit('schedule-saved')
  } catch (error: any) {
    console.error('Failed to save schedule:', error)
  } finally {
    savingSchedule.value = false
  }
}

// Start sync now
const startSyncNow = async () => {
  if (!props.connectionId) return

  startingSync.value = true
  try {
    await $fetch('/api/data-transfer/start', {
      method: 'POST',
      body: {connectionId: props.connectionId}
    })

    syncStatus.value = 'syncing'
    // Reload status after a short delay
    setTimeout(() => loadSyncStatus(), 2000)
  } catch (error: any) {
    console.error('Failed to start sync:', error)
  } finally {
    startingSync.value = false
  }
}

// Watch storage location changes
watch(storageLocation, (newVal) => {
  emit('storage-changed', newVal)
})

// Load status when connection ID changes
watch(() => props.connectionId, (id) => {
  if (id) {
    loadSyncStatus()
  }
}, {immediate: true})
</script>
