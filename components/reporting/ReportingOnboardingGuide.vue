<template>
  <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
    <!-- Chart-specific visual guide -->
    <div class="relative w-full max-w-lg">
      <!-- Central illustration based on chart type -->
      <div class="mb-6">
        <component :is="illustrationComponent" class="mx-auto illustration-scaled"/>
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
import {getHelperText, getOnboardingSteps} from '~/lib/charts'

// Lazy-load SVG illustrations
const TableIllustration = defineAsyncComponent(() => import('./illustrations/TableIllustration.vue'))
const KpiIllustration = defineAsyncComponent(() => import('./illustrations/KpiIllustration.vue'))
const BarLineIllustration = defineAsyncComponent(() => import('./illustrations/BarLineIllustration.vue'))
const BarIllustration = defineAsyncComponent(() => import('./illustrations/BarIllustration.vue'))
const LineIllustration = defineAsyncComponent(() => import('./illustrations/LineIllustration.vue'))
const AreaIllustration = defineAsyncComponent(() => import('./illustrations/AreaIllustration.vue'))
const StackedIllustration = defineAsyncComponent(() => import('./illustrations/StackedIllustration.vue'))
const WaterfallIllustration = defineAsyncComponent(() => import('./illustrations/WaterfallIllustration.vue'))
const PieIllustration = defineAsyncComponent(() => import('./illustrations/PieIllustration.vue'))
const DonutIllustration = defineAsyncComponent(() => import('./illustrations/DonutIllustration.vue'))
const GaugeIllustration = defineAsyncComponent(() => import('./illustrations/GaugeIllustration.vue'))
const FunnelIllustration = defineAsyncComponent(() => import('./illustrations/FunnelIllustration.vue'))
const ScatterIllustration = defineAsyncComponent(() => import('./illustrations/ScatterIllustration.vue'))
const BubbleIllustration = defineAsyncComponent(() => import('./illustrations/BubbleIllustration.vue'))
const BoxplotIllustration = defineAsyncComponent(() => import('./illustrations/BoxplotIllustration.vue'))
const RadarIllustration = defineAsyncComponent(() => import('./illustrations/RadarIllustration.vue'))
const WordcloudIllustration = defineAsyncComponent(() => import('./illustrations/WordcloudIllustration.vue'))
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

// Chart steps now come from the polymorphic chart registry
const steps = computed(() => getOnboardingSteps(props.chartType))
const helperText = computed(() => getHelperText(props.chartType))

// Map chart types to illustration components
const illustrationComponent = computed(() => {
  switch (props.chartType) {
    case 'table':
      return TableIllustration
    case 'bar':
      return BarIllustration
    case 'column':
      return BarLineIllustration
    case 'line':
      return LineIllustration
    case 'area':
      return AreaIllustration
    case 'stacked':
      return StackedIllustration
    case 'waterfall':
      return WaterfallIllustration
    case 'pie':
      return PieIllustration
    case 'donut':
      return DonutIllustration
    case 'funnel':
      return FunnelIllustration
    case 'gauge':
      return GaugeIllustration
    case 'scatter':
      return ScatterIllustration
    case 'bubble':
      return BubbleIllustration
    case 'boxplot':
      return BoxplotIllustration
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
      return RadarIllustration
    case 'wordcloud':
      return WordcloudIllustration
    default:
      return BarLineIllustration
  }
})


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

.illustration-scaled {
  display: block;
  transform: scale(1.5);
  transform-origin: center center;
  margin: 2rem auto 3.5rem auto;
}
</style>
