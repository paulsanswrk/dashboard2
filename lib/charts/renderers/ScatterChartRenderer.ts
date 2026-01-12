/**
 * Renderer for Scatter charts.
 * 
 * Supports both numeric X-axis and categorical X-axis (dimensions).
 * When X-axis is a dimension (text), uses category type with indexed positions.
 * Supports breakdowns - creates separate colored series for each breakdown value.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class ScatterChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['scatter']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, breakdowns, columns } = context

        const palette = this.getPalette(appearance)
        const metricAliases = this.getMetricAliases(columns)

        // X dimension is the category, Y metric is the value
        const xKey = xDimensions?.[0]?.fieldId
        const yKey = metricAliases[0]
        const breakdownKey = breakdowns?.[0]?.fieldId
        const breakdownLabel = breakdowns?.[0]?.label || breakdowns?.[0]?.name || breakdownKey

        if (!xKey || !yKey) {
            return { option: this.buildEmptyOption(appearance) }
        }

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Build categories (unique X values)
        const categories: string[] = []
        rows.forEach((row) => {
            const category = String(row[xKey] || '')
            if (category && !categories.includes(category)) {
                categories.push(category)
            }
        })

        // If we have a breakdown, group data by breakdown value
        const hasBreakdown = !!breakdownKey
        const seriesMap = new Map<string, { value: [number, number]; name: string; breakdown: string }[]>()

        rows.forEach((row, idx) => {
            const category = String(row[xKey] || `Item ${idx + 1}`)
            const y = yKey ? Number(row[yKey]) || 0 : 0
            const breakdownValue = hasBreakdown ? String(row[breakdownKey] ?? 'Unknown') : 'Data Points'

            let catIndex = categories.indexOf(category)
            if (catIndex === -1) {
                categories.push(category)
                catIndex = categories.length - 1
            }

            if (!seriesMap.has(breakdownValue)) {
                seriesMap.set(breakdownValue, [])
            }

            seriesMap.get(breakdownValue)!.push({
                value: [catIndex, y],
                name: category,
                breakdown: breakdownValue
            })
        })

        if (seriesMap.size === 0) {
            return { option: this.buildEmptyOption(appearance) }
        }

        const isDark = context.isDark
        const seriesNames = Array.from(seriesMap.keys())

        // Build series - one per breakdown value
        const series = seriesNames.map((seriesName, idx) => {
            const data = seriesMap.get(seriesName)!
            return {
                name: seriesName,
                type: 'scatter' as const,
                data: data,
                symbolSize: 20,
                itemStyle: {
                    color: palette[idx % palette.length]
                },
                emphasis: {
                    focus: 'series' as const,
                    itemStyle: {
                        borderWidth: 2,
                        borderColor: '#fff'
                    }
                },
                label: {
                    show: appearance?.showLabels ?? false,
                    position: 'top' as const,
                    formatter: (params: any) => this.formatNumber(params.data.value[1], dp, ts),
                    color: isDark ? '#fff' : '#333'
                }
            }
        })

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            tooltip: {
                trigger: 'item',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const yFormatted = this.formatNumber(params.data.value[1], dp, ts)
                    const breakdownInfo = hasBreakdown
                        ? `<br/>${breakdownLabel}: <strong>${params.data.breakdown}</strong>`
                        : ''
                    return `<div style="padding: 5px 10px;">
                        <strong>${params.data.name}</strong>${breakdownInfo}<br/>
                        ${yKey || 'Value'}: ${yFormatted}
                    </div>`
                }
            },
            legend: this.buildLegendConfig(seriesNames, appearance),
            grid: {
                left: appearance?.legendPosition === 'left' ? '15%' : '8%',
                right: appearance?.legendPosition === 'right' ? '15%' : '8%',
                top: '12%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: categories,
                name: appearance?.xAxisLabel || xDimensions?.[0]?.label || '',
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: {
                    color: isDark ? '#ccc' : '#666',
                    interval: 0,
                    rotate: categories.length > 5 ? 30 : 0
                },
                axisLine: {
                    show: true,
                    lineStyle: { color: isDark ? '#555' : '#ccc' }
                }
            },
            yAxis: {
                type: 'value',
                name: appearance?.yAxisLabel || '',
                nameLocation: 'middle',
                nameGap: 50,
                axisLabel: {
                    color: isDark ? '#ccc' : '#666',
                    formatter: (value: number) => this.formatNumber(value, dp, ts)
                },
                axisLine: {
                    show: true,
                    lineStyle: { color: isDark ? '#555' : '#ccc' }
                },
                splitLine: {
                    lineStyle: { color: isDark ? '#333' : '#eee' }
                }
            },
            series: series
        }

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'scatter') {
                    const dataIndex = params.dataIndex
                    const seriesIndex = params.seriesIndex
                    const seriesName = seriesNames[seriesIndex || 0]
                    const data = seriesMap.get(seriesName)?.[dataIndex]
                    const xValue = data?.name || ''
                    emit('drill', { xValue, seriesName, datasetIndex: seriesIndex || 0, index: dataIndex })
                }
            }
        }
    }

    private buildEmptyOption(appearance?: any) {
        return {
            backgroundColor: this.getBackgroundColor(appearance),
            title: {
                text: 'Add fields to X-Axis and Y-Axis',
                left: 'center',
                top: 'middle',
                textStyle: {
                    color: '#999',
                    fontSize: 14
                }
            }
        }
    }
}
