/**
 * Shared types and interfaces for chart rendering.
 */

import type * as echarts from 'echarts'

/** Column definition from the data source */
export interface Column {
    key: string
    label: string
}

/** Report field definition (dimension or metric) */
export interface ReportField {
    fieldId: string
    name?: string
    label?: string
}

/** Font styling options */
export interface FontStyle {
    color?: string
    size?: number
    bold?: boolean
    italic?: boolean
    underline?: boolean
}

/** Number format configuration */
export interface NumberFormatConfig {
    type?: 'auto' | 'number' | 'percentage' | 'currency' | 'custom'
    prefix?: string
    suffix?: string
    separator?: 'comma' | 'space' | 'none'
    decimalPlaces?: number | 'auto'
}

/** Axis configuration */
export interface AxisConfig {
    showTitle?: boolean
    title?: string
    titleFont?: FontStyle
    showLabels?: boolean
    labelFont?: FontStyle
    allowTextWrap?: boolean
    showLine?: boolean
    lineColor?: string
    lineWidth?: number
    numberFormat?: NumberFormatConfig
    scale?: {
        min?: number | null
        max?: number | null
        interval?: number | null
    }
}

/** Full appearance configuration */
export interface AppearanceConfig {
    // General
    fontFamily?: string
    chartTitle?: string
    titlePaddingBottom?: number

    // Labels
    showLabels?: boolean
    showLabelsPercent?: boolean
    labelsInside?: boolean
    labelFont?: FontStyle

    // Legend
    showLegend?: boolean
    legendPosition?: 'top' | 'bottom' | 'left' | 'right'
    legendTitle?: string
    legendFont?: FontStyle

    // Background
    backgroundColor?: string
    backgroundTransparent?: boolean

    // Axes
    xAxis?: AxisConfig
    yAxis?: AxisConfig
    xAxisLabel?: string  // Legacy
    yAxisLabel?: string  // Legacy

    // Pie/Donut specific
    showAsDonut?: boolean
    pieInnerRadius?: number
    pieOuterRadius?: number
    pieLabelPosition?: string
    pieShowLabels?: boolean

    // General formatting
    numberFormat?: { decimalPlaces?: number; thousandsSeparator?: boolean }
    dateFormat?: string
    palette?: string[]
    stacked?: boolean
}

/** Context passed to chart renderers */
export interface ChartRenderContext {
    chartType: string
    columns: Column[]
    rows: Array<Record<string, unknown>>
    xDimensions: ReportField[]
    breakdowns: ReportField[]
    yMetrics: ReportField[]
    appearance?: AppearanceConfig
    isDark: boolean
}

/** Series data structure */
export interface SeriesData {
    name: string
    data: Array<number | { name: string; value: number }>
}

/** Result from building a chart option */
export interface ChartRenderResult {
    option: echarts.EChartsOption
    clickHandler?: (params: any, emit: ChartEmitFunction, context: ChartRenderContext) => void
}

/** Emit function type for drill events */
export type ChartEmitFunction = (event: 'drill', payload: {
    xValue: string | number
    seriesName?: string
    datasetIndex: number
    index: number
}) => void
