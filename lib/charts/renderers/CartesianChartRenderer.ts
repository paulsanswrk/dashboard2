/**
 * Renderer for Cartesian charts: bar, column, line, area, stacked.
 * (Waterfall is handled separately due to its unique stacking logic)
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class CartesianChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['bar', 'column', 'line', 'area', 'stacked']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { chartType, appearance } = context

        const categories = this.getCategories(context.rows, context.xDimensions, context.columns)
        const series = this.getSeriesData(
            context.rows,
            context.xDimensions,
            context.breakdowns,
            context.columns,
            chartType
        )

        const palette = this.getPalette(appearance)

        // Determine chart type for rendering
        // 'bar' is now horizontal, 'column' is vertical
        const isHorizontalBar = chartType === 'bar'
        const echartsType = chartType === 'line' || chartType === 'area' ? 'line' : 'bar'

        // Create series configurations
        const seriesConfig = series.map((s, idx) => {
            const color = palette[idx % palette.length]
            let baseConfig: any = {
                name: s.name,
                type: echartsType,
                data: s.data,
                itemStyle: { color },
                emphasis: {
                    focus: 'series'
                }
            }

            if (echartsType === 'line') {
                baseConfig.smooth = false
                baseConfig.symbol = 'circle'
                baseConfig.symbolSize = 6
                baseConfig.lineStyle = { width: 2 }

                // Add area style for area charts
                if (chartType === 'area') {
                    baseConfig.areaStyle = { opacity: 0.6 }
                }
            } else {
                baseConfig.barWidth = '60%'
            }

            // Apply per-series overrides from series options panel
            baseConfig = this.applySeriesOverrides(baseConfig, s.name, appearance, palette, idx)

            return baseConfig
        })

        // Axis and legend settings
        const xAxisSettings = appearance?.xAxis || {}
        const yAxisSettings = appearance?.yAxis || {}
        const showLegend = appearance?.showLegend ?? true
        const legendFont = this.getFontStyle(appearance?.legendFont)

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true
        const prefix = appearance?.yAxis?.numberFormat?.prefix || ''
        const suffix = appearance?.yAxis?.numberFormat?.suffix || ''

        const option: any = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
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
                        const value = typeof param.value === 'number'
                            ? `${prefix}${this.formatNumber(param.value, dp, ts)}${suffix}`
                            : param.value
                        result += `${param.seriesName}: ${value}<br/>`
                    })
                    result += '</div>'
                    return result
                }
            },
            legend: {
                show: showLegend,
                data: series.map(s => s.name),
                top: appearance?.legendPosition === 'top' ? 'top' :
                    appearance?.legendPosition === 'left' || appearance?.legendPosition === 'right' ? 'middle' : 'bottom',
                left: appearance?.legendPosition === 'left' ? 'left' :
                    appearance?.legendPosition === 'right' ? 'right' : 'center',
                orient: appearance?.legendPosition === 'left' || appearance?.legendPosition === 'right' ? 'vertical' : 'horizontal',
                textStyle: legendFont
            },
            grid: this.buildGridConfig(appearance),
            xAxis: {
                type: 'category',
                boundaryGap: echartsType === 'bar',
                data: categories,
                name: xAxisSettings.showTitle !== false ? (xAxisSettings.title || appearance?.xAxisLabel || '') : '',
                nameLocation: 'middle',
                nameGap: 30,
                nameTextStyle: this.getFontStyle(xAxisSettings.titleFont),
                axisLabel: {
                    show: xAxisSettings.showLabels !== false,
                    ...this.getFontStyle(xAxisSettings.labelFont),
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
                name: yAxisSettings.showTitle !== false ? (yAxisSettings.title || appearance?.yAxisLabel || '') : '',
                nameLocation: 'middle',
                nameGap: 70,
                nameTextStyle: this.getFontStyle(yAxisSettings.titleFont),
                min: yAxisSettings.scale?.min ?? 0,
                max: yAxisSettings.scale?.max ?? undefined,
                interval: yAxisSettings.scale?.interval ?? undefined,
                axisLabel: {
                    show: yAxisSettings.showLabels !== false,
                    ...this.getFontStyle(yAxisSettings.labelFont),
                    formatter: (value: number) => `${prefix}${this.formatNumber(value, dp, ts)}${suffix}`
                }
            },
            series: seriesConfig
        }

        // Add data labels if enabled
        if (appearance?.showLabels) {
            const labelFont = this.getFontStyle(appearance?.labelFont)
            seriesConfig.forEach((s: any) => {
                s.label = {
                    show: true,
                    position: appearance?.labelsInside ? 'inside' : 'top',
                    ...labelFont,
                    formatter: (params: any) => {
                        if (params.value === 0 || params.value === null || params.value === undefined) {
                            return ''
                        }
                        return `${prefix}${this.formatNumber(params.value, dp, ts)}${suffix}`
                    }
                }
            })
        }

        // Handle stacking if needed
        if (appearance?.stacked || chartType === 'stacked') {
            if (echartsType === 'line') {
                option.xAxis.boundaryGap = false
            }
            seriesConfig.forEach((s: any) => {
                s.stack = 'total'
            })
        }

        // Check if any series uses secondary axis and add it if needed
        const hasSecondaryAxis = seriesConfig.some((s: any) => s.yAxisIndex === 1)
        if (hasSecondaryAxis) {
            // Convert yAxis to array with primary and secondary axes
            const primaryAxis = option.yAxis
            option.yAxis = [
                primaryAxis,
                {
                    type: 'value',
                    name: '',
                    nameLocation: 'middle',
                    nameGap: 70,
                    position: 'right',
                    axisLabel: {
                        show: yAxisSettings.showLabels !== false,
                        ...this.getFontStyle(yAxisSettings.labelFont),
                        formatter: (value: number) => `${prefix}${this.formatNumber(value, dp, ts)}${suffix}`
                    },
                    splitLine: { show: false }
                }
            ]
        }

        // Handle horizontal bar chart - swap x and y axes
        if (isHorizontalBar) {
            const tempAxis = option.xAxis
            option.xAxis = { ...option.yAxis, type: 'value' }
            option.yAxis = { ...tempAxis, type: 'category', data: categories }
        }

        return {
            option,
            clickHandler: (params, emit, ctx) => {
                if (params.componentType === 'series') {
                    const xValue = categories[params.dataIndex]
                    const seriesName = params.seriesName
                    const datasetIndex = series.findIndex(s => s.name === seriesName)
                    emit('drill', { xValue, seriesName, datasetIndex, index: params.dataIndex })
                }
            }
        }
    }
}
