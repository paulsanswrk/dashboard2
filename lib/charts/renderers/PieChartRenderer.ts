/**
 * Renderer for Pie and Donut charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class PieChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['pie', 'donut']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { chartType, appearance, isDark } = context
        const isDonut = chartType === 'donut'

        const categories = this.getCategories(context.rows, context.xDimensions, context.columns)
        const series = this.getSeriesData(
            context.rows,
            context.xDimensions,
            context.breakdowns,
            context.columns,
            chartType
        )

        const s = series[0] || { name: 'Value', data: [] }
        const palette = this.getPalette(appearance).slice(0, categories.length)

        const innerRadius = appearance?.pieInnerRadius ?? (isDonut ? 45 : 0)
        const outerRadius = appearance?.pieOuterRadius ?? (isDonut ? 75 : 70)
        const pieRadius = isDonut
            ? [`${innerRadius}%`, `${outerRadius}%`]
            : `${outerRadius}%`
        const labelPosition = appearance?.pieLabelPosition || 'outside'
        const showLabels = appearance?.pieShowLabels ?? true
        const labelColor = this.getLabelColor(isDark)

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        const option = {
            title: this.buildTitleConfig(appearance),
            tooltip: {
                trigger: 'item',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const value = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
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
                name: appearance?.legendTitle || s.name,
                type: 'pie',
                radius: pieRadius,
                center: ['50%', '45%'],
                data: Array.isArray(s.data) && s.data.length > 0 && typeof s.data[0] === 'object' && (s.data[0] as any).name
                    ? (s.data as any[]).map((item: any, idx: number) => ({
                        name: item.name,
                        value: item.value,
                        itemStyle: { color: palette[idx % palette.length] }
                    }))
                    : categories.map((cat, idx) => ({
                        name: cat,
                        value: (s.data as number[])[idx] || 0,
                        itemStyle: { color: palette[idx % palette.length] }
                    })),
                label: {
                    show: showLabels,
                    position: labelPosition,
                    color: labelColor,
                    textBorderColor: 'transparent',
                    textBorderWidth: 0,
                    formatter: (params: any) => {
                        const value = typeof params.value === 'number'
                            ? this.formatNumber(params.value, dp, ts)
                            : params.value
                        return labelPosition === 'inside'
                            ? `${params.name}\n${value}`
                            : `${params.name}: ${value}`
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

        return {
            option,
            clickHandler: (params, emit, ctx) => {
                if (params.componentType === 'series' && params.seriesType === 'pie') {
                    const dataIndex = params.dataIndex
                    const xValue = categories[dataIndex]
                    emit('drill', { xValue, datasetIndex: 0, index: dataIndex })
                }
            }
        }
    }
}
