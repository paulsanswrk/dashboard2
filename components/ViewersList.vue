<template>
  <div class="space-y-0">
    <!-- Table Header -->
    <div class="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b">
      <div class="col-span-1">
        <UCheckbox 
          :model-value="isAllSelected" 
          @update:model-value="toggleSelectAll"
        />
      </div>
      <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Email
          <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
        </div>
      </div>
      <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Name
          <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
        </div>
      </div>
      <div class="col-span-2 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Viewer Type
          <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
        </div>
      </div>
      <div class="col-span-3 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Group
          <Icon name="heroicons:chevron-up-down" class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Table Rows -->
    <div 
      v-for="viewer in filteredViewers" 
      :key="viewer.id"
      class="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer border-b last:border-b-0"
      @click="$emit('selectViewer', viewer)"
    >
      <div class="col-span-1 flex items-center">
        <UCheckbox 
          :model-value="selectedViewers.has(viewer.id)"
          @update:model-value="(checked) => toggleViewerSelection(viewer.id, checked)"
          @click.stop
        />
      </div>
      <div class="col-span-3 text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ viewer.email }}
      </div>
      <div class="col-span-3 text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ viewer.name || 'No name' }}
      </div>
      <div class="col-span-2">
        <UBadge v-if="viewer.type" :color="viewer.type === 'Admin' ? 'red' : 'blue'" size="xs">
          {{ viewer.type }}
        </UBadge>
      </div>
      <div class="col-span-3 text-sm text-gray-600 dark:text-gray-400 truncate">
        {{ viewer.group || '' }}
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  viewers: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedViewers: {
    type: Set,
    required: true
  }
})

const emit = defineEmits(['selectViewer', 'toggleSelectAll', 'toggleViewerSelection'])

// Search functionality
const filteredViewers = computed(() => {
  if (!props.searchQuery.trim()) {
    return props.viewers
  }
  
  const query = props.searchQuery.toLowerCase()
  return props.viewers.filter(viewer => 
    viewer.name?.toLowerCase().includes(query) ||
    viewer.email?.toLowerCase().includes(query) ||
    viewer.type?.toLowerCase().includes(query) ||
    viewer.group?.toLowerCase().includes(query)
  )
})

// Selection functionality
const isAllSelected = computed(() => {
  return filteredViewers.value.length > 0 && 
         filteredViewers.value.every(viewer => props.selectedViewers.has(viewer.id))
})

const toggleSelectAll = (checked) => {
  emit('toggleSelectAll', checked)
}

const toggleViewerSelection = (viewerId, checked) => {
  emit('toggleViewerSelection', viewerId, checked)
}
</script>
