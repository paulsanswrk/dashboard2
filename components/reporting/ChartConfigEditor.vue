<template>
  <div class="chart-config-editor">
    <!-- Tab Navigation -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
      <button
          v-for="tab in availableTabs"
          :key="tab.id"
          type="button"
          :class="[
          'px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
          activeTab === tab.id
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        ]"
          @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- CHART AREA Tab -->
    <div v-show="activeTab === 'chart-area'" class="space-y-4">
      <!-- General Section -->
      <ConfigSection title="General" v-model:expanded="sections.general">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Font Family</label>
            <select
                v-model="appearance.fontFamily"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option v-for="font in fontFamilies" :key="font" :value="font">{{ font }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Chart Title</label>
            <input
                v-model="appearance.chartTitle"
                type="text"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter title..."
            />
          </div>
        </div>
      </ConfigSection>

      <!-- Labels Section -->
      <ConfigSection title="Labels" v-model:expanded="sections.labels">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show labels</label>
            <ToggleSwitch v-model="appearance.showLabels"/>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show labels (%)</label>
            <ToggleSwitch v-model="appearance.showLabelsPercent"/>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Position inside chart</label>
            <ToggleSwitch v-model="appearance.labelsInside"/>
          </div>
          <div v-if="appearance.showLabels || appearance.showLabelsPercent">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Label Font</label>
            <ChartConfigFontSettings v-model="appearance.labelFont"/>
          </div>
        </div>
      </ConfigSection>

      <!-- Legend Section -->
      <ConfigSection title="Legend" v-model:expanded="sections.legend">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show legend</label>
            <ToggleSwitch v-model="appearance.showLegend"/>
          </div>
          <div v-if="appearance.showLegend" class="space-y-3">
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Position</label>
              <div class="flex border rounded overflow-hidden dark:border-gray-600">
                <button
                    v-for="pos in legendPositions"
                    :key="pos.value"
                    type="button"
                    :class="[
                    'flex-1 px-2 py-1 text-xs',
                    appearance.legendPosition === pos.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  ]"
                    @click="appearance.legendPosition = pos.value"
                >{{ pos.label }}
                </button>
              </div>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Legend Font</label>
              <ChartConfigFontSettings v-model="appearance.legendFont"/>
            </div>
          </div>
        </div>
      </ConfigSection>

      <!-- Background Section -->
      <ConfigSection title="Background" v-model:expanded="sections.background">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Transparent</label>
            <ToggleSwitch v-model="appearance.backgroundTransparent"/>
          </div>
          <div v-if="!appearance.backgroundTransparent" class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400">Color</label>
            <ChartConfigColorPicker v-model="appearance.backgroundColor" :show-hex="true"/>
          </div>
        </div>
      </ConfigSection>

      <!-- Number Format (for Pie/Donut) -->
      <ConfigSection v-if="isPieChart" title="Number Format" v-model:expanded="sections.numberFormat">
        <ChartConfigNumberFormat v-model="yAxisNumberFormat"/>
      </ConfigSection>

      <!-- Pie Options -->
      <ConfigSection v-if="isPieChart" title="Pie Options" v-model:expanded="sections.pieOptions">
        <div class="flex items-center justify-between">
          <label class="text-xs text-gray-600 dark:text-gray-400">Show as donut chart</label>
          <ToggleSwitch v-model="appearance.showAsDonut"/>
        </div>
      </ConfigSection>

      <!-- Series Options (for bar/line/area) -->
      <ConfigSection v-if="isCartesianChart" title="Series" v-model:expanded="sections.series">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Stacked</label>
            <ToggleSwitch v-model="appearance.stacked"/>
          </div>
        </div>
      </ConfigSection>
    </div>

    <!-- X AXIS Tab -->
    <div v-show="activeTab === 'x-axis'" class="space-y-4">
      <!-- Axis Title Section -->
      <ConfigSection title="Axis Title" v-model:expanded="sections.xAxisTitle">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show title</label>
            <ToggleSwitch v-model="xAxis.showTitle"/>
          </div>
          <div v-if="xAxis.showTitle" class="space-y-3">
            <input
                v-model="xAxis.title"
                type="text"
                class="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="auto"
            />
            <ChartConfigFontSettings v-model="xAxis.titleFont"/>
          </div>
        </div>
      </ConfigSection>

      <!-- Axis Labels Section -->
      <ConfigSection title="Axis Labels" v-model:expanded="sections.xAxisLabels">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show labels</label>
            <ToggleSwitch v-model="xAxis.showLabels"/>
          </div>
          <div v-if="xAxis.showLabels" class="space-y-3">
            <ChartConfigFontSettings v-model="xAxis.labelFont"/>
            <div class="flex items-center justify-between">
              <label class="text-xs text-gray-600 dark:text-gray-400">Allow text wrap</label>
              <ToggleSwitch v-model="xAxis.allowTextWrap"/>
            </div>
          </div>
        </div>
      </ConfigSection>

      <!-- Line Section -->
      <ConfigSection title="Line" v-model:expanded="sections.xAxisLine">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show line</label>
            <ToggleSwitch v-model="xAxis.showLine"/>
          </div>
          <div v-if="xAxis.showLine" class="space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Color</label>
              <ChartConfigColorPicker v-model="xAxis.lineColor"/>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Width</label>
              <input
                  v-model.number="xAxis.lineWidth"
                  type="number"
                  min="1"
                  max="5"
                  class="w-16 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      </ConfigSection>
    </div>

    <!-- Y AXIS Tab -->
    <div v-show="activeTab === 'y-axis'" class="space-y-4">
      <!-- Axis Title Section -->
      <ConfigSection title="Axis Title" v-model:expanded="sections.yAxisTitle">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show title</label>
            <ToggleSwitch v-model="yAxis.showTitle"/>
          </div>
          <div v-if="yAxis.showTitle" class="space-y-3">
            <input
                v-model="yAxis.title"
                type="text"
                class="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="auto"
            />
            <ChartConfigFontSettings v-model="yAxis.titleFont"/>
          </div>
        </div>
      </ConfigSection>

      <!-- Axis Labels Section -->
      <ConfigSection title="Axis Labels" v-model:expanded="sections.yAxisLabels">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show labels</label>
            <ToggleSwitch v-model="yAxis.showLabels"/>
          </div>
          <div v-if="yAxis.showLabels">
            <ChartConfigFontSettings v-model="yAxis.labelFont"/>
          </div>
        </div>
      </ConfigSection>

      <!-- Number Format Section -->
      <ConfigSection title="Number Format" v-model:expanded="sections.yAxisNumberFormat">
        <ChartConfigNumberFormat v-model="yAxisNumberFormat"/>
      </ConfigSection>

      <!-- Axis Scale Section -->
      <ConfigSection title="Axis Scale" v-model:expanded="sections.yAxisScale">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Min</label>
            <input
                v-model.number="yAxisScale.min"
                type="number"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="auto"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Max</label>
            <input
                v-model.number="yAxisScale.max"
                type="number"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="auto"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-16">Interval</label>
            <input
                v-model.number="yAxisScale.interval"
                type="number"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="auto"
            />
          </div>
        </div>
      </ConfigSection>
    </div>

    <!-- TABLE STYLE Tab -->
    <div v-show="activeTab === 'table-style'" class="space-y-4">
      <!-- General Section -->
      <ConfigSection title="General" v-model:expanded="sections.tableGeneral">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Font Family</label>
            <select
                v-model="appearance.fontFamily"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option v-for="font in fontFamilies" :key="font" :value="font">{{ font }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Text Alignment</label>
            <div class="flex border rounded overflow-hidden dark:border-gray-600">
              <button
                  v-for="align in textAlignments"
                  :key="align.value"
                  type="button"
                  :class="[
                  'flex-1 px-2 py-1 text-xs border-r last:border-r-0 dark:border-gray-600',
                  tableSettings.textAlign === align.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
                  @click="tableSettings.textAlign = align.value"
              >{{ align.label }}
              </button>
            </div>
          </div>
        </div>
      </ConfigSection>

      <!-- Color Options Section -->
      <ConfigSection title="Color Options" v-model:expanded="sections.tableColors">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Odd Row</label>
            <ChartConfigColorPicker v-model="tableSettings.oddRowColor" :show-hex="true"/>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Even Row</label>
            <ChartConfigColorPicker v-model="tableSettings.evenRowColor" :show-hex="true"/>
          </div>
          <div class="pt-2 border-t dark:border-gray-700">
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Border Style</label>
            <div class="flex border rounded overflow-hidden dark:border-gray-600 mb-2">
              <button
                  v-for="style in borderStyles"
                  :key="style.value"
                  type="button"
                  :class="[
                  'flex-1 px-2 py-1 text-xs border-r last:border-r-0 dark:border-gray-600',
                  tableSettings.borderStyle === style.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
                  @click="tableSettings.borderStyle = style.value"
              >{{ style.label }}
              </button>
            </div>
            <div class="flex items-center gap-2">
              <select
                  v-model="tableSettings.borderType"
                  class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
              </select>
              <ChartConfigColorPicker v-model="tableSettings.borderColor"/>
              <input
                  v-model.number="tableSettings.borderWidth"
                  type="number"
                  min="1"
                  max="5"
                  class="w-12 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>
      </ConfigSection>

      <!-- Options Section -->
      <ConfigSection title="Options" v-model:expanded="sections.tableOptions">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Allow text wrap</label>
            <ToggleSwitch v-model="tableSettings.allowTextWrap"/>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Switch Row/Column</label>
            <ToggleSwitch v-model="tableSettings.switchRowColumn"/>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Row Height</label>
            <select
                v-model.number="tableSettings.rowHeight"
                class="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option v-for="h in [16, 24, 32, 40, 48]" :key="h" :value="h">{{ h }}px</option>
            </select>
          </div>
        </div>
      </ConfigSection>

      <!-- Number Format Section -->
      <ConfigSection title="Number Format" v-model:expanded="sections.tableNumberFormat">
        <ChartConfigNumberFormat v-model="yAxisNumberFormat"/>
      </ConfigSection>
    </div>

    <!-- HEADER & TOTAL Tab -->
    <div v-show="activeTab === 'header-total'" class="space-y-4">
      <!-- Header Section -->
      <ConfigSection title="Header" v-model:expanded="sections.tableHeader">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show header</label>
            <ToggleSwitch v-model="tableSettings.showHeader"/>
          </div>
          <div v-if="tableSettings.showHeader" class="space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Background</label>
              <ChartConfigColorPicker v-model="tableSettings.headerBgColor" :show-hex="true"/>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Font</label>
              <ChartConfigFontSettings v-model="tableSettings.headerFont"/>
            </div>
          </div>
        </div>
      </ConfigSection>

      <!-- Total Section -->
      <ConfigSection title="Total Row" v-model:expanded="sections.tableTotal">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600 dark:text-gray-400">Show total row</label>
            <ToggleSwitch v-model="tableSettings.showTotal"/>
          </div>
          <div v-if="tableSettings.showTotal" class="space-y-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-600 dark:text-gray-400 w-20">Background</label>
              <ChartConfigColorPicker v-model="tableSettings.totalBgColor" :show-hex="true"/>
            </div>
            <div>
              <label class="text-xs text-gray-600 dark:text-gray-400 block mb-2">Font</label>
              <ChartConfigFontSettings v-model="tableSettings.totalFont"/>
            </div>
          </div>
        </div>
      </ConfigSection>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from 'vue'
import ChartConfigColorPicker from './ChartConfigColorPicker.vue'
import ChartConfigFontSettings from './ChartConfigFontSettings.vue'
import ChartConfigNumberFormat from './ChartConfigNumberFormat.vue'
import {useReportState} from '../../composables/useReportState'

// Props
const props = defineProps<{
  chartType: string
}>()

// Get appearance from report state
const {appearance} = useReportState()

// Initialize appearance with defaults if not set
onMounted(() => {
  if (!appearance.value) {
    appearance.value = {}
  }
  if (!appearance.value.xAxis) appearance.value.xAxis = {}
  if (!appearance.value.yAxis) appearance.value.yAxis = {}
  if (!appearance.value.table) appearance.value.table = {}
  if (!appearance.value.yAxis.numberFormat) appearance.value.yAxis.numberFormat = {}
  if (!appearance.value.yAxis.scale) appearance.value.yAxis.scale = {}
})

// Ensure default appearance object exists
const safeAppearance = computed(() => appearance.value || {})

// Create reactive references to nested objects
// These getters ensure the nested object exists and return the actual reactive reference
const xAxis = computed({
  get: () => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.xAxis) appearance.value.xAxis = {}
    return appearance.value.xAxis
  },
  set: (val) => {
    if (!appearance.value) appearance.value = {}
    appearance.value.xAxis = val
  }
})

const yAxis = computed({
  get: () => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.yAxis) appearance.value.yAxis = {}
    return appearance.value.yAxis
  },
  set: (val) => {
    if (!appearance.value) appearance.value = {}
    appearance.value.yAxis = val
  }
})

const yAxisNumberFormat = computed({
  get: () => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.yAxis) appearance.value.yAxis = {}
    if (!appearance.value.yAxis.numberFormat) appearance.value.yAxis.numberFormat = {}
    return appearance.value.yAxis.numberFormat
  },
  set: (val) => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.yAxis) appearance.value.yAxis = {}
    appearance.value.yAxis.numberFormat = val
  }
})

const yAxisScale = computed({
  get: () => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.yAxis) appearance.value.yAxis = {}
    if (!appearance.value.yAxis.scale) appearance.value.yAxis.scale = {}
    return appearance.value.yAxis.scale
  },
  set: (val) => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.yAxis) appearance.value.yAxis = {}
    appearance.value.yAxis.scale = val
  }
})

const tableSettings = computed({
  get: () => {
    if (!appearance.value) appearance.value = {}
    if (!appearance.value.table) appearance.value.table = {}
    return appearance.value.table
  },
  set: (val) => {
    if (!appearance.value) appearance.value = {}
    appearance.value.table = val
  }
})

// Tab definitions based on chart type
const availableTabs = computed(() => {
  const chartType = props.chartType

  if (chartType === 'table') {
    return [
      {id: 'table-style', label: 'TABLE STYLE'},
      {id: 'header-total', label: 'HEADER & TOTAL'}
    ]
  }

  // Non-axis charts: No X/Y axis tabs
  const nonAxisCharts = ['pie', 'donut', 'funnel', 'gauge', 'treemap', 'sankey', 'map', 'kpi', 'pivot', 'number', 'radar', 'wordcloud']
  if (nonAxisCharts.includes(chartType)) {
    return [
      {id: 'chart-area', label: 'CHART AREA'}
    ]
  }

  // Cartesian charts with axes: bar, column, line, area, scatter, stacked, bubble, boxplot, waterfall
  return [
    {id: 'chart-area', label: 'CHART AREA'},
    {id: 'x-axis', label: 'X AXIS'},
    {id: 'y-axis', label: 'Y AXIS'}
  ]
})

// Active tab
const activeTab = ref('chart-area')

// Reset active tab when chart type changes
watch(() => props.chartType, () => {
  const firstTab = availableTabs.value[0]
  if (firstTab && !availableTabs.value.find(t => t.id === activeTab.value)) {
    activeTab.value = firstTab.id
  }
}, {immediate: true})

// Chart type helpers
const isCartesianChart = computed(() => ['bar', 'column', 'line', 'area', 'scatter', 'stacked', 'bubble', 'boxplot', 'waterfall'].includes(props.chartType))
const isPieChart = computed(() => ['pie', 'donut'].includes(props.chartType))
const isTableChart = computed(() => props.chartType === 'table')

// Collapsible sections state
const sections = reactive({
  general: true,
  labels: false,
  legend: false,
  background: false,
  numberFormat: false,
  pieOptions: false,
  series: false,
  xAxisTitle: true,
  xAxisLabels: false,
  xAxisLine: false,
  yAxisTitle: true,
  yAxisLabels: false,
  yAxisNumberFormat: false,
  yAxisScale: false,
  tableGeneral: true,
  tableColors: false,
  tableOptions: false,
  tableNumberFormat: false,
  tableHeader: true,
  tableTotal: false
})

// Font families
const fontFamilies = [
  'Arial',
  'Helvetica',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans Pro',
  'Georgia',
  'Times New Roman'
]

// Legend positions
const legendPositions = [
  {value: 'left', label: 'Left'},
  {value: 'top', label: 'Top'},
  {value: 'right', label: 'Right'},
  {value: 'bottom', label: 'Bottom'}
]

// Text alignments
const textAlignments = [
  {value: 'left', label: 'Left'},
  {value: 'center', label: 'Center'},
  {value: 'right', label: 'Right'},
  {value: 'justify', label: 'Justify'}
]

// Border styles
const borderStyles = [
  {value: 'all', label: 'All'},
  {value: 'vertical', label: 'V'},
  {value: 'horizontal', label: 'H'},
  {value: 'none', label: 'None'}
]
</script>

<script lang="ts">
// Collapsible section component
import {defineComponent, h} from 'vue'

const ConfigSection = defineComponent({
  name: 'ConfigSection',
  props: {
    title: {type: String, required: true},
    expanded: {type: Boolean, default: true}
  },
  emits: ['update:expanded'],
  setup(props, {slots, emit}) {
    return () => h('div', {class: 'border rounded dark:border-gray-700 overflow-hidden'}, [
      h('button', {
        type: 'button',
        class: 'w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
        onClick: () => emit('update:expanded', !props.expanded)
      }, [
        h('span', props.title),
        h('svg', {
          class: ['w-4 h-4 transition-transform', props.expanded ? 'rotate-180' : ''],
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor'
        }, [
          h('path', {'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 9l-7 7-7-7'})
        ])
      ]),
      props.expanded ? h('div', {class: 'p-3 bg-white dark:bg-gray-900'}, slots.default?.()) : null
    ])
  }
})

// Toggle switch component
const ToggleSwitch = defineComponent({
  name: 'ToggleSwitch',
  props: {
    modelValue: {type: Boolean, default: false}
  },
  emits: ['update:modelValue'],
  setup(props, {emit}) {
    return () => h('button', {
      type: 'button',
      class: [
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        props.modelValue ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
      ],
      onClick: () => emit('update:modelValue', !props.modelValue)
    }, [
      h('span', {
        class: [
          'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
          props.modelValue ? 'translate-x-4.5' : 'translate-x-0.5'
        ],
        style: {transform: props.modelValue ? 'translateX(18px)' : 'translateX(2px)'}
      })
    ])
  }
})

export {ConfigSection, ToggleSwitch}
</script>

<style scoped>
.chart-config-editor {
  font-size: 0.875rem;
}
</style>
