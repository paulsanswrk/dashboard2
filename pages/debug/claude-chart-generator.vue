<script setup>
definePageMeta({
  middleware: 'debug'
})

// Reactive state
const systemPrompt = ref(`You are an expert BI assistant that creates charts using Apache ECharts for MySQL Sakila database.

You will receive a user request for a chart/report and you need to:
1. Generate a safe, efficient SQL query for the Sakila database
2. Create a complete ECharts JSON configuration

Return ONLY a JSON object with two fields:
- "sql": A valid MySQL query string that retrieves the needed data
- "chartConfig": A complete ECharts configuration object

IMPORTANT CONSTRAINTS:
- Use only Sakila database tables (actor, film, category, customer, rental, payment, inventory, store, staff, address, city, country, language)
- Generate only SELECT queries, never use INSERT/UPDATE/DELETE
- Include appropriate LIMIT clauses (max 1000 rows for performance)
- Use proper JOIN syntax for related tables
- Ensure chart configuration matches the data structure from your SQL query

DATABASE SCHEMA OVERVIEW:
- film: film_id, title, description, release_year, language_id, rental_duration, rental_rate, length, replacement_cost, rating, special_features
- category: category_id, name
- film_category: film_id, category_id
- actor: actor_id, first_name, last_name
- film_actor: film_id, actor_id
- customer: customer_id, first_name, last_name, email, address_id, active, create_date
- rental: rental_id, rental_date, inventory_id, customer_id, return_date, staff_id
- payment: payment_id, customer_id, staff_id, rental_id, amount, payment_date
- inventory: inventory_id, film_id, store_id
- store: store_id, manager_staff_id, address_id
- staff: staff_id, first_name, last_name, address_id, email, store_id, active, username, password
- address: address_id, address, address2, district, city_id, postal_code, phone
- city: city_id, city, country_id
- country: country_id, country
- language: language_id, name

CHART TYPES TO CONSIDER:
- pie/donut: For categorical distributions (categories, ratings, etc.)
- bar/line/area: For trends, comparisons, time series
- scatter: For correlations between numeric values
- gauge: For single KPI values
- table: For detailed listings

Always ensure your chart configuration has proper titles, legends, and formatting.`)

const userPrompt = ref('Create a pie chart showing the distribution of film categories by popularity (number of films in each category)')

const generatedSql = ref('')
const generatedChartConfig = ref('')
const editableChartConfig = ref('') // Separate editable version for testing
const isGenerating = ref(false)
const chartData = ref([])
const chartColumns = ref([])
const chartError = ref('')

// Chart editor state
const editorConfig = ref({
  chartType: 'pie',
  title: 'Film Categories',
  width: 800,
  height: 400,
  backgroundColor: '#ffffff',
  series: {
    radius: '60%',
    innerRadius: '0%',
    roseType: ''
  },
  xAxis: {
    name: 'Category'
  },
  yAxis: {
    name: 'Count'
  },
  legend: {
    position: 'top'
  },
  animationDuration: 1000,
  colorPalette: 'default'
})

// Chart instance
let chartInstance = null

// Chart editor methods
const applyEditorConfig = () => {
  if (!chartData.value?.length) return

  const config = generateEditorChartOption()
  renderChartFromConfig(config)
}

const generateEditorChartOption = () => {
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#c23531']

  let series = []

  switch (editorConfig.value.chartType) {
    case 'pie':
      series = [{
        type: 'pie',
        radius: editorConfig.value.series.radius,
        center: ['50%', '50%'],
        data: chartData.value.map((row, index) => ({
          name: row[chartColumns.value[0]?.key] || `Item ${index + 1}`,
          value: parseFloat(row[chartColumns.value[1]?.key]) || 0
        }))
      }]
      break
    case 'bar':
      series = [{
        type: 'bar',
        data: chartData.value.map(row => parseFloat(row[chartColumns.value[1]?.key]) || 0)
      }]
      break
    case 'line':
      series = [{
        type: 'line',
        smooth: true,
        data: chartData.value.map(row => parseFloat(row[chartColumns.value[1]?.key]) || 0)
      }]
      break
  }

  return {
    title: {
      text: editorConfig.value.title,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [editorConfig.value.xAxis.name],
      top: editorConfig.value.legend.position === 'top' ? 0 : 'bottom'
    },
    xAxis: {
      type: 'category',
      data: chartData.value.map(row => row[chartColumns.value[0]?.key] || ''),
      name: editorConfig.value.xAxis.name
    },
    yAxis: {
      type: 'value',
      name: editorConfig.value.yAxis.name
    },
    series: series,
    color: colors,
    backgroundColor: editorConfig.value.backgroundColor,
    animationDuration: editorConfig.value.animationDuration
  }
}

const renderChartFromConfig = async (config) => {
  console.log('Rendering chart from editor config:', config)

  // Clean up existing chart
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  await nextTick()

  const chartElement = document.getElementById('chart-container')
  if (!chartElement) return

  // Initialize ECharts
  let echarts
  try {
    const echartsModule = await import('echarts')
    echarts = echartsModule.default || echartsModule
  } catch (error) {
    console.error('Failed to load ECharts:', error)
    chartError.value = 'Failed to load chart library'
    return
  }

  if (!echarts || typeof echarts.init !== 'function') {
    console.error('ECharts not properly loaded')
    chartError.value = 'Chart library not available'
    return
  }

  try {
    chartInstance = echarts.init(chartElement)
    chartInstance.setOption(config, true)
    console.log('Chart rendered from editor successfully')
  } catch (error) {
    console.error('Error rendering chart from editor:', error)
    chartError.value = `Chart rendering failed: ${error.message}`
  }
}

const applyGeneratedConfig = () => {
  if (!generatedChartConfig.value) return

  try {
    const config = JSON.parse(generatedChartConfig.value)
    renderChartFromConfig(config)
  } catch (error) {
    console.error('Error applying generated config:', error)
    chartError.value = 'Invalid chart configuration in textarea'
  }
}

const resetEditorConfig = () => {
  editorConfig.value = {
    chartType: 'pie',
    title: 'Film Categories',
    width: 800,
    height: 400,
    backgroundColor: '#ffffff',
    series: {
      radius: '60%',
      innerRadius: '0%',
      roseType: ''
    },
    xAxis: {
      name: 'Category'
    },
    yAxis: {
      name: 'Count'
    },
    legend: {
      position: 'top'
    },
    animationDuration: 1000,
    colorPalette: 'default'
  }
}

const applyEditableConfig = () => {
  if (!editableChartConfig.value) return

  try {
    const config = JSON.parse(editableChartConfig.value)
    renderChartFromConfig(config)
  } catch (error) {
    console.error('Error applying editable config:', error)
    chartError.value = 'Invalid chart configuration in editor'
  }
}

const syncEditableConfig = () => {
  if (generatedChartConfig.value) {
    editableChartConfig.value = generatedChartConfig.value
  }
}

const generateReport = async () => {
  isGenerating.value = true
  chartError.value = ''

  try {
    // Get available connections to find Sakila
    const connections = await $fetch('/api/reporting/connections')

    // Find Sakila connection (look for sakila in internal_name or database_name)
    const sakilaConnection = connections.find(conn =>
      conn.internal_name?.toLowerCase().includes('sakila') ||
      conn.database_name?.toLowerCase().includes('sakila')
    )

    if (!sakilaConnection) {
      throw new Error('Sakila connection not found. Please ensure you have a Sakila database connection configured.')
    }

    const sakilaConnectionId = sakilaConnection.id

    // Call Claude SQL + Chart generation endpoint
    const aiResponse = await $fetch('/api/reporting/claude-sql', {
      method: 'POST',
      body: {
        connectionId: sakilaConnectionId,
        userPrompt: userPrompt.value
      }
    })

    generatedSql.value = aiResponse.sql
    generatedChartConfig.value = JSON.stringify(aiResponse.chartConfig, null, 2)

    // Sync editable config with the generated one
    editableChartConfig.value = generatedChartConfig.value

    // Chart type is now injected into chartConfig.series[0].type by the API
    console.log('Chart config received:', aiResponse.chartConfig)

    // Execute the SQL to get data and update chart
    await executeSql()

  } catch (error) {
    console.error('Error generating report:', error)
    chartError.value = error.message || 'Failed to generate report'
  } finally {
    isGenerating.value = false
  }
}

const executeSql = async () => {
  if (!generatedSql.value) return

  try {
    const response = await $fetch('/api/debug/query', {
      method: 'POST',
      body: {
        sql: generatedSql.value,
        limit: 1000
      }
    })

    chartColumns.value = response.columns
    chartData.value = response.rows

    console.log('Received data from database:', {
      columns: response.columns,
      dataLength: response.rows?.length,
      firstRow: response.rows?.[0]
    })
  } catch (error) {
    console.error('Error executing SQL:', error)
    chartError.value = error.data?.statusMessage || 'Failed to execute SQL query (using debug endpoint)'
  }
}

const updateChart = async () => {
  if (!generatedSql.value || !generatedChartConfig.value) return

  try {
    // Always execute SQL to get fresh data
    await executeSql()

    // Parse and render chart with the new data
    const chartConfig = JSON.parse(generatedChartConfig.value)
    await renderChart(chartConfig)
  } catch (error) {
    console.error('Error updating chart:', error)
    chartError.value = error.message || 'Failed to update chart'
  }
}

const renderChart = async (chartConfig) => {
  console.log('Rendering chart with config:', chartConfig)

  // Clean up existing chart
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  // Wait for DOM to be ready
  await nextTick()

  // Try multiple times to find the element
  let chartElement = document.getElementById('chart-container')
  let attempts = 0
  while (!chartElement && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    chartElement = document.getElementById('chart-container')
    attempts++
  }

  if (!chartElement) {
    console.error('Chart container element not found after multiple attempts')
    chartError.value = 'Chart container not found'
    return
  }

  console.log('Chart element found:', chartElement)

  // Initialize ECharts
  let echarts
  try {
    const echartsModule = await import('echarts')
    echarts = echartsModule.default || echartsModule
    console.log('ECharts loaded:', !!echarts)
  } catch (error) {
    console.error('Failed to load ECharts:', error)
    chartError.value = 'Failed to load chart library'
    return
  }

  if (!echarts || typeof echarts.init !== 'function') {
    console.error('ECharts not properly loaded:', { echarts, hasInit: typeof echarts?.init })
    chartError.value = 'Chart library not available'
    return
  }

  // Transform data for the chart
  const transformedConfig = transformDataForChart(chartConfig)
  console.log('Transformed config:', transformedConfig)

  // Validate and ensure chart configuration has required properties
  if (!transformedConfig || typeof transformedConfig !== 'object') {
    console.error('Invalid chart configuration:', transformedConfig)
    chartError.value = 'Invalid chart configuration'
    return
  }

  // Ensure series array exists and has proper structure
/*  if (transformedConfig.series && Array.isArray(transformedConfig.series)) {
    transformedConfig.series.forEach(series => {
      // Ensure each series has a type (ECharts requirement)
      if (!series.type) {
        console.warn('Series missing type, defaulting to pie')
        series.type = 'pie' // Default fallback
      }

      const seriesType = series.type.toLowerCase()

      if (seriesType === 'pie' || seriesType === 'donut') {
        // Pie charts don't need xAxis, but ensure data array exists
        if (!Array.isArray(series.data)) {
          series.data = []
        }
      } else if (seriesType === 'bar' || seriesType === 'line' || seriesType === 'area') {
        // Bar/line charts need xAxis
        if (!transformedConfig.xAxis) {
          transformedConfig.xAxis = { type: 'category', data: [] }
        }
        if (!transformedConfig.yAxis) {
          transformedConfig.yAxis = { type: 'value' }
        }
      }
    })
  }*/

  console.log('Final chart config before rendering:', JSON.stringify(transformedConfig, null, 2))

  try {
    chartInstance = echarts.init(chartElement)
    console.log('Chart instance created:', !!chartInstance)

    if (chartInstance && typeof chartInstance.setOption === 'function') {
      chartInstance.setOption(transformedConfig, true) // notMerge = true to force complete re-render
      console.log('Chart options set successfully')

      // Force resize to ensure proper display
      setTimeout(() => {
        if (chartInstance && typeof chartInstance.resize === 'function') {
          chartInstance.resize()
        }
      }, 100)
    } else {
      throw new Error('Chart instance not properly initialized')
    }
  } catch (error) {
    console.error('Error initializing chart:', error)
    chartError.value = `Chart initialization failed: ${error.message}`
  }
}

const transformDataForChart = (chartConfig) => {
  console.log('Transforming data for chart:', { chartDataLength: chartData.value?.length, chartColumnsLength: chartColumns.value?.length })

  const config = { ...chartConfig }

  // Safety check for data availability
  if (!chartData.value || !chartColumns.value) {
    console.warn('No chart data or columns available for transformation')
    console.log('Chart data:', chartData.value, 'Columns:', chartColumns.value)
    return config
  }

  if (chartData.value.length === 0) {
    console.warn('Chart data array is empty, but proceeding with transformation')
  }

  if (config.series && Array.isArray(config.series)) {
    config.series.forEach((series, seriesIndex) => {
      const seriesType = series.type?.toLowerCase()

      if ((seriesType === 'pie' || seriesType === 'donut') && chartData.value?.length) {
        console.log('Processing pie chart series:', seriesIndex)

        // For pie charts, use the first two columns
        const nameCol = chartColumns.value[0]?.key
        const valueCol = chartColumns.value[1]?.key

        console.log('Pie chart columns:', { nameCol, valueCol, dataLength: chartData.value.length })

        if (nameCol && valueCol && chartData.value.length > 0) {
          series.data = chartData.value.map((row, index) => {
            const name = String(row[nameCol] || `Item ${index + 1}`)
            const value = parseFloat(row[valueCol]) || 0
            console.log(`Pie data point ${index}:`, { name, value })
            return { name, value }
          })
          console.log('Pie chart data populated:', series.data.length, 'items')
        } else {
          console.warn('Missing columns or data for pie chart')
        }
      } else if ((seriesType === 'bar' || seriesType === 'line' || seriesType === 'area') && chartData.value?.length) {
        console.log('Processing bar/line chart series:', seriesIndex)

        // For bar/line charts, use first column as x-axis, others as series
        const xCol = chartColumns.value[0]?.key

        if (xCol) {
          config.xAxis = config.xAxis || {}
          config.xAxis.data = chartData.value.map(row => String(row[xCol] || ''))

          // Update series data
          chartColumns.value.slice(1).forEach((col, colIndex) => {
            const seriesToUpdate = config.series[colIndex]
            if (seriesToUpdate) {
              seriesToUpdate.data = chartData.value.map(row =>
                parseFloat(row[col.key]) || 0
              )
            }
          })
        }
      }
    })
  }

  return config
}

// Auto-resize chart on window resize
onMounted(() => {
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', () => {})
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="flex items-center mb-6">
          <div class="bg-purple-100 p-2 rounded-full mr-4">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900">Claude AI Chart Generator</h1>
        </div>

        <!-- Error Display -->
        <div v-if="chartError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-red-700">{{ chartError }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Prompts and Controls -->
          <div class="space-y-6">
            <!-- System Prompt -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                System Prompt (editable)
              </label>
              <textarea
                v-model="systemPrompt"
                rows="8"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                placeholder="Enter system prompt for Claude AI..."
              ></textarea>
            </div>

            <!-- User Prompt -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                User Prompt (editable)
              </label>
              <textarea
                v-model="userPrompt"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your chart request..."
              ></textarea>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button
                @click="generateReport"
                :disabled="isGenerating"
                class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center cursor-pointer"
              >
                <svg v-if="isGenerating" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGenerating ? 'Generating...' : 'Generate Report' }}
              </button>

              <button
                @click="updateChart"
                :disabled="!generatedSql || !generatedChartConfig"
                class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Update Chart
              </button>
            </div>

            <!-- Generated SQL -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Generated SQL (editable)
              </label>
              <textarea
                v-model="generatedSql"
                rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                placeholder="Generated SQL query..."
              ></textarea>
            </div>

            <!-- Generated Chart Config -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Generated Chart Configuration (editable)
              </label>
              <div class="mb-3">
                <button
                  @click="applyGeneratedConfig"
                  :disabled="!generatedChartConfig"
                  class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors text-sm cursor-pointer"
                >
                  Apply Changes
                </button>
              </div>
              <textarea
                v-model="generatedChartConfig"
                rows="10"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                placeholder="Generated ECharts configuration..."
              ></textarea>
            </div>
          </div>

          <!-- Right Column - Chart Preview and Controls -->
          <div class="space-y-4 max-h-screen overflow-y-auto">
            <!-- Chart Preview -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Chart Preview</h3>

              <!-- Chart Data Info -->
              <div v-if="chartData.length" class="mb-4 p-3 bg-purple-50 rounded-lg">
                <div class="text-sm text-purple-700">
                  <strong>Data:</strong> {{ chartData.length }} rows, {{ chartColumns.length }} columns
                </div>
              </div>

              <!-- Chart Container -->
              <div
                id="chart-container"
                class="w-full h-80 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center"
                :class="{ 'border-dashed': !chartData.length }"
              >
                <div v-if="!chartData.length" class="text-center text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <p>Chart will appear here after generating a report</p>
                </div>
              </div>
            </div>

            <!-- Chart Editor Controls (moved to right column) -->
            <div class="p-4 bg-white rounded-lg shadow-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">🎛️ Chart Editor</h3>

              <!-- Chart Type Selection -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-3">Chart Type</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="type in ['pie', 'bar', 'line', 'area']"
                    :key="type"
                    @click="editorConfig.chartType = type"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
                      editorConfig.chartType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    ]"
                  >
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                  </button>
                </div>
              </div>

              <!-- Basic Settings -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Chart Title</label>
                  <input
                    v-model="editorConfig.title"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter chart title"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                  <input
                    v-model="editorConfig.backgroundColor"
                    type="color"
                    class="w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                </div>
              </div>

              <!-- Chart-Specific Options -->
              <div class="mb-4">
                <h4 class="text-md font-medium text-gray-700 mb-3">Chart-Specific Options</h4>

                <!-- Pie Chart Options -->
                <div v-if="editorConfig.chartType === 'pie'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Radius</label>
                    <input
                      v-model="editorConfig.series.radius"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="60%"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Inner Radius</label>
                    <input
                      v-model="editorConfig.series.innerRadius"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0%"
                    >
                  </div>
                </div>

                <!-- Bar/Line Chart Options -->
                <div v-if="['bar', 'line', 'area'].includes(editorConfig.chartType)" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">X-Axis Name</label>
                    <input
                      v-model="editorConfig.xAxis.name"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="X Axis Label"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Y-Axis Name</label>
                    <input
                      v-model="editorConfig.yAxis.name"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Y Axis Label"
                    >
                  </div>
                </div>
              </div>

              <!-- Legend and Animation -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Legend Position</label>
                  <select
                    v-model="editorConfig.legend.position"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Animation Duration (ms)</label>
                  <input
                    v-model.number="editorConfig.animationDuration"
                    type="number"
                    min="0"
                    step="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  @click="applyEditorConfig"
                  :disabled="!chartData.length"
                  class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Apply Editor
                </button>
                <button
                  @click="resetEditorConfig"
                  class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <!-- Live Chart Config Editor (moved to right column) -->
            <div class="p-4 bg-white rounded-lg shadow-lg">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">⚙️ Live Configuration</h3>
              <p class="text-sm text-gray-600 mb-4">Edit this JSON to modify the chart in real-time:</p>

              <div class="mb-4">
                <textarea
                  v-model="editableChartConfig"
                  rows="12"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                  placeholder="Chart configuration JSON..."
                ></textarea>
              </div>

              <div class="flex gap-3">
                <button
                  @click="applyEditableConfig"
                  :disabled="!editableChartConfig"
                  class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Apply Config
                </button>
                <button
                  @click="syncEditableConfig"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Sync from Generated
                </button>
              </div>
            </div>
          </div>
        </div>


        <!-- Instructions -->
        <div class="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">How to Use</h3>
          <div class="text-sm text-gray-600 space-y-2">
            <p>1. Edit the <strong>System Prompt</strong> to customize how Claude AI generates charts</p>
            <p>2. Edit the <strong>User Prompt</strong> to request different types of charts (e.g., "bar chart of film ratings", "pie chart of rental amounts by store")</p>
            <p>3. Click <strong>Generate Report</strong> to get SQL and chart configuration from Claude AI</p>
            <p>4. Review and edit the generated SQL and chart configuration as needed</p>
            <p>5. Click <strong>Update Chart</strong> to execute the SQL against the Sakila database and refresh the visualization with fresh data</p>
            <p>6. Use the <strong>Chart Editor</strong> controls (in the right column) to modify chart appearance and behavior</p>
            <p>7. Use the <strong>Live Configuration</strong> editor (in the right column) to make direct JSON modifications and test changes instantly</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>
