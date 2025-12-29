<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <template #header>
      <h3 class="text-lg font-semibold" :class="deletionResult?.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
        {{ deletionResult?.success ? 'Deletion Complete' : 'Delete Data Source' }}
      </h3>
    </template>

    <template #body>
      <!-- Success Report -->
      <div v-if="deletionResult?.success" class="space-y-4">
        <div class="flex items-start gap-3">
          <Icon name="i-heroicons-check-circle" class="w-6 h-6 text-green-500 mt-0.5"/>
          <div>
            <p class="text-gray-700 dark:text-gray-300 font-medium">
              Data source "<strong>{{ connection?.internal_name }}</strong>" has been deleted.
            </p>
            
            <!-- Deletion report -->
            <div v-if="deletionResult.deletedCharts > 0 || deletionResult.deletedWidgets > 0 || deletionResult.clearedFilters > 0" 
                 class="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
              <p class="font-medium text-gray-700 dark:text-gray-300 mb-2">Cleanup Summary:</p>
              <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li v-if="deletionResult.deletedCharts > 0">
                  {{ deletionResult.deletedCharts }} chart{{ deletionResult.deletedCharts !== 1 ? 's' : '' }} deleted
                </li>
                <li v-if="deletionResult.deletedWidgets > 0">
                  {{ deletionResult.deletedWidgets }} dashboard widget{{ deletionResult.deletedWidgets !== 1 ? 's' : '' }} removed
                </li>
                <li v-if="deletionResult.clearedFilters > 0">
                  {{ deletionResult.clearedFilters }} dashboard filter{{ deletionResult.clearedFilters !== 1 ? 's' : '' }} disconnected
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <UButton
              color="primary"
              class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              @click="$emit('closeModal')"
          >
            Done
          </UButton>
        </div>
      </div>

      <!-- Confirmation View -->
      <div v-else class="space-y-4">
        <div class="flex items-start gap-3">
          <Icon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500 mt-0.5"/>
          <div>
            <p class="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the data source "<strong>{{ connection?.internal_name }}</strong>"?
            </p>
            
            <!-- Usage warning for connections in use -->
            <div v-if="usage?.isUsed" class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p class="font-medium text-amber-800 dark:text-amber-200 mb-2">
                <Icon name="i-heroicons-exclamation-triangle" class="w-4 h-4 inline mr-1"/>
                This connection is in use!
              </p>
              
              <!-- Charts list -->
              <div v-if="usage.charts.count > 0" class="mb-2">
                <p class="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {{ usage.charts.count }} chart{{ usage.charts.count !== 1 ? 's' : '' }}:
                </p>
                <ul class="text-sm text-amber-600 dark:text-amber-400 list-disc list-inside ml-2">
                  <li v-for="chart in usage.charts.items.slice(0, 5)" :key="chart.id">
                    {{ chart.name }}
                  </li>
                  <li v-if="usage.charts.items.length > 5" class="text-amber-500">
                    ...and {{ usage.charts.items.length - 5 }} more
                  </li>
                </ul>
              </div>
              
              <!-- Dashboards list -->
              <div v-if="usage.dashboards.count > 0" class="mb-2">
                <p class="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {{ usage.dashboards.count }} dashboard{{ usage.dashboards.count !== 1 ? 's' : '' }} affected:
                </p>
                <ul class="text-sm text-amber-600 dark:text-amber-400 list-disc list-inside ml-2">
                  <li v-for="dashboard in usage.dashboards.items.slice(0, 5)" :key="dashboard.id">
                    {{ dashboard.name }}
                  </li>
                  <li v-if="usage.dashboards.items.length > 5" class="text-amber-500">
                    ...and {{ usage.dashboards.items.length - 5 }} more
                  </li>
                </ul>
              </div>

              <!-- Filters info -->
              <div v-if="usage.filters.count > 0">
                <p class="text-sm text-amber-600 dark:text-amber-400">
                  {{ usage.filters.count }} dashboard filter{{ usage.filters.count !== 1 ? 's' : '' }} will be disconnected
                </p>
              </div>
            </div>

            <!-- Cascade delete checkbox for admins -->
            <div v-if="usage?.isUsed && isAdmin" class="mt-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="confirmCascade"
                  class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  I understand that deleting this connection will also delete all associated charts and remove widgets from dashboards
                </span>
              </label>
            </div>

            <p v-if="!usage?.isUsed" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              This action cannot be undone.
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
              class="bg-red-500 hover:bg-red-600 text-white cursor-pointer"
              :class="{ 'opacity-50 cursor-not-allowed': !canDelete }"
              :loading="loading"
              :disabled="!canDelete"
              @click="handleConfirmDelete"
          >
            {{ usage?.isUsed ? 'Delete with Dependencies' : 'Delete Data Source' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface ConnectionUsage {
  connectionId: number
  isUsed: boolean
  charts: { count: number; items: Array<{ id: number; name: string }> }
  dashboards: { count: number; items: Array<{ id: string; name: string }> }
  filters: { count: number }
}

interface DeletionResult {
  success: boolean
  deletedCharts: number
  deletedWidgets: number
  clearedFilters: number
}

const props = defineProps<{
  isOpen: boolean
  connection: { id: number; internal_name: string } | null
  usage: ConnectionUsage | null
  userRole?: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER'
  loading: boolean
  deletionResult: DeletionResult | null
}>()

const emit = defineEmits(['update:isOpen', 'closeModal', 'confirmDelete'])

const confirmCascade = ref(false)

const isAdmin = computed(() => {
  return props.userRole === 'ADMIN' || props.userRole === 'SUPERADMIN'
})

const canDelete = computed(() => {
  // If not in use, always can delete
  if (!props.usage?.isUsed) return true
  
  // If in use, must be admin and have confirmed cascade
  return isAdmin.value && confirmCascade.value
})

function handleConfirmDelete() {
  const shouldCascade = props.usage?.isUsed && confirmCascade.value
  emit('confirmDelete', shouldCascade)
}

// Reset cascade checkbox when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    confirmCascade.value = false
  }
})
</script>
