/**
 * Renderer for Bubble charts.
 * Scatter with categorical X-axis and dynamic symbol sizes.
 * Matches original app behavior: when SIZE zone is empty, bubble size defaults to Y-axis value.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class BubbleChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['bubble']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions } = context

        const palette = this.getPalette(appearance)
        const metricAliases = this.getMetricAliases(context.columns)

        // Bubble chart: X dimension (category), Y metric (value), Size (from sizeValue zone or defaults to Y value)
        const xKey = xDimensions?.[0]?.fieldId
        const yKey = metricAliases[0]
        // Size key comes from dedicated sizeValue zone (new) or falls back to second metric
        const sizeKey = context.sizeValue?.fieldId || metricAliases[1]
        // When no size field is provided, we'll use Y-axis value for sizing (matching original app)
        const useSizeFromY = !sizeKey

        // Build bubble data with category, y value, and size
        const categories: string[] = []
        const bubbleData: { value: [number, number, number]; name: string }[] = []

        rows.forEach((row, idx) => {
            const category = xKey ? String(row[xKey] || 'Unknown') : `Item ${idx + 1}`
            const y = yKey ? Number(row[yKey]) || 0 : 0
            // If no size key provided, use Y value for size (original app behavior)
            const size = useSizeFromY ? y : (sizeKey ? Number(row[sizeKey]) || 10 : 10)

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

        // Orange/amber color matching original app
        const bubbleColor = palette[0] || '#f5a623'

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
                    // Only show size line if we have a separate size field (not using Y for size)
                    if (useSizeFromY) {
                        return `<div style="padding: 5px 10px;">${params.data.name}<br/>${yKey || 'value'}: ${yValue}</div>`
                    }
                    const sizeValueFormatted = this.formatNumber(params.data.value[2], dp, ts)
                    // Use human-readable label from sizeValue context
                    const sizeLabel = context.sizeValue?.label || context.sizeValue?.name || sizeKey || 'size'
                    return `<div style="padding: 5px 10px;">${params.data.name}<br/>${yKey || 'value'}: ${yValue}<br/>${sizeLabel}: ${sizeValueFormatted}</div>`
                }
            },
            grid: {
                left: '8%',
                right: '8%',
                top: '12%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    rotate: categories.length > 8 ? 45 : 0,
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
                    // Scale bubble size between 40 and 150 pixels based on value (larger range for visual impact)
                    const normalized = (data[2] - minSize) / (maxSize - minSize || 1)
                    return 40 + normalized * 110
                },
                itemStyle: {
                    color: bubbleColor,
                    opacity: 0.85
                },
                // Add value labels inside bubbles (matching original app)
                label: {
                    show: true,
                    position: 'inside',
                    formatter: (params: any) => {
                        return this.formatNumber(params.data.value[1], dp, ts)
                    },
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#fff'
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        shadowBlur: 10,
                        opacity: 1
                    },
                    label: {
                        show: true,
                        fontSize: 13
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
