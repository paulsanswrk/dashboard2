<template>
  <UModal v-model:open="visible" class="w-full max-w-4xl">
    <template #header>
      <div class="w-full flex items-center justify-between">
        <h2 class="text-lg font-semibold">Widget Library</h2>
        <UButton
            variant="ghost"
            color="gray"
            size="xs"
            icon="i-heroicons-x-mark"
            class="hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            @click="handleClose"
        />
      </div>
    </template>

    <template #body>
      <div class="flex flex-col h-[560px]">
        <!-- Main content area with scrolling -->
        <div class="flex gap-4 flex-1 min-h-0">
          <!-- Category Sidebar -->
          <div class="w-48 flex-shrink-0 border-r pr-4 overflow-y-auto">
            <div class="space-y-1">
              <button
                  v-for="cat in categories"
                  :key="cat.id"
                  @click="selectedCategory = cat.id"
                  :class="[
                    'w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer',
                    selectedCategory === cat.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  ]"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>

          <!-- Main Content -->
          <div class="flex-1 flex flex-col min-w-0">
            <!-- Search and View Toggle -->
            <div class="mb-3 flex items-center gap-2">
              <div class="relative flex-1">
                <Icon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                <input
                    v-model="searchQuery"
                    placeholder="Search icons..."
                    class="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    v-if="searchQuery"
                    @click="searchQuery = ''"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
                </button>
              </div>
              <!-- View Toggle -->
              <div class="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                    @click="viewMode = 'grid'"
                    :class="[
                      'p-2 cursor-pointer transition-colors',
                      viewMode === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]"
                    title="Grid view"
                >
                  <Icon name="i-heroicons-squares-2x2" class="w-4 h-4"/>
                </button>
                <button
                    @click="viewMode = 'table'"
                    :class="[
                      'p-2 cursor-pointer transition-colors',
                      viewMode === 'table'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    ]"
                    title="List view"
                >
                  <Icon name="i-heroicons-bars-3" class="w-4 h-4"/>
                </button>
              </div>
            </div>

            <!-- Icons Container -->
            <div class="flex-1 overflow-y-auto border rounded-lg p-3 bg-white dark:bg-gray-900">
              <div v-if="filteredIcons.length === 0" class="text-center py-8 text-gray-500">
                <Icon name="i-heroicons-face-frown" class="w-12 h-12 mx-auto mb-2 opacity-50"/>
                <p>No icons found</p>
              </div>

              <!-- Grid View -->
              <div v-else-if="viewMode === 'grid'" class="grid grid-cols-6 gap-2">
                <button
                    v-for="icon in filteredIcons"
                    :key="icon.name"
                    @click="selectIcon(icon)"
                    :class="[
                      'p-3 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer border',
                      selectedIconName === icon.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    ]"
                    :title="icon.label"
                >
                  <Icon :name="icon.name" class="w-6 h-6" :style="{ color: iconColor }"/>
                  <span class="text-[10px] text-gray-500 truncate w-full text-center">{{ icon.label }}</span>
                </button>
              </div>

              <!-- Table/List View -->
              <div v-else class="space-y-1">
                <button
                    v-for="icon in filteredIcons"
                    :key="icon.name"
                    @click="selectIcon(icon)"
                    :class="[
                      'w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-all cursor-pointer border',
                      selectedIconName === icon.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    ]"
                >
                  <Icon :name="icon.name" class="w-5 h-5 flex-shrink-0" :style="{ color: iconColor }"/>
                  <span class="text-sm text-gray-700 dark:text-gray-300">{{ icon.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Preview Panel -->
          <div class="w-48 flex-shrink-0 border-l pl-4 flex flex-col">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview</h3>

            <div class="flex flex-col items-center justify-center border rounded-lg bg-gray-50 dark:bg-gray-800 p-4 mb-3">
              <Icon
                  v-if="selectedIconName"
                  :name="selectedIconName"
                  class="w-16 h-16 mb-2"
                  :style="{ color: iconColor }"
              />
              <div v-else class="w-16 h-16 mb-2 flex items-center justify-center">
                <span class="text-gray-400 text-xs text-center">Select an icon</span>
              </div>
              <span v-if="selectedIconLabel" class="text-xs text-gray-600 dark:text-gray-400 text-center">{{ selectedIconLabel }}</span>
            </div>

            <!-- Color Picker -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon Color</label>
                <div class="flex items-center gap-2">
                  <input
                      type="color"
                      v-model="iconColor"
                      class="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <UInput v-model="iconColor" size="sm" class="flex-1" placeholder="#000000"/>
                </div>
              </div>

              <!-- Size Selector -->
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Size</label>
                <div class="flex gap-1">
                  <button
                      v-for="size in sizes"
                      :key="size.value"
                      @click="iconSize = size.value"
                      :class="[
                        'flex-1 px-2 py-1 text-xs rounded border cursor-pointer transition-colors',
                        iconSize === size.value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      ]"
                  >
                    {{ size.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer - always visible -->
        <div class="flex justify-end gap-3 pt-4 mt-4 border-t flex-shrink-0">
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
              :disabled="!selectedIconName"
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
interface Props {
  open?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [icon: { iconName: string; color: string; size: number }]
}>()

const visible = computed({
  get: () => props.open ?? false,
  set: (v) => emit('update:open', v)
})

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedIconName = ref<string | null>(null)
const selectedIconLabel = ref<string | null>(null)
const iconColor = ref('#374151')
const iconSize = ref(48)
const viewMode = ref<'grid' | 'table'>('grid')

const sizes = [
  {label: 'S', value: 32},
  {label: 'M', value: 48},
  {label: 'L', value: 64},
  {label: 'XL', value: 96}
]

const categories = [
  {id: 'all', name: 'All'},
  {id: 'analytics', name: 'Analytics'},
  {id: 'arrows', name: 'Arrows'},
  {id: 'buildings', name: 'Buildings'},
  {id: 'commerce', name: 'Commerce'},
  {id: 'communication', name: 'Communication'},
  {id: 'files', name: 'Files'},
  {id: 'misc', name: 'Misc'},
  {id: 'people', name: 'People'},
  {id: 'shapes', name: 'Shapes'},
  {id: 'tech', name: 'Technology'}
]

// Curated Lucide icons organized by category
const iconsByCategory: Record<string, Array<{ name: string; label: string }>> = {
  analytics: [
    {name: 'i-lucide-chart-bar', label: 'Bar Chart'},
    {name: 'i-lucide-chart-pie', label: 'Pie Chart'},
    {name: 'i-lucide-chart-line', label: 'Line Chart'},
    {name: 'i-lucide-chart-area', label: 'Area Chart'},
    {name: 'i-lucide-trending-up', label: 'Trending Up'},
    {name: 'i-lucide-trending-down', label: 'Trending Down'},
    {name: 'i-lucide-activity', label: 'Activity'},
    {name: 'i-lucide-bar-chart-2', label: 'Bar Chart 2'},
    {name: 'i-lucide-bar-chart-3', label: 'Bar Chart 3'},
    {name: 'i-lucide-bar-chart-4', label: 'Bar Chart 4'},
    {name: 'i-lucide-pie-chart', label: 'Pie'},
    {name: 'i-lucide-gauge', label: 'Gauge'},
    {name: 'i-lucide-percent', label: 'Percent'},
    {name: 'i-lucide-calculator', label: 'Calculator'},
    {name: 'i-lucide-sigma', label: 'Sigma'},
    {name: 'i-lucide-chart-candlestick', label: 'Candlestick'},
    {name: 'i-lucide-chart-column', label: 'Column Chart'},
    {name: 'i-lucide-chart-gantt', label: 'Gantt Chart'},
    {name: 'i-lucide-chart-network', label: 'Network Chart'},
    {name: 'i-lucide-chart-scatter', label: 'Scatter Chart'}
  ],
  arrows: [
    {name: 'i-lucide-arrow-up', label: 'Arrow Up'},
    {name: 'i-lucide-arrow-down', label: 'Arrow Down'},
    {name: 'i-lucide-arrow-left', label: 'Arrow Left'},
    {name: 'i-lucide-arrow-right', label: 'Arrow Right'},
    {name: 'i-lucide-chevron-up', label: 'Chevron Up'},
    {name: 'i-lucide-chevron-down', label: 'Chevron Down'},
    {name: 'i-lucide-chevron-left', label: 'Chevron Left'},
    {name: 'i-lucide-chevron-right', label: 'Chevron Right'},
    {name: 'i-lucide-move', label: 'Move'},
    {name: 'i-lucide-move-horizontal', label: 'Move H'},
    {name: 'i-lucide-move-vertical', label: 'Move V'},
    {name: 'i-lucide-corner-down-left', label: 'Corner DL'},
    {name: 'i-lucide-corner-down-right', label: 'Corner DR'},
    {name: 'i-lucide-corner-up-left', label: 'Corner UL'},
    {name: 'i-lucide-corner-up-right', label: 'Corner UR'},
    {name: 'i-lucide-undo', label: 'Undo'},
    {name: 'i-lucide-redo', label: 'Redo'},
    {name: 'i-lucide-refresh-cw', label: 'Refresh'},
    {name: 'i-lucide-rotate-cw', label: 'Rotate CW'},
    {name: 'i-lucide-rotate-ccw', label: 'Rotate CCW'}
  ],
  buildings: [
    {name: 'i-lucide-building', label: 'Building'},
    {name: 'i-lucide-building-2', label: 'Building 2'},
    {name: 'i-lucide-home', label: 'Home'},
    {name: 'i-lucide-hotel', label: 'Hotel'},
    {name: 'i-lucide-warehouse', label: 'Warehouse'},
    {name: 'i-lucide-store', label: 'Store'},
    {name: 'i-lucide-factory', label: 'Factory'},
    {name: 'i-lucide-hospital', label: 'Hospital'},
    {name: 'i-lucide-school', label: 'School'},
    {name: 'i-lucide-landmark', label: 'Landmark'},
    {name: 'i-lucide-castle', label: 'Castle'},
    {name: 'i-lucide-church', label: 'Church'}
  ],
  commerce: [
    {name: 'i-lucide-shopping-cart', label: 'Cart'},
    {name: 'i-lucide-shopping-bag', label: 'Bag'},
    {name: 'i-lucide-credit-card', label: 'Credit Card'},
    {name: 'i-lucide-dollar-sign', label: 'Dollar'},
    {name: 'i-lucide-euro', label: 'Euro'},
    {name: 'i-lucide-wallet', label: 'Wallet'},
    {name: 'i-lucide-receipt', label: 'Receipt'},
    {name: 'i-lucide-banknote', label: 'Banknote'},
    {name: 'i-lucide-coins', label: 'Coins'},
    {name: 'i-lucide-piggy-bank', label: 'Piggy Bank'},
    {name: 'i-lucide-gift', label: 'Gift'},
    {name: 'i-lucide-tag', label: 'Tag'},
    {name: 'i-lucide-tags', label: 'Tags'},
    {name: 'i-lucide-package', label: 'Package'},
    {name: 'i-lucide-truck', label: 'Truck'},
    {name: 'i-lucide-shipping', label: 'Shipping'}
  ],
  communication: [
    {name: 'i-lucide-mail', label: 'Mail'},
    {name: 'i-lucide-mail-open', label: 'Mail Open'},
    {name: 'i-lucide-phone', label: 'Phone'},
    {name: 'i-lucide-phone-call', label: 'Phone Call'},
    {name: 'i-lucide-message-circle', label: 'Message'},
    {name: 'i-lucide-message-square', label: 'Message Sq'},
    {name: 'i-lucide-bell', label: 'Bell'},
    {name: 'i-lucide-bell-ring', label: 'Bell Ring'},
    {name: 'i-lucide-megaphone', label: 'Megaphone'},
    {name: 'i-lucide-send', label: 'Send'},
    {name: 'i-lucide-at-sign', label: 'At Sign'},
    {name: 'i-lucide-inbox', label: 'Inbox'},
    {name: 'i-lucide-video', label: 'Video'},
    {name: 'i-lucide-mic', label: 'Mic'},
    {name: 'i-lucide-radio', label: 'Radio'},
    {name: 'i-lucide-podcast', label: 'Podcast'}
  ],
  files: [
    {name: 'i-lucide-file', label: 'File'},
    {name: 'i-lucide-file-text', label: 'File Text'},
    {name: 'i-lucide-file-image', label: 'File Image'},
    {name: 'i-lucide-file-video', label: 'File Video'},
    {name: 'i-lucide-file-audio', label: 'File Audio'},
    {name: 'i-lucide-file-code', label: 'File Code'},
    {name: 'i-lucide-file-spreadsheet', label: 'Spreadsheet'},
    {name: 'i-lucide-folder', label: 'Folder'},
    {name: 'i-lucide-folder-open', label: 'Folder Open'},
    {name: 'i-lucide-download', label: 'Download'},
    {name: 'i-lucide-upload', label: 'Upload'},
    {name: 'i-lucide-save', label: 'Save'},
    {name: 'i-lucide-copy', label: 'Copy'},
    {name: 'i-lucide-clipboard', label: 'Clipboard'},
    {name: 'i-lucide-archive', label: 'Archive'},
    {name: 'i-lucide-trash', label: 'Trash'}
  ],
  people: [
    {name: 'i-lucide-user', label: 'User'},
    {name: 'i-lucide-users', label: 'Users'},
    {name: 'i-lucide-user-plus', label: 'User Plus'},
    {name: 'i-lucide-user-minus', label: 'User Minus'},
    {name: 'i-lucide-user-check', label: 'User Check'},
    {name: 'i-lucide-user-x', label: 'User X'},
    {name: 'i-lucide-contact', label: 'Contact'},
    {name: 'i-lucide-smile', label: 'Smile'},
    {name: 'i-lucide-frown', label: 'Frown'},
    {name: 'i-lucide-meh', label: 'Meh'},
    {name: 'i-lucide-angry', label: 'Angry'},
    {name: 'i-lucide-laugh', label: 'Laugh'}
  ],
  shapes: [
    {name: 'i-lucide-circle', label: 'Circle'},
    {name: 'i-lucide-square', label: 'Square'},
    {name: 'i-lucide-triangle', label: 'Triangle'},
    {name: 'i-lucide-diamond', label: 'Diamond'},
    {name: 'i-lucide-hexagon', label: 'Hexagon'},
    {name: 'i-lucide-octagon', label: 'Octagon'},
    {name: 'i-lucide-pentagon', label: 'Pentagon'},
    {name: 'i-lucide-star', label: 'Star'},
    {name: 'i-lucide-heart', label: 'Heart'},
    {name: 'i-lucide-cross', label: 'Cross'},
    {name: 'i-lucide-plus', label: 'Plus'},
    {name: 'i-lucide-minus', label: 'Minus'}
  ],
  misc: [
    {name: 'i-lucide-flag', label: 'Flag'},
    {name: 'i-lucide-bookmark', label: 'Bookmark'},
    {name: 'i-lucide-clock', label: 'Clock'},
    {name: 'i-lucide-calendar', label: 'Calendar'},
    {name: 'i-lucide-map', label: 'Map'},
    {name: 'i-lucide-map-pin', label: 'Map Pin'},
    {name: 'i-lucide-compass', label: 'Compass'},
    {name: 'i-lucide-globe', label: 'Globe'},
    {name: 'i-lucide-sun', label: 'Sun'},
    {name: 'i-lucide-moon', label: 'Moon'},
    {name: 'i-lucide-cloud', label: 'Cloud'},
    {name: 'i-lucide-umbrella', label: 'Umbrella'},
    {name: 'i-lucide-zap', label: 'Zap'},
    {name: 'i-lucide-flame', label: 'Flame'},
    {name: 'i-lucide-droplet', label: 'Droplet'},
    {name: 'i-lucide-leaf', label: 'Leaf'},
    {name: 'i-lucide-target', label: 'Target'},
    {name: 'i-lucide-award', label: 'Award'},
    {name: 'i-lucide-trophy', label: 'Trophy'},
    {name: 'i-lucide-crown', label: 'Crown'}
  ],
  tech: [
    {name: 'i-lucide-server', label: 'Server'},
    {name: 'i-lucide-database', label: 'Database'},
    {name: 'i-lucide-hard-drive', label: 'Hard Drive'},
    {name: 'i-lucide-cpu', label: 'CPU'},
    {name: 'i-lucide-wifi', label: 'Wifi'},
    {name: 'i-lucide-bluetooth', label: 'Bluetooth'},
    {name: 'i-lucide-smartphone', label: 'Smartphone'},
    {name: 'i-lucide-tablet', label: 'Tablet'},
    {name: 'i-lucide-laptop', label: 'Laptop'},
    {name: 'i-lucide-monitor', label: 'Monitor'},
    {name: 'i-lucide-keyboard', label: 'Keyboard'},
    {name: 'i-lucide-mouse', label: 'Mouse'},
    {name: 'i-lucide-printer', label: 'Printer'},
    {name: 'i-lucide-camera', label: 'Camera'},
    {name: 'i-lucide-code', label: 'Code'},
    {name: 'i-lucide-terminal', label: 'Terminal'},
    {name: 'i-lucide-git-branch', label: 'Git Branch'},
    {name: 'i-lucide-settings', label: 'Settings'},
    {name: 'i-lucide-wrench', label: 'Wrench'},
    {name: 'i-lucide-key', label: 'Key'},
    {name: 'i-lucide-lock', label: 'Lock'},
    {name: 'i-lucide-unlock', label: 'Unlock'},
    {name: 'i-lucide-shield', label: 'Shield'},
    {name: 'i-lucide-bug', label: 'Bug'}
  ]
}

// All icons flattened
const allIcons = computed(() => {
  const all: Array<{ name: string; label: string }> = []
  for (const cat of Object.values(iconsByCategory)) {
    all.push(...cat)
  }
  return all
})

// Filtered icons based on category and search
const filteredIcons = computed(() => {
  let icons = selectedCategory.value === 'all'
      ? allIcons.value
      : iconsByCategory[selectedCategory.value] || []

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    icons = icons.filter(icon =>
        icon.label.toLowerCase().includes(query) ||
        icon.name.toLowerCase().includes(query)
    )
  }

  return icons
})

function selectIcon(icon: { name: string; label: string }) {
  selectedIconName.value = icon.name
  selectedIconLabel.value = icon.label
}

function handleClose() {
  visible.value = false
  resetState()
}

function handleApply() {
  if (!selectedIconName.value) return

  emit('select', {
    iconName: selectedIconName.value,
    color: iconColor.value,
    size: iconSize.value
  })

  visible.value = false
  resetState()
}

function resetState() {
  searchQuery.value = ''
  selectedCategory.value = 'all'
  selectedIconName.value = null
  selectedIconLabel.value = null
  iconColor.value = '#374151'
  iconSize.value = 48
  viewMode.value = 'grid'
}

// Reset state when modal opens
watch(visible, (isOpen) => {
  if (isOpen) {
    resetState()
  }
})
</script>
