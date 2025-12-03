<template>
  <UModal v-model:open="isOpen" class="w-full max-w-2xl mx-4">
    <template #header>
      <h3 class="text-lg font-semibold">Create New Report</h3>
    </template>

    <template #body>
      <div class="space-y-6 max-h-96 overflow-y-auto">
        <!-- Recipients and Email details -->
        <div>
          <h3 class="font-medium mb-4">Recipients and Email details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Recipients">
              <UInput
                  placeholder="Enter email addresses"
                v-model="form.recipients"
                  class="w-full"
              />
            </UFormField>
            <UFormField label="Subject">
              <UInput
                  placeholder="Report Subject"
                v-model="form.subject"
                  class="w-full"
              />
            </UFormField>
          </div>
          <div class="mt-4">
            <UFormField label="Message">
              <UTextarea 
                placeholder="Add a message to your report..." 
                v-model="form.message"
                rows="3"
              />
            </UFormField>
          </div>
        </div>

        <!-- Content -->
        <div>
          <h3 class="font-medium mb-4">Content</h3>
          <UFormField label="Format">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              <UCheckbox 
                v-for="format in formats" 
                :key="format"
                v-model="form.selectedFormats"
                :value="format"
                class="text-sm"
              >
                {{ format }}
              </UCheckbox>
            </div>
          </UFormField>
        </div>

        <!-- Schedule Report -->
        <div>
          <h3 class="font-medium mb-4">Schedule Report</h3>
          <URadioGroup v-model="form.schedule" :options="scheduleOptions" />
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        <UButton variant="outline" @click="closeModal" class="w-full sm:w-auto">
          Cancel
        </UButton>
        <UButton @click="createReport" class="w-full sm:w-auto">
          Create Report
        </UButton>
      </div>
    </template>
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

const form = ref({
  recipients: '',
  subject: '',
  message: '',
  selectedFormats: [],
  schedule: 'once'
})

const formats = ['XLS', 'CSV', 'PDF']

const scheduleOptions = [
  { label: 'Send once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
]

const closeModal = () => {
  isOpen.value = false
  // Reset form
  form.value = {
    recipients: '',
    subject: '',
    message: '',
    selectedFormats: [],
    schedule: 'once'
  }
}

const createReport = () => {
  console.log('Creating report:', form.value)
  closeModal()
}
</script>
