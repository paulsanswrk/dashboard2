<template>
  <UModal v-model="isOpen">
    <UCard class="w-full max-w-2xl mx-4">
      <template #header>
        <h3 class="text-lg font-semibold">Share Dashboard</h3>
      </template>
      
      <UTabs :items="tabs" class="w-full">
        <template #users="{ item }">
          <div class="space-y-4 max-h-96 overflow-y-auto">
            <div 
              v-for="user in users" 
              :key="user.id"
              class="flex items-center justify-between p-3 border rounded"
            >
              <div class="min-w-0 flex-1">
                <h4 class="font-medium truncate">{{ user.name }}</h4>
                <p class="text-sm text-gray-500 truncate">{{ user.email }}</p>
              </div>
              <UToggle v-model="user.hasAccess" class="ml-2 flex-shrink-0" />
            </div>
          </div>
        </template>

        <template #viewers="{ item }">
          <div class="space-y-4 max-h-96 overflow-y-auto">
            <div 
              v-for="viewer in viewers" 
              :key="viewer.id"
              class="flex items-center justify-between p-3 border rounded"
            >
              <div class="min-w-0 flex-1">
                <h4 class="font-medium truncate">{{ viewer.name }}</h4>
                <p class="text-sm text-gray-500 truncate">{{ viewer.email }}</p>
              </div>
              <UToggle v-model="viewer.hasAccess" class="ml-2 flex-shrink-0" />
            </div>
          </div>
        </template>

        <template #public="{ item }">
          <div class="space-y-4">
            <UFormGroup label="Public URL">
              <div class="flex flex-col sm:flex-row gap-2">
                <UInput 
                  value="https://app.optiqo.com/public/dashboard/abc123" 
                  readonly 
                  class="flex-1"
                />
                <UButton size="sm" variant="outline" class="w-full sm:w-auto">
                  <Icon name="heroicons:clipboard-document" class="w-4 h-4" />
                </UButton>
              </div>
            </UFormGroup>
            
            <UFormGroup label="Embed Code">
              <UTextarea 
                :value="embedCode"
                readonly
                rows="3"
                class="font-mono text-xs"
              />
            </UFormGroup>

            <UCheckbox v-model="isPasswordProtected">
              Password protected
            </UCheckbox>
          </div>
        </template>
      </UTabs>
    </UCard>
  </UModal>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tabs = [
  { key: 'users', label: 'Users' },
  { key: 'viewers', label: 'Viewers' },
  { key: 'public', label: 'Public URL' }
]

const users = ref([
  { id: 1, name: 'John Smith', email: 'john@company.com', hasAccess: false },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@company.com', hasAccess: true },
  { id: 3, name: 'Mike Chen', email: 'mike@company.com', hasAccess: false }
])

const viewers = ref([
  { id: 1, name: 'Alice Brown', email: 'viewer1@external.com', hasAccess: false },
  { id: 2, name: 'Bob Wilson', email: 'viewer2@external.com', hasAccess: true }
])

const embedCode = ref('<iframe src="https://app.optiqo.com/public/dashboard/abc123" width="100%" height="400"></iframe>')
const isPasswordProtected = ref(false)
</script>
