/**
 * Renderer for Bubble charts.
 * Scatter with categorical X-axis and dynamic symbol sizes.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class BubbleChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['bubble']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, breakdowns } = context

        const palette = this.getPalette(appearance)
        const metricAliases = this.getMetricAliases(context.columns)

        // Bubble chart: X dimension (category), Y metric (value), Size (from breakdowns or second metric)
        const xKey = xDimensions?.[0]?.fieldId
        const yKey = metricAliases[0]
        const sizeKey = breakdowns?.[0]?.fieldId || metricAliases[1]

        // Build bubble data with category, y value, and size
        const categories: string[] = []
        const bubbleData: { value: [number, number, number]; name: string }[] = []

        rows.forEach((row, idx) => {
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
            return {
                option: {
                    backgroundColor: this.getBackgroundColor(appearance),
                    title: {
                        text: 'No data available',
                        left: 'center',
                        top: 'middle'
                    }
                }
            }
        }

        // Calculate symbol sizes based on the size values
        const maxSize = Math.max(...bubbleData.map(d => d.value[2]), 1)
        const minSize = Math.min(...bubbleData.map(d => d.value[2]), 1)

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            tooltip: {
                trigger: 'item',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const yValue = this.formatNumber(params.data.value[1], dp, ts)
                    const sizeValue = this.formatNumber(params.data.value[2], dp, ts)
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
                    formatter: (value: number) => this.formatNumber(value, dp, ts)
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

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series') {
                    emit('drill', { xValue: params.data.name, seriesName: 'bubble', datasetIndex: 0, index: params.dataIndex })
                }
            }
        }
    }
}
