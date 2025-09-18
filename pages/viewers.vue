<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
    <!-- Mobile Viewers Toggle -->
    <div class="lg:hidden p-4 border-b bg-gray-50">
      <UButton 
        @click="toggleMobilePanel('viewers')"
        variant="outline" 
        size="sm"
        class="w-full"
      >
        <Icon name="heroicons:eye" class="w-4 h-4 mr-2" />
        Viewers ({{ viewers.length }})
      </UButton>
    </div>

    <!-- Viewers List -->
    <div 
      :class="[
        'border-r p-4 lg:p-6 transition-all duration-300',
        'w-full lg:w-1/2',
        mobilePanel === 'viewers' ? 'block' : 'hidden lg:block'
      ]"
    >
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h2 class="text-xl font-bold">Viewers ({{ filteredViewers.length }} / {{ totalViewers }})</h2>
        <UButton size="sm" @click="openAddViewerModal" class="w-full sm:w-auto" color="green">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
          Add Viewer
        </UButton>
      </div>
      
      <!-- Search and Bulk Actions -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <div class="flex-1 relative">
          <UInput 
            v-model="searchQuery" 
            placeholder="Type to search..." 
            class="w-full pr-8"
          />
          <button 
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
        <div class="flex gap-2" v-if="selectedViewers.size > 0">
          <UButton variant="outline" size="sm" @click="addToGroup" :disabled="loading">
            <Icon name="heroicons:user-group" class="w-4 h-4 mr-1" />
            add to group
          </UButton>
          <UButton color="red" variant="outline" size="sm" @click="confirmBulkDelete" :disabled="loading">
            <Icon name="heroicons:trash" class="w-4 h-4 mr-1" />
            delete
          </UButton>
        </div>
      </div>
      
      <!-- Loading state -->
      <div v-if="pending" class="space-y-2">
        <UCard v-for="i in 3" :key="i" class="animate-pulse">
          <div class="p-4">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div class="flex gap-2">
              <div class="h-5 bg-gray-200 rounded w-16"></div>
              <div class="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p class="text-red-600 mb-4">{{ error }}</p>
        <UButton @click="refresh" variant="outline">
          Try Again
        </UButton>
      </div>

      <!-- Viewers Table -->
      <div v-else-if="viewers.length > 0">
        <ViewersList
          :viewers="filteredViewers"
          :search-query="searchQuery"
          :selected-viewers="selectedViewers"
          @select-viewer="selectViewer"
          @toggle-select-all="toggleSelectAll"
          @toggle-viewer-selection="toggleViewerSelection"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-8">
        <Icon name="heroicons:eye" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-gray-500 mb-4">No viewers found</p>
        <UButton @click="openAddViewerModal" size="sm" color="green">
          Add First Viewer
        </UButton>
      </div>
    </div>

    <!-- Viewer Details -->
    <div class="flex-1 p-4 lg:p-6">
      <ViewerDetails
        :selected-viewer="selectedViewer"
        :loading="loading"
        @close-mobile-panel="closeMobilePanel"
        @save-viewer="saveViewer"
        @confirm-delete-viewer="confirmDeleteViewer"
      />
    </div>

    <!-- Add Viewer Modal -->
    <AddViewerModal
      v-model:is-open="showAddViewerModal"
      :loading="loading"
      :error="error"
      @close-modal="closeAddViewerModal"
      @add-viewer="addViewer"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteViewerModal
      v-model:is-open="showDeleteConfirmModal"
      :viewer-to-delete="viewerToDelete"
      :loading="loading"
      @close-modal="showDeleteConfirmModal = false"
      @confirm-delete="deleteViewer"
    />

    <!-- Bulk Delete Confirmation Modal -->
    <ViewersBulkDeleteModal
      v-model:is-open="showBulkDeleteConfirm"
      :selected-count="selectedViewers.size"
      :loading="loading"
      @close-modal="showBulkDeleteConfirm = false"
      @confirm-delete="bulkDeleteViewers"
    />
  </div>
</template>

<script setup>
// Use organization scope for viewers management (default)
const {
  selectedViewer,
  showAddViewerModal,
  showDeleteConfirmModal,
  viewerToDelete,
  mobilePanel,
  loading,
  error,
  searchQuery,
  selectedViewers,
  showBulkDeleteConfirm,
  pending,
  viewers,
  totalViewers,
  filteredViewers,
  newViewer,
  viewerTypeOptions,
  groupOptions,
  languageOptions,
  refresh,
  toggleMobilePanel,
  closeMobilePanel,
  selectViewer,
  openAddViewerModal,
  closeAddViewerModal,
  addViewer,
  saveViewer,
  confirmDeleteViewer,
  deleteViewer,
  addToGroup,
  confirmBulkDelete,
  bulkDeleteViewers,
  toggleSelectAll,
  toggleViewerSelection
} = useViewersManagement('organization')

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>
