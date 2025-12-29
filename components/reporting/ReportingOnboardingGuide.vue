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
const PivotIllustration = defineAsyncComponent(() => import('./illustrations/PivotIllustration.vue'))

type ChartType = 'table' | 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey' | 'kpi' | 'pivot' | 'stacked' | 'radar' | 'boxplot' | 'bubble' | 'waterfall' | 'number' | 'wordcloud'

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

// Chart-specific step configurations (matching original Optiqo app zone names)
const chartSteps = computed((): Record<ChartType, Step[]> => ({
  table: [
    {fieldType: 'value field', action: 'to add aggregated columns', zone: 'Columns (Aggregated)'},
    {fieldType: 'category field', action: 'to add text columns', zone: 'Columns (Text)'},
    {fieldType: 'category field', action: 'to create a pivot table', zone: 'Cross Tab Dimension', isOptional: true}
  ],
  bar: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Break Down By', isOptional: true}
  ],
  column: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Break Down By', isOptional: true}
  ],
  stacked: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to create stacks', zone: 'Break Down By'}
  ],
  line: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Break Down By', isOptional: true}
  ],
  area: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down into multiple series', zone: 'Break Down By', isOptional: true}
  ],
  pie: [
    {fieldType: 'value field', action: 'to define slice sizes', zone: 'Measure'},
    {fieldType: 'category field', action: 'to divide into slices', zone: 'Divide By'}
  ],
  donut: [
    {fieldType: 'value field', action: 'to define segment sizes', zone: 'Measure'},
    {fieldType: 'category field', action: 'to divide into segments', zone: 'Divide By'}
  ],
  funnel: [
    {fieldType: 'value field', action: 'to define stage values', zone: 'Measure'},
    {fieldType: 'category field', action: 'to define funnel stages', zone: 'Stages'},
    {fieldType: 'category field', action: 'to break down your funnel', zone: 'Break Down By', isOptional: true}
  ],
  gauge: [
    {fieldType: 'value field', action: 'to show the measure', zone: 'Measure'},
    {fieldType: 'value field', action: 'to set a target value', zone: 'Target Value', isOptional: true}
  ],
  map: [
    {fieldType: 'value field', action: 'to color regions by value', zone: 'Measure'},
    {fieldType: 'category field', action: 'with location information', zone: 'Location'},
    {fieldType: 'category field', action: 'to break down your data', zone: 'Break Down By', isOptional: true}
  ],
  scatter: [
    {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define X-axis values', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down into series', zone: 'Break Down By', isOptional: true}
  ],
  treemap: [
    {fieldType: 'value field', action: 'to define rectangle sizes', zone: 'Measure'},
    {fieldType: 'category field', action: 'to divide into categories', zone: 'Divide By'},
    {fieldType: 'category field', action: 'to add hierarchy levels', zone: 'Break Down By', isOptional: true}
  ],
  sankey: [
    {fieldType: 'category field', action: 'to define flow sources', zone: 'Source'},
    {fieldType: 'category field', action: 'to define flow targets', zone: 'Target'},
    {fieldType: 'value field', action: 'to define flow widths', zone: 'Values', isOptional: true}
  ],
  kpi: [
    {fieldType: 'value field', action: 'to display as a number', zone: 'Measure'},
    {fieldType: 'value field', action: 'to set a target value', zone: 'Target Value', isOptional: true}
  ],
  pivot: [
    {fieldType: 'value field', action: 'to aggregate in cells', zone: 'Values'},
    {fieldType: 'category field', action: 'to define columns', zone: 'Columns'},
    {fieldType: 'category field', action: 'to define rows', zone: 'Rows'}
  ],
  number: [
    {fieldType: 'value field', action: 'to display as a number', zone: 'Measure'},
    {fieldType: 'value field', action: 'to set a target value', zone: 'Target Value', isOptional: true}
  ],
  radar: [
    {fieldType: 'value field', action: 'to define dimension values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define dimensions', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to compare multiple series', zone: 'Break Down By', isOptional: true}
  ],
  boxplot: [
    {fieldType: 'value field', action: 'to calculate statistics', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to group data', zone: 'X-Axis'},
    {fieldType: 'category field', action: 'to break down by category', zone: 'Break Down By', isOptional: true}
  ],
  bubble: [
    {fieldType: 'value field', action: 'to define bubble sizes', zone: 'Bubble Size'},
    {fieldType: 'category field', action: 'to define categories', zone: 'Category'},
    {fieldType: 'category field', action: 'to break down into series', zone: 'Break Down By', isOptional: true}
  ],
  waterfall: [
    {fieldType: 'value field', action: 'to define values', zone: 'Y-Axis'},
    {fieldType: 'category field', action: 'to define categories', zone: 'X-Axis'}
  ],
  wordcloud: [
    {fieldType: 'value field', action: 'to set word sizes', zone: 'Word Count'},
    {fieldType: 'category field', action: 'to define words', zone: 'Word List'}
  ]
}))

const steps = computed(() => chartSteps.value[props.chartType] || chartSteps.value.bar)

// Map chart types to illustration components
const illustrationComponent = computed(() => {
  switch (props.chartType) {
    case 'table':
      return TableIllustration
    case 'bar':
    case 'column':
    case 'line':
    case 'area':
    case 'stacked':
    case 'waterfall':
      return BarLineIllustration
    case 'pie':
    case 'donut':
      return PieIllustration
    case 'funnel':
      return FunnelIllustration
    case 'gauge':
      return GaugeIllustration
    case 'scatter':
    case 'bubble':
    case 'boxplot':
      return ScatterIllustration
    case 'treemap':
      return TreemapIllustration
    case 'sankey':
      return SankeyIllustration
    case 'kpi':
    case 'number':
      return KpiIllustration
    case 'pivot':
      return PivotIllustration
    case 'radar':
      return GaugeIllustration  // Use gauge for radar as closest match
    case 'wordcloud':
      return PieIllustration  // Use pie for wordcloud as visual approximation
    default:
      return BarLineIllustration
  }
})

// Helper text based on chart type
const helperTexts: Record<ChartType, string> = {
  table: 'Drag fields from the left panel to create tables and pivot tables.',
  bar: 'Drag fields to visualize data as horizontal bars.',
  column: 'Drag fields to visualize data as vertical columns.',
  stacked: 'Drag fields to create stacked bar or column charts.',
  line: 'Drag fields to show trends over time or categories.',
  area: 'Drag fields to show cumulative totals over categories.',
  pie: 'Drag fields to show proportions of a whole.',
  donut: 'Drag fields to show proportions with a center hole for labels.',
  funnel: 'Drag fields to visualize conversion or process stages.',
  gauge: 'Drag a value field to show progress toward a goal.',
  map: 'Drag fields to color regions on a map based on values.',
  scatter: 'Drag value fields to plot data points on X-Y axes.',
  treemap: 'Drag fields to show hierarchical data as nested rectangles.',
  sankey: 'Drag fields to show flow relationships between entities.',
  kpi: 'Drag a single value field to display as a prominent number.',
  pivot: 'Drag fields to create a cross-tabulation heatmap table.',
  number: 'Drag a single value field to display as a big number.',
  radar: 'Drag fields to compare multiple dimensions on a spider web.',
  boxplot: 'Drag fields to show statistical distribution of values.',
  bubble: 'Drag fields to plot bubbles with X, Y, and size values.',
  waterfall: 'Drag fields to show cumulative increases and decreases.',
  wordcloud: 'Drag category and value fields to create a word cloud.'
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
