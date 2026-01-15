<template>
  <div class="series-options-panel h-full flex flex-col">
    <!-- Header with series name -->
    <div class="px-4 py-3 bg-primary text-white flex items-center justify-between">
      <span class="font-medium text-sm uppercase tracking-wide truncate">Series {{ seriesName }}</span>
      <button
        @click="$emit('close')"
        class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
      >
        <Icon name="i-heroicons-x-mark" class="w-5 h-5"/>
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-auto p-4 space-y-4 text-gray-900 dark:text-white">
      <!-- DATA SERIES OPTIONS Section -->
      <ConfigSection title="DATA SERIES OPTIONS" v-model:expanded="sections.dataSeriesOptions">
        <div class="space-y-3">
          <!-- Color Picker -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-24">Color</label>
            <ChartConfigColorPicker v-model="seriesConfig.color" :show-hex="true"/>
          </div>

          <!-- Visualization Type -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-24">Visualization</label>
            <select
              v-model="seriesConfig.visualizationType"
              class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>

          <!-- Smoothing (for line/area) -->
          <div v-if="showLineOptions" class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-24">Smoothing</label>
            <select
              v-model="seriesConfig.smoothing"
              class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white cursor-pointer"
            >
              <option value="sharp">Sharp</option>
              <option value="smooth">Smooth</option>
            </select>
          </div>

          <!-- Line Style -->
          <div v-if="showLineOptions" class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-24">Line Style</label>
            <select
              v-model="seriesConfig.lineStyle"
              class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white cursor-pointer"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          <!-- Marker Style -->
          <div v-if="showLineOptions" class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-24">Marker Style</label>
            <select
              v-model="seriesConfig.markerStyle"
              class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white cursor-pointer"
            >
              <option value="none">None</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="diamond">Diamond</option>
              <option value="triangle">Triangle</option>
            </select>
          </div>

          <!-- Secondary Axis -->
          <div v-if="showAxisOptions" class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show on Secondary Axis</label>
            <input
              type="checkbox"
              v-model="seriesConfig.showOnSecondaryAxis"
              class="w-4 h-4 cursor-pointer accent-primary"
            />
          </div>
        </div>
      </ConfigSection>

      <!-- LABELS Section -->
      <ConfigSection title="LABELS" v-model:expanded="sections.labels">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show Labels</label>
            <ToggleSwitch v-model="seriesConfig.showLabels"/>
          </div>
          <div v-if="false" class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show Labels (%)</label>
            <ToggleSwitch v-model="seriesConfig.showLabelsPercent"/>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Display Label Background</label>
            <ToggleSwitch v-model="seriesConfig.showLabelBackground"/>
          </div>
          <div v-if="seriesConfig.showLabels || seriesConfig.showLabelsPercent">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Label Font</label>
            <ChartConfigFontSettings v-model="seriesConfig.labelFont"/>
          </div>
        </div>
      </ConfigSection>

      <!-- TREND LINE Section -->
      <ConfigSection title="TREND LINE" v-model:expanded="sections.trendLine">
        <div class="flex items-center justify-between">
          <label class="text-xs text-gray-600 dark:text-gray-400">Show Trend Line</label>
          <ToggleSwitch v-model="seriesConfig.showTrendLine"/>
        </div>
      </ConfigSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import ChartConfigColorPicker from './ChartConfigColorPicker.vue'
import ChartConfigFontSettings from './ChartConfigFontSettings.vue'
import { ConfigSection, ToggleSwitch } from './ChartConfigEditor.vue'
import { useReportState, type SeriesConfig } from '../../composables/useReportState'

const props = defineProps<{
  seriesName: string
  chartType: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { appearance } = useReportState()

// Section expansion state
const sections = reactive({
  dataSeriesOptions: true,
  labels: false,
  trendLine: false
})

// Whether to show line-specific options (smoothing, line style, marker)
const showLineOptions = computed(() => {
  const vizType = seriesConfig.value.visualizationType || 'default'
  if (vizType === 'line' || vizType === 'area') return true
  if (vizType === 'default' && ['line', 'area'].includes(props.chartType)) return true
  return false
})

// Whether to show axis options (secondary axis)
const showAxisOptions = computed(() => {
  return ['bar', 'column', 'line', 'area', 'stacked'].includes(props.chartType)
})

// Computed series config that reads/writes to appearance.seriesOptions
const seriesConfig = computed<SeriesConfig>({
  get: () => {
    if (!appearance.value) return {}
    if (!appearance.value.seriesOptions) appearance.value.seriesOptions = {}
    if (!appearance.value.seriesOptions[props.seriesName]) {
      appearance.value.seriesOptions[props.seriesName] = {}
    }
    return appearance.value.seriesOptions[props.seriesName]
  },
  set: (val) => {
    if (!appearance.value) return
    if (!appearance.value.seriesOptions) appearance.value.seriesOptions = {}
    appearance.value.seriesOptions[props.seriesName] = val
  }
})
</script>

<style scoped>
.series-options-panel {
  font-size: 0.875rem;
}
</style>
