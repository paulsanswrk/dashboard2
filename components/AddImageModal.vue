<template>
  <UModal v-model:open="visible" class="w-full max-w-2xl">
    <template #header>
      <div class="w-full bg-blue-600 text-white px-4 py-3 -m-4 mb-0 rounded-t-lg flex items-center justify-between">
        <h2 class="text-lg font-semibold uppercase tracking-wide">Insert Image</h2>
        <UButton
            variant="ghost"
            color="white"
            size="xs"
            icon="i-heroicons-x-mark"
            class="hover:bg-blue-700 cursor-pointer text-white"
            @click="handleClose"
        />
      </div>
    </template>

    <template #body>
      <div class="space-y-4 pt-4">
        <!-- Image List -->
        <div class="border rounded-lg overflow-hidden">
          <div v-if="loading" class="flex items-center justify-center py-8">
            <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400"/>
            <span class="ml-2 text-gray-500">Loading images...</span>
          </div>

          <div v-else-if="images.length === 0" class="py-8 text-center text-gray-500">
            <Icon name="i-heroicons-photo" class="w-12 h-12 mx-auto mb-2 opacity-50"/>
            <p>No images uploaded yet</p>
            <p class="text-sm">Upload your first image to get started</p>
          </div>

          <div v-else class="max-h-64 overflow-y-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th class="w-8 px-2 py-2">
                    <input
                        type="checkbox"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        :checked="allSelected"
                        @change="toggleSelectAll"
                    />
                  </th>
                  <th class="w-16 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Upload Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                    v-for="image in images"
                    :key="image.path"
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    :class="{'bg-blue-50 dark:bg-blue-900/20': isSelected(image.path)}"
                    @click="toggleSelect(image.path)"
                >
                  <td class="w-8 px-2 py-2">
                    <input
                        type="checkbox"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        :checked="isSelected(image.path)"
                        @click.stop
                        @change="toggleSelect(image.path)"
                    />
                  </td>
                  <td class="w-16 px-2 py-2">
                    <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                      <img :src="image.url" :alt="image.filename" class="w-full h-full object-cover"/>
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm truncate max-w-xs">{{ image.filename }}</td>
                  <td class="px-3 py-2 text-sm text-gray-500">{{ formatDate(image.uploadedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <button
              class="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              :disabled="selectedPaths.length === 0 || deleting"
              @click="handleDelete"
          >
            <Icon name="i-heroicons-x-circle" class="w-5 h-5"/>
            <span>Delete selected</span>
          </button>

          <label class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
            <Icon name="i-heroicons-plus-circle" class="w-5 h-5"/>
            <span>Upload new image</span>
            <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                class="hidden"
                :disabled="uploading"
                @change="handleUpload"
            />
          </label>

          <span v-if="uploading" class="text-sm text-gray-500 flex items-center gap-1">
            <Icon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin"/>
            Uploading...
          </span>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
          {{ error }}
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <UButton
              variant="outline"
              color="gray"
              class="cursor-pointer"
              @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
              color="green"
              class="cursor-pointer bg-green-600 hover:bg-green-700 text-white"
              :disabled="selectedPaths.length !== 1"
              @click="handleApply"
          >
            Apply
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface DashboardImage {
  id: string
  path: string
  filename: string
  url: string
  size: number
  type: string
  uploadedAt: string
}

interface Props {
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [image: DashboardImage]
}>()

const visible = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

const images = ref<DashboardImage[]>([])
const selectedPaths = ref<string[]>([])
const loading = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const error = ref<string | null>(null)

const allSelected = computed(() => images.value.length > 0 && selectedPaths.value.length === images.value.length)

function isSelected(path: string) {
  return selectedPaths.value.includes(path)
}

function toggleSelect(path: string) {
  if (isSelected(path)) {
    selectedPaths.value = selectedPaths.value.filter(p => p !== path)
  } else {
    selectedPaths.value = [...selectedPaths.value, path]
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedPaths.value = []
  } else {
    selectedPaths.value = images.value.map(i => i.path)
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
}

async function loadImages() {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch<{success: boolean, images: DashboardImage[]}>('/api/dashboard-images')
    images.value = response.images || []
  } catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load images'
  } finally {
    loading.value = false
  }
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{success: boolean, image: DashboardImage}>('/api/dashboard-images', {
      method: 'POST',
      body: formData
    })

    if (response.image) {
      images.value = [response.image, ...images.value]
      selectedPaths.value = [response.image.path]
    }
  } catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Upload failed'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function handleDelete() {
  if (selectedPaths.value.length === 0) return

  if (!confirm(`Delete ${selectedPaths.value.length} image(s)? This cannot be undone.`)) return

  deleting.value = true
  error.value = null

  try {
    await $fetch('/api/dashboard-images', {
      method: 'DELETE',
      body: {paths: selectedPaths.value}
    })

    images.value = images.value.filter(i => !selectedPaths.value.includes(i.path))
    selectedPaths.value = []
  } catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Delete failed'
  } finally {
    deleting.value = false
  }
}

function handleApply() {
  if (selectedPaths.value.length !== 1) return

  const selected = images.value.find(i => i.path === selectedPaths.value[0])
  if (selected) {
    emit('select', selected)
  }
  visible.value = false
}

function handleClose() {
  visible.value = false
}

// Load images when modal opens
watch(visible, (isOpen) => {
  if (isOpen) {
    loadImages()
    selectedPaths.value = []
    error.value = null
  }
})
</script>
