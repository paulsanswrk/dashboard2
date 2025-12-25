<template>
  <div class="space-y-5">
    <!-- Image Preview -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Image Preview</label>
      <div class="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
        <img
            v-if="imageUrl"
            :src="imageUrl"
            alt="Selected image"
            class="max-w-full max-h-full object-contain"
        />
        <div v-else class="text-gray-400 text-center">
          <Icon name="i-heroicons-photo" class="w-8 h-8 mx-auto mb-1"/>
          <span class="text-xs">No image</span>
        </div>
      </div>
    </div>

    <!-- Change Image Button -->
    <UButton
        v-if="!readonly"
        variant="outline"
        color="blue"
        size="sm"
        class="w-full cursor-pointer"
        @click="$emit('change-image')"
    >
      <Icon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1"/>
      Change Image
    </UButton>

    <!-- Object Fit -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Object Fit</label>
      <div class="flex gap-1 flex-wrap">
        <button
            v-for="option in objectFitOptions"
            :key="option.value"
            class="px-2 py-1 text-xs rounded border cursor-pointer transition-colors"
            :class="objectFit === option.value
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
            :disabled="readonly"
            @click="handleStyleChange('objectFit', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- SHAPE Section -->
    <div class="border-t pt-4">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Shape</h4>

      <!-- Background Color -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Background Color</label>
        <div class="flex gap-2 items-center">
          <input
              type="color"
              :value="backgroundColor"
              :disabled="readonly"
              class="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              @input="handleStyleChange('backgroundColor', ($event.target as HTMLInputElement).value)"
          />
          <UInput
              :model-value="backgroundColor"
              :disabled="readonly"
              size="sm"
              class="flex-1"
              @update:model-value="handleStyleChange('backgroundColor', $event)"
          />
        </div>
      </div>

      <!-- Corner Radius -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Corner Radius</label>
        <div class="flex gap-1 flex-wrap">
          <button
              v-for="option in cornerRadiusOptions"
              :key="option.value"
              class="px-2 py-1 text-xs rounded border cursor-pointer transition-colors"
              :class="borderRadius === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
              :disabled="readonly"
              @click="handleStyleChange('borderRadius', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Border Color -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Border Color</label>
        <div class="flex gap-2 items-center">
          <input
              type="color"
              :value="borderColor"
              :disabled="readonly"
              class="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              @input="handleStyleChange('borderColor', ($event.target as HTMLInputElement).value)"
          />
          <UInput
              :model-value="borderColor"
              :disabled="readonly"
              size="sm"
              class="flex-1"
              @update:model-value="handleStyleChange('borderColor', $event)"
          />
        </div>
      </div>

      <!-- Border Width -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Border Width</label>
        <div class="flex gap-1 flex-wrap">
          <button
              v-for="option in borderWidthOptions"
              :key="option.value"
              class="px-2 py-1 text-xs rounded border cursor-pointer transition-colors"
              :class="borderWidth === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
              :disabled="readonly"
              @click="handleStyleChange('borderWidth', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Border Style -->
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Border Style</label>
        <div class="flex gap-1 flex-wrap">
          <button
              v-for="option in borderStyleOptions"
              :key="option.value"
              class="px-2 py-1 text-xs rounded border cursor-pointer transition-colors"
              :class="borderStyle === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
              :disabled="readonly"
              @click="handleStyleChange('borderStyle', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- SHADOW Section -->
    <div class="border-t pt-4">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Shadow</h4>

      <!-- Shadow Color -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Shadow Color</label>
        <div class="flex gap-2 items-center">
          <input
              type="color"
              :value="shadowColor"
              :disabled="readonly"
              class="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              @input="handleStyleChange('shadowColor', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Shadow Size -->
      <div class="space-y-2 mb-3">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Shadow Size</label>
        <div class="flex gap-1 flex-wrap">
          <button
              v-for="option in shadowSizeOptions"
              :key="option.value"
              class="px-2 py-1 text-xs rounded border cursor-pointer transition-colors"
              :class="shadowSize === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
              :disabled="readonly"
              @click="handleStyleChange('shadowSize', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Shadow Position -->
      <div class="space-y-2">
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Shadow Position</label>
        <div class="grid grid-cols-3 gap-1 w-24">
          <button
              v-for="option in shadowPositionOptions"
              :key="option.value"
              class="p-1 text-xs rounded border cursor-pointer transition-colors flex items-center justify-center"
              :class="shadowPosition === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
              :disabled="readonly"
              @click="handleStyleChange('shadowPosition', option.value)"
              :title="option.label"
          >
            <span class="w-2 h-2 bg-current rounded-full"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- INTERACTIVE LINK Section -->
    <div class="border-t pt-4">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Interactive Link</h4>

      <div class="flex items-center gap-2 mb-3">
        <input
            type="checkbox"
            :checked="linkEnabled"
            :disabled="readonly"
            class="rounded border-gray-300 text-blue-600 cursor-pointer"
            @change="handleStyleChange('linkEnabled', ($event.target as HTMLInputElement).checked)"
        />
        <label class="text-sm text-gray-700 dark:text-gray-300">Enable click action</label>
      </div>

      <div v-if="linkEnabled" class="space-y-3 pl-4">
        <!-- Link Type Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Link Type</label>
          <div class="flex gap-2">
            <button
                class="px-3 py-1 text-xs rounded border cursor-pointer transition-colors"
                :class="linkType === 'url'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
                :disabled="readonly"
                @click="handleStyleChange('linkType', 'url')"
            >
              URL
            </button>
            <button
                class="px-3 py-1 text-xs rounded border cursor-pointer transition-colors"
                :class="linkType === 'tab'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-400'"
                :disabled="readonly"
                @click="handleStyleChange('linkType', 'tab')"
            >
              Dashboard Tab
            </button>
          </div>
        </div>

        <!-- URL Input -->
        <div v-if="linkType === 'url'" class="space-y-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">URL</label>
          <UInput
              :model-value="linkUrl"
              :disabled="readonly"
              size="sm"
              placeholder="https://..."
              @update:model-value="handleStyleChange('linkUrl', $event)"
          />
          <div class="flex items-center gap-2">
            <input
                type="checkbox"
                :checked="linkNewTab"
                :disabled="readonly"
                class="rounded border-gray-300 text-blue-600 cursor-pointer"
                @change="handleStyleChange('linkNewTab', ($event.target as HTMLInputElement).checked)"
            />
            <label class="text-sm text-gray-700 dark:text-gray-300">Open in new tab</label>
          </div>
        </div>

        <!-- Dashboard/Tab Selector -->
        <div v-if="linkType === 'tab'" class="space-y-3">
          <div class="space-y-2">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Dashboard</label>
            <USelectMenu
                :model-value="selectedDashboardItem"
                :items="dashboardItems"
                :disabled="readonly || loadingDashboards"
                placeholder="Select dashboard..."
                class="w-full"
                @update:model-value="handleDashboardChange"
            />
          </div>
          <div v-if="linkDashboardId" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Tab</label>
            <USelectMenu
                :model-value="selectedTabItem"
                :items="tabItems"
                :disabled="readonly || loadingTabs"
                placeholder="Select tab..."
                class="w-full"
                @update:model-value="handleTabChange"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DashboardOption {
  id: string
  name: string
}

interface TabOption {
  id: string
  name: string
}

const props = defineProps<{
  imageUrl?: string
  objectFit?: string
  backgroundColor?: string
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  shadowColor?: string
  shadowSize?: string
  shadowPosition?: string
  linkEnabled?: boolean
  linkType?: string
  linkUrl?: string
  linkNewTab?: boolean
  linkDashboardId?: string
  linkTabId?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update-style': [partial: Record<string, any>]
  'change-image': []
}>()

// Object Fit options
const objectFitOptions = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Fill', value: 'fill' },
  { label: 'None', value: 'none' }
]

// Corner radius presets matching original app
const cornerRadiusOptions = [
  { label: 'Square', value: 0 },
  { label: 'Less', value: 4 },
  { label: 'Rounded', value: 8 },
  { label: 'More', value: 16 },
  { label: 'Circular', value: 50 }
]

// Border width options
const borderWidthOptions = [
  { label: 'None', value: 0 },
  { label: 'Very Thin', value: 1 },
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 3 },
  { label: 'Bold', value: 4 },
  { label: 'Very Bold', value: 6 }
]

// Border style options
const borderStyleOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'Double', value: 'double' }
]

// Shadow size options
const shadowSizeOptions = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Normal', value: 'normal' },
  { label: 'Large', value: 'large' }
]

// Shadow position options (3x3 grid)
const shadowPositionOptions = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top', value: 'top' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Left', value: 'left' },
  { label: 'Middle', value: 'middle' },
  { label: 'Right', value: 'right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Bottom Right', value: 'bottom-right' }
]

// Computed values with defaults
const objectFit = computed(() => props.objectFit ?? 'cover')
const backgroundColor = computed(() => props.backgroundColor ?? 'transparent')
const borderRadius = computed(() => props.borderRadius ?? 0)
const borderColor = computed(() => props.borderColor ?? '#cccccc')
const borderWidth = computed(() => props.borderWidth ?? 0)
const borderStyle = computed(() => props.borderStyle ?? 'solid')
const shadowColor = computed(() => props.shadowColor ?? '#00000033')
const shadowSize = computed(() => props.shadowSize ?? 'none')
const shadowPosition = computed(() => props.shadowPosition ?? 'bottom-right')
const linkEnabled = computed(() => props.linkEnabled ?? false)
const linkType = computed(() => props.linkType ?? 'url')
const linkUrl = computed(() => props.linkUrl ?? '')
const linkNewTab = computed(() => props.linkNewTab ?? false)
const linkDashboardId = computed(() => props.linkDashboardId ?? '')
const linkTabId = computed(() => props.linkTabId ?? '')

// Dashboard and tab loading
const loadingDashboards = ref(false)
const loadingTabs = ref(false)
const dashboardOptions = ref<DashboardOption[]>([])
const tabOptions = ref<TabOption[]>([])

const selectedDashboard = computed(() => {
  return dashboardOptions.value.find(d => d.id === linkDashboardId.value) || null
})

const selectedTab = computed(() => {
  return tabOptions.value.find(t => t.id === linkTabId.value) || null
})

// Format items for USelectMenu (needs label property)
const dashboardItems = computed(() => {
  return dashboardOptions.value.map(d => ({
    id: d.id,
    label: d.name,
    value: d
  }))
})

const tabItems = computed(() => {
  return tabOptions.value.map(t => ({
    id: t.id,
    label: t.name,
    value: t
  }))
})

const selectedDashboardItem = computed(() => {
  if (!linkDashboardId.value) return null
  return dashboardItems.value.find(d => d.id === linkDashboardId.value) || null
})

const selectedTabItem = computed(() => {
  if (!linkTabId.value) return null
  return tabItems.value.find(t => t.id === linkTabId.value) || null
})

// Load dashboards when link type is set to 'tab'
watch(() => linkType.value, async (newType) => {
  if (newType === 'tab' && dashboardOptions.value.length === 0) {
    await loadDashboards()
  }
}, { immediate: true })

// Load tabs when dashboard is selected
watch(() => linkDashboardId.value, async (dashboardId) => {
  if (dashboardId) {
    await loadTabs(dashboardId)
  } else {
    tabOptions.value = []
  }
}, { immediate: true })

async function loadDashboards() {
  loadingDashboards.value = true
  try {
    // API returns array directly, not {dashboards: [...]}
    const response = await $fetch<Array<{ id: string, name: string }>>('/api/dashboards')
    dashboardOptions.value = (response || []).map(d => ({
      id: d.id,
      name: d.name
    }))
  } catch (error) {
    console.error('Failed to load dashboards:', error)
    dashboardOptions.value = []
  } finally {
    loadingDashboards.value = false
  }
}

async function loadTabs(dashboardId: string) {
  loadingTabs.value = true
  try {
    const response = await $fetch<{ tabs: Array<{ id: string, name: string }> }>(`/api/dashboards/${dashboardId}/tabs`)
    tabOptions.value = response.tabs?.map(t => ({
      id: t.id,
      name: t.name
    })) || []
  } catch (error) {
    console.error('Failed to load tabs:', error)
    tabOptions.value = []
  } finally {
    loadingTabs.value = false
  }
}

function handleStyleChange(key: string, value: any) {
  emit('update-style', { [key]: value })
}

function handleDashboardChange(item: { id: string; label: string; value: DashboardOption } | null) {
  if (item?.value) {
    emit('update-style', { linkDashboardId: item.value.id, linkTabId: '' })
  } else {
    emit('update-style', { linkDashboardId: '', linkTabId: '' })
  }
}

function handleTabChange(item: { id: string; label: string; value: TabOption } | null) {
  emit('update-style', { linkTabId: item?.value?.id || '' })
}
</script>

