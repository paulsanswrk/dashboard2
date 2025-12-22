<template>
  <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
    <!-- Chart-specific visual guide -->
    <div class="relative w-full max-w-lg">
      <!-- Central illustration based on chart type -->
      <div class="mb-6">
        <component :is="illustrationComponent" class="mx-auto"/>
      </div>

      <!-- Step instructions -->
      <div class="space-y-3">
        <div
            v-for="(step, index) in steps"
            :key="index"
            class="flex items-start gap-3 text-left bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div
              class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
              :class="stepColors[index % stepColors.length]"
          >
            {{ index + 1 }}
          </div>
          <div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              <template v-if="step.isOptional">
                <span class="text-gray-400 italic">Optionally, </span>
              </template>
              Drop <span class="font-semibold text-primary-600 dark:text-primary-400">{{ step.fieldType }}</span>
              {{ step.action }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              → {{ step.zone }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Helper text -->
    <p class="mt-6 text-sm text-gray-500 dark:text-gray-400 max-w-md">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {computed, defineAsyncComponent} from 'vue'

// Lazy-load SVG illustrations
const TableIllustration = defineAsyncComponent(() => import('./illustrations/TableIllustration.vue'))
const KpiIllustration = defineAsyncComponent(() => import('./illustrations/KpiIllustration.vue'))
const BarLineIllustration = defineAsyncComponent(() => import('./illustrations/BarLineIllustration.vue'))
const PieIllustration = defineAsyncComponent(() => import('./illustrations/PieIllustration.vue'))
const GaugeIllustration = defineAsyncComponent(() => import('./illustrations/GaugeIllustration.vue'))
const FunnelIllustration = defineAsyncComponent(() => import('./illustrations/FunnelIllustration.vue'))
const ScatterIllustration = defineAsyncComponent(() => import('./illustrations/ScatterIllustration.vue'))
const TreemapIllustration = defineAsyncComponent(() => import('./illustrations/TreemapIllustration.vue'))
const SankeyIllustration = defineAsyncComponent(() => import('./illustrations/SankeyIllustration.vue'))

type ChartType = 'table' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey'

interface Step {
  fieldType: string  // "value field" or "category field"
  action: string     // description of what happens
  zone: string       // target zone name
  isOptional?: boolean
}

const props = defineProps<{
  chartType: ChartType
}>()

const stepColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500'
]

// Chart-specific step configurations
const chartSteps = computed((): Record<ChartType, Step[]> => ({
  table: [
    {fieldType: 'value field', action: 'to add aggregated columns', zone: 'Values'},
    {fieldType: 'category field', action: 'to add text columns', zone: 'Columns'},
    {fieldType: 'category field', action: 'to create a pivot table', zone: 'Rows', isOptional: true}
  ],
  bar: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y (Values)'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X (Categories)'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Series', isOptional: true}
  ],
  line: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y (Values)'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X (Categories)'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Series', isOptional: true}
  ],
  area: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y (Values)'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X (Categories)'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Series', isOptional: true}
  ],
  pie: [
    {fieldType: 'value field', action: 'to define slice sizes', zone: 'Values'},
    {fieldType: 'category field', action: 'to divide into slices', zone: 'Categories'}
  ],
  donut: [
    {fieldType: 'value field', action: 'to define segment sizes', zone: 'Values'},
    {fieldType: 'category field', action: 'to divide into segments', zone: 'Categories'}
  ],
  funnel: [
    {fieldType: 'value field', action: 'to define stage values', zone: 'Values'},
    {fieldType: 'category field', action: 'to define funnel stages', zone: 'Stages'}
  ],
  gauge: [
    {fieldType: 'value field', action: 'to show the measure', zone: 'Value'},
    {fieldType: 'value field', action: 'to set a target value', zone: 'Target', isOptional: true}
  ],
  map: [
    {fieldType: 'category field', action: 'to define regions', zone: 'Regions'},
    {fieldType: 'value field', action: 'to color regions by value', zone: 'Values'}
  ],
  scatter: [
    {fieldType: 'value field', action: 'to define X-axis values', zone: 'X Values'},
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y Values'}
  ],
  treemap: [
    {fieldType: 'category field', action: 'to define hierarchy levels', zone: 'Hierarchy'},
    {fieldType: 'value field', action: 'to define rectangle sizes', zone: 'Size Values'}
  ],
  sankey: [
    {fieldType: 'category field', action: 'to define flow sources', zone: 'Sources'},
    {fieldType: 'category field', action: 'to define flow targets', zone: 'Targets'},
    {fieldType: 'value field', action: 'to define flow widths', zone: 'Values', isOptional: true}
  ]
}))

const steps = computed(() => chartSteps.value[props.chartType] || chartSteps.value.bar)

// Map chart types to illustration components
const illustrationComponent = computed(() => {
  switch (props.chartType) {
    case 'table':
      return TableIllustration
    case 'bar':
    case 'line':
    case 'area':
      return BarLineIllustration
    case 'pie':
    case 'donut':
      return PieIllustration
    case 'funnel':
      return FunnelIllustration
    case 'gauge':
      return GaugeIllustration
    case 'scatter':
      return ScatterIllustration
    case 'treemap':
      return TreemapIllustration
    case 'sankey':
      return SankeyIllustration
    default:
      return BarLineIllustration
  }
})

// Helper text based on chart type
const helperTexts: Record<ChartType, string> = {
  table: 'Drag fields from the left panel to create tables and pivot tables.',
  bar: 'Drag fields to visualize data as vertical bars grouped by categories.',
  line: 'Drag fields to show trends over time or categories.',
  area: 'Drag fields to show cumulative totals over categories.',
  pie: 'Drag fields to show proportions of a whole.',
  donut: 'Drag fields to show proportions with a center hole for labels.',
  funnel: 'Drag fields to visualize conversion or process stages.',
  gauge: 'Drag a value field to show progress toward a goal.',
  map: 'Drag fields to color regions on a map based on values.',
  scatter: 'Drag value fields to plot data points on X-Y axes.',
  treemap: 'Drag fields to show hierarchical data as nested rectangles.',
  sankey: 'Drag fields to show flow relationships between entities.'
}

const helperText = computed(() => helperTexts[props.chartType] || helperTexts.bar)
</script>

<style scoped>
/* Animation for the guide appearing */
.flex {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
