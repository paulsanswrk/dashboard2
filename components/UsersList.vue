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
      <div class="col-span-5 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Email
          <Icon name="i-heroicons-chevron-up-down" class="w-4 h-4"/>
        </div>
      </div>
      <div class="col-span-6 font-medium text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1">
          Name
          <Icon name="i-heroicons-chevron-up-down" class="w-4 h-4"/>
        </div>
      </div>
    </div>

    <!-- Table Rows -->
    <div 
      v-for="user in filteredUsers" 
      :key="user.id"
      class="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer border-b last:border-b-0"
      @click="$emit('selectUser', user)"
    >
      <div class="col-span-1 flex items-center">
        <UCheckbox 
          :model-value="selectedUsers.has(user.id)"
          @update:model-value="(checked) => toggleUserSelection(user.id, checked)"
          @click.stop
        />
      </div>
      <div class="col-span-5 text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ user.email }}
      </div>
      <div class="col-span-6 text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ user.name || 'No name' }}
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  users: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedUsers: {
    type: Set,
    required: true
  }
})

const emit = defineEmits(['selectUser', 'toggleSelectAll', 'toggleUserSelection'])

// Search functionality
const filteredUsers = computed(() => {
  if (!props.searchQuery.trim()) {
    return props.users
  }
  
  const query = props.searchQuery.toLowerCase()
  return props.users.filter(user => 
    user.name?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query)
  )
})

// Selection functionality
const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && 
         filteredUsers.value.every(user => props.selectedUsers.has(user.id))
})

const toggleSelectAll = (checked) => {
  emit('toggleSelectAll', checked)
}

const toggleUserSelection = (userId, checked) => {
  emit('toggleUserSelection', userId, checked)
}
</script>
