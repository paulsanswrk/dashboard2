<template>
  <UModal v-model:open="modelOpen">
    <template #header>
      <h3 class="text-lg font-semibold">Add Link to Widget</h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <UFormField label="URL" name="url">
          <UInput
              v-model="linkUrl"
              placeholder="https://example.com"
              class="w-full"
              autofocus
              @keyup.enter="submit"
          />
        </UFormField>
        <UFormField label="Open in" name="target">
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" v-model="linkTarget" value="_blank" class="accent-orange-500"/>
              New Tab
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" v-model="linkTarget" value="_self" class="accent-orange-500"/>
              Same Tab
            </label>
          </div>
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="modelOpen = false">Cancel</UButton>
          <UButton color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :disabled="!isValid" @click="submit">Add Link</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  initialUrl?: string
  initialTarget?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: { url: string; target: string }]
}>()

const modelOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

const linkUrl = ref(props.initialUrl || '')
const linkTarget = ref(props.initialTarget || '_blank')

watch(() => props.open, (open) => {
  if (open) {
    linkUrl.value = props.initialUrl || ''
    linkTarget.value = props.initialTarget || '_blank'
  }
})

const isValid = computed(() => {
  try {
    if (!linkUrl.value.trim()) return false
    // Allow URLs with or without protocol
    const url = linkUrl.value.trim()
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
  } catch {
    return false
  }
})

function submit() {
  if (!isValid.value) return
  emit('save', { url: linkUrl.value.trim(), target: linkTarget.value })
  modelOpen.value = false
}
</script>
