<template>
  <div>
    <div ref="chartRef" class="w-full h-full min-h-96"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * ReportingChart.vue - Unified chart rendering component
 * 
 * Uses polymorphic chart renderers from lib/charts/renderers to handle
 * different chart types. Each chart type has its own renderer class that
 * implements the buildOption() method to generate ECharts configuration.
 */
import type {Ref} from 'vue'
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import * as echarts from 'echarts'
import {getRenderer} from '~/lib/charts/renderers'
import type {ChartRenderContext, ChartEmitFunction} from '~/lib/charts/renderers/types'

// Word cloud extension will be loaded dynamically on client-side
let wordcloudLoaded = false

// ECharts instance and resize observer
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

type Column = { key: string; label: string }
type ReportField = { fieldId: string; name?: string; label?: string }

const props = defineProps<{
  chartType: 'table' | 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey' | 'kpi' | 'pivot' | 'stacked' | 'radar' | 'boxplot' | 'bubble' | 'waterfall' | 'number' | 'wordcloud'
  columns: Column[]
  rows: Array<Record<string, unknown>>
  xDimensions: ReportField[]
  breakdowns: ReportField[]
  yMetrics: ReportField[]
  sizeValue?: ReportField
  appearance?: {
    // General
    fontFamily?: string
    chartTitle?: string
    titlePaddingBottom?: number

    // Labels
    showLabels?: boolean
    showLabelsPercent?: boolean
    labelsInside?: boolean
    labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }

    // Legend
    showLegend?: boolean
    legendPosition?: 'top' | 'bottom' | 'left' | 'right'
    legendTitle?: string
    legendFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }

    // Background
    backgroundColor?: string
    backgroundTransparent?: boolean

    // X Axis
    xAxis?: {
      showTitle?: boolean
      title?: string
      titleFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      showLabels?: boolean
      labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      allowTextWrap?: boolean
      showLine?: boolean
      lineColor?: string
      lineWidth?: number
    }
    xAxisLabel?: string  // Legacy

    // Y Axis
    yAxis?: {
      showTitle?: boolean
      title?: string
      titleFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      showLabels?: boolean
      labelFont?: { color?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean }
      numberFormat?: {
        type?: 'auto' | 'number' | 'percentage' | 'currency' | 'custom'
        prefix?: string
        suffix?: string
        separator?: 'comma' | 'space' | 'none'
        decimalPlaces?: number | 'auto'
      }
      scale?: {
        min?: number | null
        max?: number | null
        interval?: number | null
      }
    }
    yAxisLabel?: string  // Legacy

    // Pie/Donut specific
    showAsDonut?: boolean
    pieInnerRadius?: number
    pieOuterRadius?: number
    pieLabelPosition?: string
    pieShowLabels?: boolean

    // Existing
    numberFormat?: { decimalPlaces?: number; thousandsSeparator?: boolean }
    dateFormat?: string
    palette?: string[]
    stacked?: boolean
  }
}>()

const emit = defineEmits<{
  (e: 'drill', payload: { xValue: string | number; seriesName?: string; datasetIndex: number; index: number }): void
}>()

const chartRef: Ref<HTMLDivElement | null> = ref(null)

// Theme detection for chart text colors
const {isDark} = useTheme()

/**
 * Destroy the current chart instance and resize observer
 */
function destroyChart() {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

/**
 * Render the chart using the appropriate renderer for the chart type
 */
function renderChart() {
  if (typeof window === 'undefined') return
  if (!chartRef.value) return
  destroyChart()

  // Ensure the element has dimensions before initializing
  const rect = chartRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    nextTick(() => {
      renderChart()
    })
    return
  }

  // Get the renderer for this chart type
  const renderer = getRenderer(props.chartType)
  if (!renderer) {
    console.warn(`No renderer found for chart type: ${props.chartType}`)
    return
  }

  // Initialize ECharts instance
  chartInstance = echarts.init(chartRef.value)

  // Set up resize observer for responsive behavior
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (chartInstance) {
        chartInstance.resize()
      }
    })
    resizeObserver.observe(chartRef.value)
  }

  // Build render context from props
  const context: ChartRenderContext = {
    chartType: props.chartType,
    columns: props.columns,
    rows: props.rows,
    xDimensions: props.xDimensions,
    breakdowns: props.breakdowns,
    yMetrics: props.yMetrics,
    sizeValue: props.sizeValue,
    appearance: props.appearance,
    isDark: isDark.value
  }

  // Get chart option from renderer
  const {option, clickHandler} = renderer.buildOption(context)

  // Apply the option to the chart
  chartInstance.setOption(option)

  // Set up click handler if provided
  if (clickHandler) {
    const emitFn: ChartEmitFunction = (event, payload) => {
      emit(event, payload)
    }
    chartInstance.on('click', (params: any) => clickHandler(params, emitFn, context))
  }
}

/**
 * Capture a snapshot of the current chart as a PNG data URL
 */
async function captureSnapshot() {
  if (typeof window === 'undefined') return null
  if (!chartRef.value) return null

  // Ensure chart is ready before capturing
  if (!chartInstance) {
    renderChart()
    await nextTick()
  }

  if (!chartInstance) return null

  const width = Math.round(chartInstance.getWidth())
  const height = Math.round(chartInstance.getHeight())
  const dataUrl = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff'
  })

  return {dataUrl, width, height}
}

onMounted(async () => {
  // Load echarts-wordcloud dynamically on client-side only
  if (!wordcloudLoaded) {
    try {
      await import('echarts-wordcloud')
      wordcloudLoaded = true
    } catch (e) {
      console.warn('Failed to load echarts-wordcloud:', e)
    }
  }
  renderChart()
})

watch(() => [props.chartType, props.columns, props.rows, props.xDimensions, props.breakdowns, props.yMetrics, props.sizeValue, props.appearance, isDark.value], () => {
  renderChart()
}, { deep: true })

onBeforeUnmount(() => {
  destroyChart()
})

defineExpose({
  captureSnapshot
})
</script>

<style scoped>
</style>
