<template>
  <div>
    <div v-if="chartType === 'kpi'" class="p-6 border rounded bg-white text-center">
      <div class="text-sm text-gray-500 mb-1">{{ kpiLabel }}</div>
      <div class="text-4xl font-semibold">{{ kpiValue }}</div>
    </div>
    <div v-else ref="chartRef" class="w-full h-80"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'

// Load ECharts - it's now a proper dependency instead of CDN loading
let chartInstance: echarts.ECharts | null = null

type Column = { key: string; label: string }
type ReportField = { fieldId: string; name?: string; label?: string }

const props = defineProps<{
  chartType: 'table' | 'bar' | 'line' | 'pie' | 'donut' | 'kpi'
  columns: Column[]
  rows: Array<Record<string, unknown>>
  xDimensions: ReportField[]
  breakdowns: ReportField[]
  yMetrics: ReportField[]
  appearance?: {
    chartTitle?: string
    xAxisLabel?: string
    yAxisLabel?: string
    legendTitle?: string
    numberFormat?: { decimalPlaces?: number; thousandsSeparator?: boolean }
    dateFormat?: string
    palette?: string[]
    stacked?: boolean
    legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  }
}>()

const emit = defineEmits<{
  (e: 'drill', payload: { xValue: string | number; seriesName?: string; datasetIndex: number; index: number }): void
}>()

const chartRef: Ref<HTMLDivElement | null> = ref(null)

const defaultColors = [
  '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
  '#3B3EAC', '#0099C6', '#DD4477', '#66AA00', '#B82E2E',
  '#316395', '#994499', '#22AA99', '#AAAA11', '#6633CC',
  '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC'
]

const metricAliases = computed(() => {
  // Server aliases: agg_fieldId (e.g., sum_value)
  const aggPrefixes = ['sum_', 'count_', 'avg_', 'min_', 'max_']
  const keys = props.columns.map(c => c.key)
  return keys.filter(k => aggPrefixes.some(p => k.startsWith(p)))
})

const categories = computed(() => {
  const xKey = props.xDimensions?.[0]?.fieldId
  if (!xKey) return []
  return props.rows.map(r => String(r[xKey] ?? ''))
})

const seriesData = computed(() => {
  const xKey = props.xDimensions?.[0]?.fieldId
  const bKey = props.breakdowns?.[0]?.fieldId
  const aliases = metricAliases.value
  if (!aliases.length) return []

  // If breakdown exists, use first metric and split series by breakdown values
  if (bKey) {
    const firstMetric = aliases[0]
    const grouped = new Map<string, number[]>()
    const cats = categories.value
    for (let i = 0; i < props.rows.length; i++) {
      const row = props.rows[i]
      const cat = xKey ? String(row[xKey] ?? '') : String(i)
      const bVal = String(row[bKey] ?? '')
      const val = Number(row[firstMetric] ?? 0)
      if (!grouped.has(bVal)) grouped.set(bVal, Array(cats.length).fill(0))
      const idx = cats.indexOf(cat)
      if (idx >= 0) grouped.get(bVal)![idx] = val
    }
    return Array.from(grouped.entries()).map(([name, data]) => ({ name, data }))
  }

  // No breakdown: build one series per metric
  const cats = categories.value
  return aliases.map(alias => ({
    name: props.columns.find(c => c.key === alias)?.label || alias,
    data: cats.map((_, i) => Number(props.rows[i]?.[alias] ?? 0))
  }))
})

const kpiValue = computed(() => {
  const alias = metricAliases.value[0]
  if (!alias) return ''
  const row0 = props.rows?.[0]
  return row0 ? (row0[alias] as any) : ''
})

const kpiLabel = computed(() => {
  const alias = metricAliases.value[0]
  const col = props.columns.find(c => c.key === alias)
  return col?.label || 'Value'
})

function destroyChart() {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

function renderChart() {
  if (typeof window === 'undefined') return
  if (!chartRef.value) return
  destroyChart()

  const type = props.chartType === 'donut' ? 'doughnut' : props.chartType
  const cats = categories.value
  const series = seriesData.value

  // Initialize ECharts instance
  chartInstance = echarts.init(chartRef.value)

  if (type === 'pie' || type === 'doughnut') {
    const s = series[0] || { name: 'Value', data: [] }
    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors).slice(0, cats.length)

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const value = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          return `${params.name}: ${value}`
        }
      },
      legend: {
        show: true,
        orient: 'horizontal',
        bottom: 0
      },
      series: [{
        name: props.appearance?.legendTitle || s.name,
        type: 'pie',
        radius: type === 'doughnut' ? ['40%', '70%'] : '60%',
        data: cats.map((cat, idx) => ({
          name: cat,
          value: s.data[idx] || 0,
          itemStyle: { color: palette[idx % palette.length] }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'pie') {
        const dataIndex = params.dataIndex
        const xValue = cats[dataIndex]
        emit('drill', { xValue, datasetIndex: 0, index: dataIndex })
      }
    })

    return
  }

  const palette = (props.appearance?.palette && props.appearance.palette.length
    ? props.appearance.palette
    : defaultColors)

  // Create series data for ECharts
  const seriesConfig = series.map((s, idx) => {
    const color = palette[idx % palette.length]
    const baseConfig = {
      name: s.name,
      data: s.data,
      type: type === 'line' ? 'line' : 'bar',
      itemStyle: { color },
      emphasis: {
        focus: 'series'
      }
    }

    if (type === 'line') {
      return {
        ...baseConfig,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 }
      }
    } else {
      return {
        ...baseConfig,
        barWidth: '60%'
      }
    }
  })

  const option = {
    title: {
      text: props.appearance?.chartTitle || '',
      show: !!props.appearance?.chartTitle
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        let result = ''
        params.forEach((param: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const value = typeof param.value === 'number' ? formatNumber(param.value, dp, ts) : param.value
          result += `${param.seriesName}: ${value}<br/>`
        })
        return result
      }
    },
    legend: {
      show: true,
      data: series.map(s => s.name),
      top: props.appearance?.legendPosition === 'bottom' ? 'bottom' : 'top'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: props.appearance?.legendPosition === 'bottom' ? '15%' : '10%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: type === 'bar',
      data: cats,
      name: props.appearance?.xAxisLabel || '',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: props.appearance?.yAxisLabel || '',
      nameLocation: 'middle',
      nameGap: 40,
      min: 0
    },
    series: seriesConfig
  }

  // Handle stacking if needed
  if (props.appearance?.stacked) {
    option.xAxis.boundaryGap = false
    seriesConfig.forEach((series: any, idx: number) => {
      if (idx > 0) {
        series.stack = 'total'
      }
    })
  }

  chartInstance.setOption(option)

  // Add click event handler
  chartInstance.on('click', (params: any) => {
    if (params.componentType === 'series') {
      const xValue = cats[params.dataIndex]
      const seriesName = params.seriesName
      const datasetIndex = series.findIndex(s => s.name === seriesName)
      emit('drill', { xValue, seriesName, datasetIndex, index: params.dataIndex })
    }
  })
}

onMounted(() => {
  if (props.chartType === 'kpi') return
  renderChart()
})

watch(() => [props.chartType, props.columns, props.rows, props.xDimensions, props.breakdowns, props.yMetrics, props.appearance], () => {
  if (props.chartType === 'kpi') { destroyChart(); return }
  renderChart()
}, { deep: true })

onBeforeUnmount(() => {
  destroyChart()
})

function formatNumber(value: number, decimalPlaces: number, thousandsSeparator: boolean) {
  const parts = value.toFixed(Math.max(0, decimalPlaces)).split('.')
  if (thousandsSeparator) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  return parts.join('.')
}
</script>

<style scoped>
</style>


