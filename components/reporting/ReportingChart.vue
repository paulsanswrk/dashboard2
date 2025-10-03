<template>
  <div>
    <div v-if="chartType === 'kpi'" class="p-6 border rounded bg-white text-center">
      <div class="text-sm text-gray-500 mb-1">{{ kpiLabel }}</div>
      <div class="text-4xl font-semibold">{{ kpiValue }}</div>
    </div>
    <canvas v-else ref="canvasRef" class="w-full h-80"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import type { Ref } from 'vue'

// Load Chart.js from CDN on client to avoid bundler resolution issues if dependency isn't installed
let ChartLib: any = null
async function ensureChartLib() {
  if (!process.client) return
  if (ChartLib) return
  if ((window as any).Chart) {
    ChartLib = (window as any).Chart
    return
  }
  await new Promise<void>((resolve, reject) => {
    const id = 'chartjs-cdn-script'
    if (document.getElementById(id)) {
      // script present but maybe not loaded yet
      const check = () => {
        if ((window as any).Chart) {
          ChartLib = (window as any).Chart
          resolve()
        } else {
          setTimeout(check, 50)
        }
      }
      check()
      return
    }
    const s = document.createElement('script')
    s.id = id
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
    s.async = true
    s.onload = () => {
      ChartLib = (window as any).Chart
      resolve()
    }
    s.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(s)
  })
}

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

const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)
let chart: any = null

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
  if (chart) {
    try { chart.destroy() } catch {}
    chart = null
  }
}

function renderChart() {
  if (!process.client) return
  if (!canvasRef.value) return
  destroyChart()
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const type = props.chartType === 'donut' ? 'doughnut' : props.chartType
  const cats = categories.value
  const series = seriesData.value

  if (type === 'pie' || type === 'doughnut') {
    const s = series[0] || { name: 'Value', data: [] }
    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors).slice(0, cats.length)
    chart = new ChartLib(ctx, {
      type,
      data: {
        labels: cats,
        datasets: [{ label: props.appearance?.legendTitle || s.name, data: s.data, backgroundColor: palette }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: { display: !!props.appearance?.chartTitle, text: props.appearance?.chartTitle }
        }
      }
    })
    return
  }

  const datasets = series.map((s, idx) => {
    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)
    const color = palette[idx % palette.length]
    return {
    label: s.name,
    data: s.data,
    borderWidth: 2,
      fill: false,
      backgroundColor: color,
      borderColor: color
    }
  })

  chart = new ChartLib(ctx, {
    type: type === 'line' ? 'line' : 'bar',
    data: { labels: cats, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: props.appearance?.legendPosition || 'top' },
        title: { display: !!props.appearance?.chartTitle, text: props.appearance?.chartTitle }
      },
      scales: {
        x: { title: { display: !!props.appearance?.xAxisLabel, text: props.appearance?.xAxisLabel }, stacked: !!props.appearance?.stacked },
        y: { beginAtZero: true, title: { display: !!props.appearance?.yAxisLabel, text: props.appearance?.yAxisLabel }, stacked: !!props.appearance?.stacked }
      }
    }
  })
}

onMounted(async () => {
  if (props.chartType === 'kpi') return
  await ensureChartLib()
  renderChart()
})

watch(() => [props.chartType, props.columns, props.rows, props.xDimensions, props.breakdowns, props.yMetrics, props.appearance], async () => {
  if (props.chartType === 'kpi') { destroyChart(); return }
  await ensureChartLib()
  renderChart()
}, { deep: true })

onBeforeUnmount(() => {
  destroyChart()
})
</script>

<style scoped>
</style>


