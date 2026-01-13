<template>
  <div class="space-y-4">
    <div class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
      {{ activeTabName }} Tab Options
    </div>

    <!-- Dashboard Width Section (dashboard-level setting) -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Dashboard Width</div>
      <USelectMenu
          :model-value="selectedWidthPreset"
          :items="widthPresetItems"
          value-key="value"
          @update:model-value="handleWidthPresetChange"
          :disabled="readonly"
          size="sm"
          class="w-full"
      />
      <div v-if="showCustomWidthInput" class="mt-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ customWidthValue }}px</span>
        </div>
        <input
            type="range"
            :value="customWidthValue"
            @input="handleSliderChange"
            :min="800"
            :max="3840"
            :step="10"
            :disabled="readonly"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div class="flex justify-between text-[10px] text-gray-400">
          <span>800px</span>
          <span>3840px</span>
        </div>
      </div>
    </div>

    <!-- Tab Style Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Tab Style</div>

      <!-- Tab Background Color -->
      <div class="space-y-1 mb-3">
        <label class="text-xs text-gray-600 dark:text-gray-400">Tab Background</label>
        <div class="flex items-center gap-2">
          <input
              type="color"
              :value="localStyle.backgroundColor || '#ffffff'"
              @input="updateStyle('backgroundColor', ($event.target as HTMLInputElement).value)"
              :disabled="readonly"
              class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
          />
          <UInput
              :model-value="localStyle.backgroundColor || ''"
              @update:model-value="updateStyle('backgroundColor', $event)"
              :disabled="readonly"
              size="xs"
              class="flex-1"
              placeholder="transparent"
          />
          <button
              v-if="localStyle.backgroundColor"
              @click="updateStyle('backgroundColor', '')"
              :disabled="readonly"
              class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer disabled:opacity-50"
              title="Reset to transparent"
          >
            <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
          </button>
        </div>
        <div v-if="!localStyle.backgroundColor" class="text-[10px] text-gray-400 italic">
          Transparent (grid visible in edit mode)
        </div>
      </div>


      <!-- Font Family -->
      <div class="space-y-1">
        <label class="text-xs text-gray-600 dark:text-gray-400">Font Family</label>
        <USelectMenu
            :model-value="selectedFontFamily"
            :items="fontFamilyItems"
            value-key="value"
            @update:model-value="handleFontFamilyChange"
            :disabled="readonly"
            size="sm"
            class="w-full"
        />
      </div>
    </div>

    <!-- Series Colors Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Series Colors</div>
      <div class="grid grid-cols-4 gap-2">
        <div v-for="(color, index) in seriesColors" :key="index" class="flex flex-col items-center">
          <input
              type="color"
              :value="color"
              @input="updateSeriesColor(index, ($event.target as HTMLInputElement).value)"
              :disabled="readonly"
              class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
              :title="`Series ${index + 1}`"
          />
          <span class="text-[10px] text-gray-400 mt-1">{{ index + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Chart Background Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Chart Background</div>
      <div class="flex items-center gap-2">
        <input
            type="color"
            :value="localStyle.chartBackground || '#ffffff'"
            @input="updateStyle('chartBackground', ($event.target as HTMLInputElement).value)"
            :disabled="readonly"
            class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
        />
        <UInput
            :model-value="localStyle.chartBackground || '#ffffff'"
            @update:model-value="updateStyle('chartBackground', $event)"
            :disabled="readonly"
            size="xs"
            class="flex-1"
        />
      </div>
    </div>

    <!-- Design Themes Section -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Design Themes</div>
      <USelectMenu
          :model-value="selectedTheme"
          :items="themeItems"
          value-key="value"
          @update:model-value="applyTheme"
          :disabled="readonly"
          size="sm"
          class="w-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, watch} from 'vue'
import {DEFAULT_SERIES_COLORS, FONT_FAMILY_OPTIONS, getThemeOptions, PREDEFINED_THEMES, type TabStyleOptions} from '~/types/tab-options'
import {DASHBOARD_WIDTH, DASHBOARD_WIDTH_PRESETS} from '~/lib/dashboard-constants'

const props = defineProps<{
  tabStyle: TabStyleOptions
  activeTabName?: string
  readonly?: boolean
  dashboardWidth?: number
}>()

const emit = defineEmits<{
  'update:tabStyle': [style: TabStyleOptions]
  'update:dashboardWidth': [width: number]
}>()

// Dashboard width presets with custom option
const widthPresetItems = [
  ...DASHBOARD_WIDTH_PRESETS,
  { label: 'Custom', value: 0 }, // 0 indicates custom mode
]

// Local state to track if custom mode is explicitly selected
const isCustomModeSelected = ref(false)

const showCustomWidthInput = computed(() => {
  // Show custom input if:
  // 1. Custom mode was explicitly selected from dropdown, OR
  // 2. Current width doesn't match any preset
  return isCustomModeSelected.value || !DASHBOARD_WIDTH_PRESETS.some(p => p.value === props.dashboardWidth)
})

const customWidthValue = computed(() => {
  return props.dashboardWidth || DASHBOARD_WIDTH
})

const selectedWidthPreset = computed(() => {
  // If in custom mode, return the Custom option
  if (isCustomModeSelected.value) {
    return widthPresetItems.find(p => p.value === 0)
  }
  const currentWidth = props.dashboardWidth || DASHBOARD_WIDTH
  const preset = widthPresetItems.find(p => p.value === currentWidth)
  return preset || widthPresetItems.find(p => p.value === 0) // Custom
})

function handleWidthPresetChange(payload: any) {
  const value = payload?.value ?? payload
  if (typeof value === 'number' && value > 0) {
    // Preset selected - exit custom mode and set width
    isCustomModeSelected.value = false
    emit('update:dashboardWidth', value)
  } else if (value === 0) {
    // Custom selected - enter custom mode
    isCustomModeSelected.value = true
  }
}

function handleSliderChange(event: Event) {
  const target = event.target as HTMLInputElement
  const numValue = parseInt(target.value, 10)
  if (!isNaN(numValue) && numValue >= 800 && numValue <= 3840) {
    emit('update:dashboardWidth', numValue)
  }
}

// Local reactive copy of style for immediate UI updates
const localStyle = reactive<TabStyleOptions>({
  backgroundColor: props.tabStyle?.backgroundColor || '#ffffff',
  fontFamily: props.tabStyle?.fontFamily || 'Inter, sans-serif',
  seriesColors: props.tabStyle?.seriesColors || [...DEFAULT_SERIES_COLORS],
  chartBackground: props.tabStyle?.chartBackground || '#ffffff',
  theme: props.tabStyle?.theme || 'default',
})

// Sync with props
watch(() => props.tabStyle, (newStyle) => {
  if (newStyle) {
    localStyle.backgroundColor = newStyle.backgroundColor || '#ffffff'
    localStyle.fontFamily = newStyle.fontFamily || 'Inter, sans-serif'
    localStyle.seriesColors = newStyle.seriesColors || [...DEFAULT_SERIES_COLORS]
    localStyle.chartBackground = newStyle.chartBackground || '#ffffff'
    localStyle.theme = newStyle.theme || 'default'
  }
}, {deep: true})

const seriesColors = computed(() => {
  return localStyle.seriesColors || [...DEFAULT_SERIES_COLORS]
})

const fontFamilyItems = FONT_FAMILY_OPTIONS
const themeItems = getThemeOptions()

const selectedFontFamily = computed(() => {
  return fontFamilyItems.find(f => f.value === localStyle.fontFamily) || fontFamilyItems[0]
})

const selectedTheme = computed(() => {
  return themeItems.find(t => t.value === localStyle.theme) || themeItems[0]
})

function updateStyle(key: keyof TabStyleOptions, value: any) {
  (localStyle as any)[key] = value
  emitUpdate()
}

function handleFontFamilyChange(payload: any) {
  const value = payload?.value || payload
  if (value && typeof value === 'string') {
    localStyle.fontFamily = value
    emitUpdate()
  }
}

function updateSeriesColor(index: number, color: string) {
  if (!localStyle.seriesColors) {
    localStyle.seriesColors = [...DEFAULT_SERIES_COLORS]
  }
  localStyle.seriesColors[index] = color
  emitUpdate()
}

function applyTheme(payload: any) {
  const themeKey = payload?.value || payload
  const theme = PREDEFINED_THEMES[themeKey]
  if (theme) {
    localStyle.theme = themeKey
    if (theme.backgroundColor) localStyle.backgroundColor = theme.backgroundColor
    if (theme.chartBackground) localStyle.chartBackground = theme.chartBackground
    if (theme.seriesColors) localStyle.seriesColors = [...theme.seriesColors]
    emitUpdate()
  }
}

function emitUpdate() {
  emit('update:tabStyle', {...localStyle})
}
</script>
