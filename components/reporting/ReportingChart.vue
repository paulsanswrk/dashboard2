<template>
  <div>
    <div ref="chartRef" class="w-full h-full min-h-96"></div>
  </div>
</template>

<script setup lang="ts">
import type {Ref} from 'vue'
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import * as echarts from 'echarts'

// Word cloud extension will be loaded dynamically on client-side
let wordcloudLoaded = false

// Load ECharts - it's now a proper dependency instead of CDN loading
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
  appearance?: {
    // General
    fontFamily?: string
    chartTitle?: string

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
const labelColor = computed(() => isDark.value ? '#ffffff' : '#333333')
const axisLabelColor = computed(() => isDark.value ? '#cccccc' : '#666666')

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

  // If we have traditional dimensions, use them
  if (xKey) {
    return props.rows.map(r => String(r[xKey] ?? ''))
  }

  // Fallback for SQL-based charts: use first column as categories
  if (props.rows.length > 0 && props.columns.length > 0) {
    const xCol = props.columns[0]?.key
    return props.rows.map(r => String(r[xCol] ?? ''))
  }

  return []
})

const seriesData = computed(() => {
  const xKey = props.xDimensions?.[0]?.fieldId
  const bKey = props.breakdowns?.[0]?.fieldId
  const aliases = metricAliases.value

  // If we have traditional metric aliases and dimensions, use the original logic
  if (aliases.length && (xKey || props.xDimensions?.length)) {
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
  }

  // Fallback for SQL-based charts without traditional dimensions/metrics setup
  if (props.rows.length === 0) return []

  // For pie/donut charts, assume first column is names, second is values
  if (props.chartType === 'pie' || props.chartType === 'donut') {
    const nameCol = props.columns[0]?.key
    const valueCol = props.columns[1]?.key || props.columns[0]?.key
    if (!nameCol || !valueCol) return []

    return [{
      name: props.columns.find(c => c.key === valueCol)?.label || valueCol,
      data: props.rows.map(row => ({
        name: String(row[nameCol] ?? ''),
        value: Number(row[valueCol] ?? 0)
      }))
    }]
  }

  // For other chart types, assume first column is X, remaining columns are Y series
  const xCol = props.columns[0]?.key
  const yCols = props.columns.slice(1).map(c => c.key)
  if (!xCol || yCols.length === 0) return []

  return yCols.map(yCol => ({
    name: props.columns.find(c => c.key === yCol)?.label || yCol,
    data: props.rows.map((row, i) => Number(row[yCol] ?? 0))
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
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

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

  const type = props.chartType === 'donut' ? 'doughnut' : props.chartType
  const cats = categories.value
  const series = seriesData.value

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

  if (type === 'pie' || type === 'doughnut') {
    const s = series[0] || { name: 'Value', data: [] }
    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors).slice(0, cats.length)

    const innerRadius = props.appearance?.pieInnerRadius ?? (type === 'doughnut' ? 45 : 0)
    const outerRadius = props.appearance?.pieOuterRadius ?? (type === 'doughnut' ? 75 : 70)
    const pieRadius = type === 'doughnut'
        ? [`${innerRadius}%`, `${outerRadius}%`]
        : `${outerRadius}%`
    const labelPosition = props.appearance?.pieLabelPosition || 'outside'
    const showLabels = props.appearance?.pieShowLabels ?? true

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        padding: [0, 0, 20, 0]
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        renderMode: 'html',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const value = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          return `<div style="padding: 5px 10px;">${params.name}: ${value}</div>`
        }
      },
      legend: {
        show: true,
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        padding: [5, 0, 5, 0]
      },
      grid: {
        bottom: '5%'
      },
      series: [{
        name: props.appearance?.legendTitle || s.name,
        type: 'pie',
        radius: pieRadius,
        center: ['50%', '45%'],
        data: Array.isArray(s.data) && s.data.length > 0 && typeof s.data[0] === 'object' && s.data[0].name
          ? s.data.map((item: any, idx: number) => ({
              name: item.name,
              value: item.value,
              itemStyle: { color: palette[idx % palette.length] }
            }))
          : cats.map((cat, idx) => ({
              name: cat,
              value: s.data[idx] || 0,
              itemStyle: { color: palette[idx % palette.length] }
            })),
        label: {
          show: showLabels,
          position: labelPosition,
          color: labelColor.value,
          textBorderColor: 'transparent',
          textBorderWidth: 0,
          formatter: (params: any) => {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            const value = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
            return labelPosition === 'inside' ? `${params.name}\n${value}` : `${params.name}: ${value}`
          }
        },
        labelLine: {
          show: showLabels && labelPosition === 'outside'
        },
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

  if (type === 'gauge') {
    const value = Number(kpiValue.value) || 0
    const max = Math.max(value, 100) // Default max of 100, or value if larger

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      tooltip: {
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof value === 'number' ? formatNumber(value, dp, ts) : value
          return `${kpiLabel.value}: ${formattedValue}`
        }
      },
      series: [{
        name: kpiLabel.value,
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: max,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#464646',
          fontSize: 20,
          distance: -60,
          formatter: function (value: number) {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            return typeof value === 'number' ? formatNumber(value, dp, ts) : value
          }
        },
        title: {
          offsetCenter: [0, '50%'],
          fontSize: 16
        },
        detail: {
          fontSize: 30,
          offsetCenter: [0, '0%'],
          valueAnimation: true,
          formatter: function (value: number) {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            return typeof value === 'number' ? formatNumber(value, dp, ts) : value
          },
          color: 'auto'
        },
        data: [{
          value: value,
          name: kpiLabel.value
        }]
      }]
    }

    chartInstance.setOption(option)
    return
  }

  if (type === 'scatter') {
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = props.yMetrics?.[0]?.fieldId

    if (!xKey || !yKey) {
      // Not enough data for scatter plot
      return
    }

    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)

    // Create scatter data points
    const scatterData = props.rows.map((row, index) => {
      const x = Number(row[xKey]) || 0
      const y = Number(row[yKey]) || 0
      return [x, y]
    })

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const xFormatted = typeof params.data[0] === 'number' ? formatNumber(params.data[0], dp, ts) : params.data[0]
          const yFormatted = typeof params.data[1] === 'number' ? formatNumber(params.data[1], dp, ts) : params.data[1]
          return `X: ${xFormatted}<br/>Y: ${yFormatted}`
        }
      },
      legend: {
        show: true,
        data: ['Data Points']
      },
      xAxis: {
        type: 'value',
        name: props.appearance?.xAxisLabel || props.xDimensions?.[0]?.label || 'X Values',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        name: props.appearance?.yAxisLabel || props.yMetrics?.[0]?.label || 'Y Values',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [{
        name: 'Data Points',
        type: 'scatter',
        data: scatterData,
        symbolSize: 10,
        itemStyle: {
          color: palette[0]
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 2,
            borderColor: '#333'
          }
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler for scatter points
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'scatter') {
        const dataIndex = params.dataIndex
        const point = scatterData[dataIndex]
        const xValue = point[0]
        const yValue = point[1]
        emit('drill', { xValue, seriesName: 'scatter', datasetIndex: 0, index: dataIndex })
      }
    })

    return
  }

  if (type === 'funnel') {
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = props.yMetrics?.[0]?.fieldId

    // Fallback for SQL-based charts
    const nameCol = xKey || (props.columns.length > 0 ? props.columns[0].key : null)
    const valueCol = yKey || (props.columns.length > 1 ? props.columns[1].key : props.columns[0]?.key)

    if (!nameCol || !valueCol || !props.rows.length) {
      // Not enough data for funnel chart
      return
    }

    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)

    // Create funnel data - sort by value descending for proper funnel shape
    const funnelData = props.rows
      .map((row, index) => {
        // Ensure row is a plain object and has the expected properties
        const rowData = typeof row === 'object' && row !== null ? row : {}
        const nameValue = rowData[nameCol]
        const valueValue = rowData[valueCol]

        return {
          name: nameValue != null ? String(nameValue) : `Stage ${index + 1}`,
          value: valueValue != null ? Number(valueValue) : 0
        }
      })
      .sort((a, b) => b.value - a.value) // Sort descending for funnel shape

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        renderMode: 'html',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          return `<div style="padding: 5px 10px;">${params.name}: ${formattedValue}</div>`
        }
      },
      legend: {
        show: true,
        data: funnelData.map(item => item.name),
        bottom: '15%',
        left: 'center',
        orient: 'horizontal',
        padding: [5, 0, 5, 0]
      },
      series: [{
        name: 'Funnel',
        type: 'funnel',
        type: 'funnel',
        left: '5%',
        top: 60 + (props.appearance?.titlePaddingBottom ?? 0),
        bottom: '30%',
        width: '90%',
        min: 0,
        max: funnelData.length > 0 ? funnelData[0].value : 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        data: funnelData,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
            return `${params.name}: ${formattedValue}`
          }
        },
        emphasis: {
          label: {
            fontSize: 20
          }
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler for funnel segments
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'funnel') {
        const dataIndex = params.dataIndex
        const data = funnelData[dataIndex]
        emit('drill', { xValue: data.name, seriesName: 'funnel', datasetIndex: 0, index: dataIndex })
      }
    })

    return
  }

  if (type === 'map') {
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = props.yMetrics?.[0]?.fieldId

    if (!xKey || !yKey) {
      // Not enough data for map chart
      return
    }

    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)

    // Create map data - map country/region names to values
    const mapData = props.rows.map((row) => {
      const region = String(row[xKey] || '').toLowerCase()
      const value = Number(row[yKey]) || 0
      return { name: region, value: value }
    })

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, 20, 0]
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          return `${params.name}: ${formattedValue}`
        }
      },
      visualMap: {
        min: 0,
        max: Math.max(...mapData.map(item => item.value)),
        left: 'left',
        top: 'bottom',
        text: ['High', 'Low'],
        calculable: true,
        inRange: {
          color: palette.slice(0, 5) // Use first 5 colors from palette
        }
      },
      series: [{
        name: 'Data',
        type: 'map',
        map: 'world', // Use world map - requires echarts/map/js/world.js to be loaded
        roam: true,
        emphasis: {
          label: {
            show: true
          }
        },
        data: mapData
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler for map regions
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'map') {
        const regionName = params.name
        const dataIndex = mapData.findIndex(item => item.name === regionName.toLowerCase())
        if (dataIndex >= 0) {
          const data = mapData[dataIndex]
          emit('drill', { xValue: data.name, seriesName: 'map', datasetIndex: 0, index: dataIndex })
        }
      }
    })

    return
  }

  if (type === 'treemap') {
    const xKey = props.xDimensions?.[0]?.fieldId
    const breakdownKey = props.breakdowns?.[0]?.fieldId

    // Fallback for SQL-based charts
    const categoryCol = xKey || (props.columns.length > 0 ? props.columns[0].key : null)
    const sizeCol = breakdownKey || (props.columns.length > 1 ? props.columns[1].key : null)

    if (!categoryCol) {
      // Need at least category data for treemap
      return
    }

    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)

    // Create hierarchical treemap data
    const treemapData: any[] = []
    const processedItems = new Set<string>()

    props.rows.forEach((row) => {
      const rowData = typeof row === 'object' && row !== null ? row : {}
      const category = String(rowData[categoryCol] || 'Unknown')
      const size = sizeCol ? Number(rowData[sizeCol]) || 0 : 1

      if (!processedItems.has(category)) {
        treemapData.push({
          name: category,
          value: size,
          itemStyle: {
            color: palette[treemapData.length % palette.length]
          }
        })
        processedItems.add(category)
      } else {
        // Update existing item value
        const existing = treemapData.find(item => item.name === category)
        if (existing) {
          existing.value += size
        }
      }
    })

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, 20, 0]
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        position: 'top',
        renderMode: 'html',
        appendToBody: true,
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          return `<div style="padding: 5px 10px;">${params.name}: ${formattedValue}</div>`
        }
      },
      series: [{
        name: 'Treemap',
        type: 'treemap',
        data: treemapData,
        roam: true,
        nodeClick: false,
        breadcrumb: {
          show: false
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          gapWidth: 2
        },
        label: {
          show: true,
          formatter: (params: any) => {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
            return `${params.name}\n${formattedValue}`
          }
        },
        emphasis: {
          itemStyle: {
            borderColor: '#333',
            borderWidth: 3
          }
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler for treemap nodes
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'treemap') {
        const nodeName = params.name
        const dataIndex = treemapData.findIndex(item => item.name === nodeName)
        if (dataIndex >= 0) {
          const data = treemapData[dataIndex]
          emit('drill', { xValue: data.name, seriesName: 'treemap', datasetIndex: 0, index: dataIndex })
        }
      }
    })

    return
  }

  if (type === 'sankey') {
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = props.yMetrics?.[0]?.fieldId
    const breakdownKey = props.breakdowns?.[0]?.fieldId

    // Fallback for SQL-based charts
    const sourceCol = xKey || (props.columns.length > 0 ? props.columns[0].key : null)
    const targetCol = yKey || (props.columns.length > 1 ? props.columns[1].key : null)
    const valueCol = breakdownKey || (props.columns.length > 2 ? props.columns[2].key : null)

    if (!sourceCol || !targetCol) {
      // Need both source and target data for Sankey diagram
      return
    }

    const palette = (props.appearance?.palette && props.appearance.palette.length
      ? props.appearance.palette
      : defaultColors)

    // Create nodes and links for Sankey diagram
    const nodes = new Map<string, { name: string }>()
    const links: any[] = []

    props.rows.forEach((row) => {
      const rowData = typeof row === 'object' && row !== null ? row : {}
      const source = String(rowData[sourceCol] || 'Unknown Source')
      const target = String(rowData[targetCol] || 'Unknown Target')
      const value = valueCol ? Number(rowData[valueCol]) || 1 : 1

      // Add nodes
      if (!nodes.has(source)) {
        nodes.set(source, { name: source })
      }
      if (!nodes.has(target)) {
        nodes.set(target, { name: target })
      }

      // Add link
      links.push({
        source: source,
        target: target,
        value: value
      })
    })

    const nodeArray = Array.from(nodes.values())

    const option = {
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, 20, 0]
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        renderMode: 'html',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          if (params.dataType === 'node') {
            return `<div style="padding: 5px 10px;">${params.name}</div>`
          } else {
            return `<div style="padding: 5px 10px;">${params.data.source} → ${params.data.target}: ${formattedValue}</div>`
          }
        }
      },
      series: [{
        name: 'Sankey',
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency'
        },
        data: nodeArray,
        links: links,
        itemStyle: {
          borderWidth: 0,
          borderColor: '#aaa'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.5
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.name,
          fontSize: 12
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click event handler for Sankey nodes/links
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'sankey') {
        if (params.dataType === 'node') {
          // Clicked on a node
          emit('drill', { xValue: params.name, seriesName: 'sankey', datasetIndex: 0, index: 0 })
        } else if (params.dataType === 'edge') {
          // Clicked on a link
          const link = params.data
          emit('drill', { xValue: `${link.source} → ${link.target}`, seriesName: 'sankey', datasetIndex: 0, index: 0 })
        }
      }
    })

    return
  }

  if (type === 'kpi') {
    const value = Number(kpiValue.value) || 0
    const label = kpiLabel.value
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Create a simple KPI display using ECharts graphic elements
    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        top: '5%',
        textStyle: {
          fontFamily: props.appearance?.fontFamily || 'Arial',
          fontSize: 16
        }
      },
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: (() => {
                  const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
                  const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
                  const prefix = props.appearance?.yAxis?.numberFormat?.prefix || ''
                  const suffix = props.appearance?.yAxis?.numberFormat?.suffix || ''
                  return `${prefix}${formatNumber(value, dp, ts)}${suffix}`
                })(),
                fill: palette[0] || '#3366CC',
                font: 'bold 72px Arial',
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            },
            {
              type: 'text',
              top: 50,
              style: {
                text: label,
                fill: '#666',
                font: '18px Arial',
                textAlign: 'center',
                textVerticalAlign: 'top'
              }
            }
          ]
        }
      ]
    }

    chartInstance.setOption(option)
    return
  }

  if (type === 'pivot') {
    // Pivot table - render as a cross-tabulation table using ECharts
    const xKey = props.xDimensions?.[0]?.fieldId
    const breakdownKey = props.breakdowns?.[0]?.fieldId
    const metricAliasesValue = metricAliases.value
    const firstMetric = metricAliasesValue[0]

    if (!firstMetric || props.rows.length === 0) {
      // Show empty state message
      const option = {
        backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
        title: {
          text: 'Pivot Table',
          subtext: 'Add columns, rows, and values to create a pivot table',
          left: 'center',
          top: 'middle',
          textStyle: {
            fontSize: 20
          },
          subtextStyle: {
            fontSize: 14,
            color: '#666'
          }
        }
      }
      chartInstance.setOption(option)
      return
    }

    // Build pivot data structure
    const colValues = new Set<string>()
    const rowValues = new Set<string>()
    const pivotData = new Map<string, Map<string, number>>()

    props.rows.forEach((row) => {
      const colVal = xKey ? String(row[xKey] || 'Total') : 'Total'
      const rowVal = breakdownKey ? String(row[breakdownKey] || 'Total') : 'Total'
      const metricVal = Number(row[firstMetric]) || 0

      colValues.add(colVal)
      rowValues.add(rowVal)

      if (!pivotData.has(rowVal)) {
        pivotData.set(rowVal, new Map())
      }
      const rowMap = pivotData.get(rowVal)!
      rowMap.set(colVal, (rowMap.get(colVal) || 0) + metricVal)
    })

    const colArray = Array.from(colValues)
    const rowArray = Array.from(rowValues)
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Create heatmap-style pivot visualization
    const heatmapData: [number, number, number][] = []
    let maxVal = 0

    rowArray.forEach((rowVal, rowIdx) => {
      const rowMap = pivotData.get(rowVal)
      colArray.forEach((colVal, colIdx) => {
        const value = rowMap?.get(colVal) || 0
        heatmapData.push([colIdx, rowIdx, value])
        maxVal = Math.max(maxVal, value)
      })
    })

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center'
      },
      tooltip: {
        position: 'top',
        confine: true,
        appendToBody: true,
        renderMode: 'html',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const value = formatNumber(params.data[2], dp, ts)
          return `<div style="padding: 5px 10px;">${rowArray[params.data[1]]} / ${colArray[params.data[0]]}: ${value}</div>`
        }
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: colArray,
        splitArea: {
          show: true
        },
        axisLabel: {
          rotate: colArray.length > 5 ? 45 : 0
        }
      },
      yAxis: {
        type: 'category',
        data: rowArray,
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: maxVal || 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
        }
      },
      series: [{
        name: 'Pivot',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: any) => {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            return formatNumber(params.data[2], dp, ts)
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }

    chartInstance.setOption(option)
    return
  }

  // Number chart - similar to KPI but may have different styling
  if (type === 'number') {
    const value = Number(kpiValue.value) || 0
    const label = kpiLabel.value
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        top: '5%'
      },
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'text',
              style: {
                text: (() => {
                  const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
                  const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
                  const prefix = props.appearance?.yAxis?.numberFormat?.prefix || ''
                  const suffix = props.appearance?.yAxis?.numberFormat?.suffix || ''
                  return `${prefix}${formatNumber(value, dp, ts)}${suffix}`
                })(),
                fill: palette[0] || '#3366CC',
                font: 'bold 64px Arial',
                textAlign: 'center',
                textVerticalAlign: 'middle'
              }
            },
            {
              type: 'text',
              top: 45,
              style: {
                text: label,
                fill: '#666',
                font: '16px Arial',
                textAlign: 'center',
                textVerticalAlign: 'top'
              }
            }
          ]
        }
      ]
    }

    chartInstance.setOption(option)
    return
  }

  // Radar/Spider Web chart
  if (type === 'radar') {
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Get dimension labels for radar indicators
    const indicators = cats.map(cat => ({name: String(cat), max: 100}))

    // Update max values based on actual data
    series.forEach(s => {
      s.data.forEach((val, idx) => {
        if (typeof val === 'number' && val > (indicators[idx]?.max || 0)) {
          indicators[idx].max = Math.ceil(val * 1.2) // Add 20% headroom
        }
      })
    })

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center'
      },
      legend: {
        show: props.appearance?.showLegend ?? true,
        data: series.map(s => s.name),
        bottom: 10
      },
      radar: {
        indicator: indicators,
        shape: 'polygon'
      },
      series: [{
        type: 'radar',
        data: series.map((s, idx) => ({
          value: s.data,
          name: s.name,
          areaStyle: {opacity: 0.3},
          lineStyle: {color: palette[idx % palette.length]},
          itemStyle: {color: palette[idx % palette.length]}
        }))
      }]
    }

    chartInstance.setOption(option)
    return
  }

  // Bubble chart - scatter with categorical X-axis and dynamic symbol sizes
  if (type === 'bubble') {
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Bubble chart: X dimension (category), Y metric (value), Size (from breakdowns or second metric)
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = metricAliases.value[0]
    const sizeKey = props.breakdowns?.[0]?.fieldId || metricAliases.value[1]

    // Build bubble data with category, y value, and size
    const categories: string[] = []
    const bubbleData: { value: [number, number, number], name: string }[] = []

    props.rows.forEach((row, idx) => {
      const category = xKey ? String(row[xKey] || 'Unknown') : `Item ${idx + 1}`
      const y = yKey ? Number(row[yKey]) || 0 : 0
      const size = sizeKey ? Number(row[sizeKey]) || 10 : 10

      let catIndex = categories.indexOf(category)
      if (catIndex === -1) {
        categories.push(category)
        catIndex = categories.length - 1
      }

      bubbleData.push({
        value: [catIndex, y, size],
        name: category
      })
    })

    if (bubbleData.length === 0) {
      chartInstance.setOption({
        backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
        title: {
          text: 'No data available',
          left: 'center',
          top: 'middle'
        }
      })
      return
    }

    // Calculate symbol sizes based on the size values
    const maxSize = Math.max(...bubbleData.map(d => d.value[2]), 1)
    const minSize = Math.min(...bubbleData.map(d => d.value[2]), 1)

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        renderMode: 'html',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const yValue = formatNumber(params.data.value[1], dp, ts)
          const sizeValue = formatNumber(params.data.value[2], dp, ts)
          return `<div style="padding: 5px 10px;">${params.data.name}<br/>${yKey || 'value'}: ${yValue}<br/>${sizeKey || 'size'}: ${sizeValue}</div>`
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          rotate: categories.length > 10 ? 45 : 0,
          interval: 0
        },
        boundaryGap: true
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          formatter: (value: number) => {
            const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
            const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
            return formatNumber(value, dp, ts)
          }
        }
      },
      series: [{
        type: 'scatter',
        data: bubbleData,
        symbolSize: (data: number[]) => {
          // Scale bubble size between 20 and 80 pixels based on value
          const normalized = (data[2] - minSize) / (maxSize - minSize || 1)
          return 20 + normalized * 60
        },
        itemStyle: {
          color: palette[0],
          opacity: 0.7
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            opacity: 1
          }
        }
      }]
    }

    chartInstance.setOption(option)

    // Add click handler for drill
    chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series') {
        emit('drill', {xValue: params.data.name, seriesName: 'bubble', datasetIndex: 0, index: params.dataIndex})
      }
    })
    
    return
  }

  // Box Plot chart
  if (type === 'boxplot') {
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Group data by category
    const boxplotData: number[][] = []
    const categoryMap = new Map<string, number[]>()

    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = metricAliases.value[0]

    props.rows.forEach(row => {
      const cat = xKey ? String(row[xKey] || 'Unknown') : 'Data'
      const val = yKey ? Number(row[yKey]) || 0 : 0
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, [])
      }
      categoryMap.get(cat)!.push(val)
    })

    const categories: string[] = []
    categoryMap.forEach((values, cat) => {
      categories.push(cat)
      values.sort((a, b) => a - b)
      const min = values[0] || 0
      const max = values[values.length - 1] || 0
      const q1 = values[Math.floor(values.length * 0.25)] || 0
      const median = values[Math.floor(values.length * 0.5)] || 0
      const q3 = values[Math.floor(values.length * 0.75)] || 0
      boxplotData.push([min, q1, median, q3, max])
    })

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      xAxis: {type: 'category', data: categories},
      xAxis: {type: 'category', data: categories},
      yAxis: {type: 'value'},
      grid: {
        top: 60 + (props.appearance?.titlePaddingBottom ?? 0),
        bottom: '15%'
      },
      series: [{
        type: 'boxplot',
        data: boxplotData,
        itemStyle: {color: palette[0], borderColor: palette[1] || '#333'}
      }]
    }

    chartInstance.setOption(option)
    return
  }

  // Waterfall chart (simulated with stacked bar)
  if (type === 'waterfall') {
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    const values: number[] = []
    const transparentValues: number[] = []
    let runningTotal = 0

    series[0]?.data.forEach((val, idx) => {
      const numVal = Number(val) || 0
      if (numVal >= 0) {
        transparentValues.push(runningTotal)
        values.push(numVal)
      } else {
        transparentValues.push(runningTotal + numVal)
        values.push(Math.abs(numVal))
      }
      runningTotal += numVal
    })

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      xAxis: {type: 'category', data: cats},
      yAxis: {type: 'value'},

      grid: {
        top: 60 + (props.appearance?.titlePaddingBottom ?? 0),
        bottom: '15%'
      },
      series: [
        {
          type: 'bar',
          stack: 'waterfall',
          itemStyle: {opacity: 0},
          data: transparentValues
        },
        {
          type: 'bar',
          stack: 'waterfall',
          data: values.map((val, idx) => ({
            value: val,
            itemStyle: {
              color: (series[0]?.data[idx] as number) >= 0 ? (palette[0] || '#22c55e') : (palette[1] || '#ef4444')
            }
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => formatNumber(series[0]?.data[params.dataIndex] as number, 0, true)
          }
        }
      ]
    }

    chartInstance.setOption(option)
    return
  }

  // Word Cloud chart
  if (type === 'wordcloud') {
    const palette = (props.appearance?.palette && props.appearance.palette.length
        ? props.appearance.palette
        : defaultColors)

    // Build word cloud data from categories and values
    const wordcloudData: { name: string; value: number }[] = []
    const xKey = props.xDimensions?.[0]?.fieldId
    const yKey = metricAliases.value[0]

    if (xKey && yKey) {
      props.rows.forEach(row => {
        const name = String(row[xKey] || '')
        const value = Number(row[yKey]) || 1
        if (name) {
          wordcloudData.push({name, value})
        }
      })
    } else {
      // Fallback: use categories with uniform values
      cats.forEach((cat, idx) => {
        const val = series[0]?.data[idx]
        wordcloudData.push({
          name: String(cat),
          value: typeof val === 'number' ? val : 10
        })
      })
    }

    const option = {
      backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
      title: {
        text: props.appearance?.chartTitle || '',
        show: !!props.appearance?.chartTitle,
        left: 'center',
        padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
      },
      series: [{
        type: 'wordCloud',
        shape: 'circle',
        type: 'wordCloud',
        shape: 'circle',
        left: 'center',
        top: 60 + (props.appearance?.titlePaddingBottom ?? 0),
        width: '80%',
        height: '80%',
        rotationRange: [-45, 45],
        rotationStep: 15,
        sizeRange: [14, 60],
        gridSize: 8,
        drawOutOfBound: false,
        textStyle: {
          fontFamily: props.appearance?.fontFamily || 'Arial',
          color: () => palette[Math.floor(Math.random() * palette.length)]
        },
        emphasis: {
          textStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        data: wordcloudData
      }]
    }

    chartInstance.setOption(option)
    return
  }

  // Handle stacked chart type - force stacking
  if (type === 'stacked') {
    // Will use the default bar/line rendering below but with stacking enabled
  }

  const palette = (props.appearance?.palette && props.appearance.palette.length
    ? props.appearance.palette
    : defaultColors)

  // Determine chart type for stacking logic
  // 'bar' is now horizontal, 'column' is vertical
  const isHorizontalBar = type === 'bar'
  const currentChartType = type === 'line' || type === 'area' ? 'line' : 'bar'

  // Create series data for ECharts
  const seriesConfig = series.map((s, idx) => {
    const color = palette[idx % palette.length]
    const baseConfig = {
      name: s.name,
      data: s.data,
      itemStyle: { color },
      emphasis: {
        focus: 'series'
      }
    }

    if (currentChartType === 'line') {
      const config = {
        ...baseConfig,
        type: currentChartType,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 }
      }

      // Add area style for area charts
      if (type === 'area') {
        (config as any).areaStyle = {
          opacity: 0.6
        }
      }

      return config
    } else {
      return {
        ...baseConfig,
        type: currentChartType,
        barWidth: '60%'
      }
    }
  })

  // Get font settings helper
  const getFontStyle = (font?: { color?: string; size?: number; bold?: boolean; italic?: boolean }) => ({
    color: font?.color || '#333',
    fontSize: font?.size || 12,
    fontWeight: font?.bold ? 'bold' : 'normal' as any,
    fontStyle: font?.italic ? 'italic' : 'normal' as any
  })

  // Axis and legend settings from new appearance
  const xAxisSettings = props.appearance?.xAxis || {}
  const yAxisSettings = props.appearance?.yAxis || {}
  const showLegend = props.appearance?.showLegend ?? true
  const legendFont = getFontStyle(props.appearance?.legendFont)

  const option: any = {
    backgroundColor: props.appearance?.backgroundTransparent ? 'transparent' : (props.appearance?.backgroundColor || 'transparent'),
    title: {
      text: props.appearance?.chartTitle || '',
      show: !!props.appearance?.chartTitle,
      textStyle: {
        fontFamily: props.appearance?.fontFamily || 'Arial'
      },
      padding: [0, 0, (props.appearance?.titlePaddingBottom ?? 20), 0]
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      appendToBody: true,
      renderMode: 'html',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#999',
          type: 'dashed'
        }
      },
      formatter: (params: any) => {
        let result = '<div style="padding: 5px 10px;">'
        params.forEach((param: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const prefix = props.appearance?.yAxis?.numberFormat?.prefix || ''
          const suffix = props.appearance?.yAxis?.numberFormat?.suffix || ''
          const value = typeof param.value === 'number' ? `${prefix}${formatNumber(param.value, dp, ts)}${suffix}` : param.value
          result += `${param.seriesName}: ${value}<br/>`
        })
        result += '</div>'
        return result
      }
    },
    legend: {
      show: showLegend,
      data: series.map(s => s.name),
      top: props.appearance?.legendPosition === 'top' ? 'top' :
          props.appearance?.legendPosition === 'left' || props.appearance?.legendPosition === 'right' ? 'middle' : 'bottom',
      left: props.appearance?.legendPosition === 'left' ? 'left' :
          props.appearance?.legendPosition === 'right' ? 'right' : 'center',
      orient: props.appearance?.legendPosition === 'left' || props.appearance?.legendPosition === 'right' ? 'vertical' : 'horizontal',
      textStyle: legendFont
    },
    grid: {
      left: props.appearance?.legendPosition === 'left' ? '15%' : '8%',
      right: props.appearance?.legendPosition === 'right' ? '15%' : '4%',
      bottom: (props.appearance?.legendPosition === 'bottom' || !props.appearance?.legendPosition) ? '15%' : '10%',
      top: 60 + (props.appearance?.titlePaddingBottom ?? 0),
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: currentChartType === 'bar',
      data: cats,
      name: xAxisSettings.showTitle !== false ? (xAxisSettings.title || props.appearance?.xAxisLabel || '') : '',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: getFontStyle(xAxisSettings.titleFont),
      axisLabel: {
        show: xAxisSettings.showLabels !== false,
        ...getFontStyle(xAxisSettings.labelFont),
        rotate: 0
      },
      axisLine: {
        show: xAxisSettings.showLine !== false,
        lineStyle: {
          color: xAxisSettings.lineColor || '#333',
          width: xAxisSettings.lineWidth || 1
        }
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisSettings.showTitle !== false ? (yAxisSettings.title || props.appearance?.yAxisLabel || '') : '',
      nameLocation: 'middle',
      nameGap: 70,
      nameTextStyle: getFontStyle(yAxisSettings.titleFont),
      min: yAxisSettings.scale?.min ?? 0,
      max: yAxisSettings.scale?.max ?? undefined,
      interval: yAxisSettings.scale?.interval ?? undefined,
      axisLabel: {
        show: yAxisSettings.showLabels !== false,
        ...getFontStyle(yAxisSettings.labelFont),
        formatter: (value: number) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const prefix = props.appearance?.yAxis?.numberFormat?.prefix || ''
          const suffix = props.appearance?.yAxis?.numberFormat?.suffix || ''
          return `${prefix}${formatNumber(value, dp, ts)}${suffix}`
        }
      }
    },
    series: seriesConfig
  }

  // Add data labels if enabled
  if (props.appearance?.showLabels) {
    const labelFont = getFontStyle(props.appearance?.labelFont)
    seriesConfig.forEach((s: any) => {
      s.label = {
        show: true,
        position: props.appearance?.labelsInside ? 'inside' : 'top',
        ...labelFont,
        formatter: (params: any) => {
          // Hide labels for zero values to avoid clutter on stacked charts
          if (params.value === 0 || params.value === null || params.value === undefined) {
            return ''
          }
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const prefix = props.appearance?.yAxis?.numberFormat?.prefix || ''
          const suffix = props.appearance?.yAxis?.numberFormat?.suffix || ''
          return `${prefix}${formatNumber(params.value, dp, ts)}${suffix}`
        }
      }
    })
  }

  // Handle stacking if needed (either via appearance or stacked chart type)
  if (props.appearance?.stacked || type === 'stacked') {
    // Keep boundaryGap true for bar/column charts (to offset from axis)
    // Only set to false for line/area charts where we want points at edges
    if (currentChartType === 'line') {
      option.xAxis.boundaryGap = false
    }
    seriesConfig.forEach((series: any, idx: number) => {
      series.stack = 'total'  // All series stack together
    })
  }

  // Handle horizontal bar chart - swap x and y axes
  if (isHorizontalBar) {
    const tempAxis = option.xAxis
    option.xAxis = {...option.yAxis, type: 'value'}
    option.yAxis = {...tempAxis, type: 'category', data: cats}
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

watch(() => [props.chartType, props.columns, props.rows, props.xDimensions, props.breakdowns, props.yMetrics, props.appearance, isDark.value], () => {
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

defineExpose({
  captureSnapshot
})
</script>

<style scoped>
</style>


