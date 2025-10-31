<template>
  <div>
    <div v-if="chartType === 'gauge'" class="p-6 border rounded bg-white text-center">
      <div class="text-sm text-gray-500 mb-1">{{ kpiLabel }}</div>
      <div class="text-4xl font-semibold">{{ kpiValue }}</div>
    </div>
    <div v-else ref="chartRef" class="w-full h-64 min-h-64"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'

// Load ECharts - it's now a proper dependency instead of CDN loading
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

type Column = { key: string; label: string }
type ReportField = { fieldId: string; name?: string; label?: string }

const props = defineProps<{
  chartType: 'table' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey'
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
        show: !!props.appearance?.chartTitle
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
          offsetCenter: [0, '-20%'],
          fontSize: 20
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
        show: !!props.appearance?.chartTitle
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
        show: !!props.appearance?.chartTitle
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
      legend: {
        show: true,
        data: funnelData.map(item => item.name),
        top: '5%'
      },
      series: [{
        name: 'Funnel',
        type: 'funnel',
        left: '10%',
        top: '20%',
        bottom: '10%',
        width: '80%',
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
        left: 'center'
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
        left: 'center'
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
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const dp = props.appearance?.numberFormat?.decimalPlaces ?? 0
          const ts = props.appearance?.numberFormat?.thousandsSeparator ?? true
          const formattedValue = typeof params.value === 'number' ? formatNumber(params.value, dp, ts) : params.value
          if (params.dataType === 'node') {
            return `${params.name}`
          } else {
            return `${params.data.source} → ${params.data.target}: ${formattedValue}`
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

  const palette = (props.appearance?.palette && props.appearance.palette.length
    ? props.appearance.palette
    : defaultColors)

  // Determine chart type for stacking logic
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
      boundaryGap: currentChartType === 'bar',
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
    option.xAxis.boundaryGap = currentChartType !== 'bar'
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
  if (props.chartType === 'gauge') return
  renderChart()
})

watch(() => [props.chartType, props.columns, props.rows, props.xDimensions, props.breakdowns, props.yMetrics, props.appearance], () => {
  if (props.chartType === 'gauge') { destroyChart(); return }
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


