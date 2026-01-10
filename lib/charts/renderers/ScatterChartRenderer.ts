/**
 * Renderer for Scatter charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class ScatterChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['scatter']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, yMetrics } = context

        const xKey = xDimensions?.[0]?.fieldId
        const yKey = yMetrics?.[0]?.fieldId

        if (!xKey || !yKey) {
            return { option: this.buildEmptyOption(appearance) }
        }

        const palette = this.getPalette(appearance)
        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Create scatter data points
        const scatterData = rows.map((row) => {
            const x = Number(row[xKey]) || 0
            const y = Number(row[yKey]) || 0
            return [x, y]
        })

        const option = {
            title: this.buildTitleConfig(appearance),
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const xFormatted = typeof params.data[0] === 'number'
                        ? this.formatNumber(params.data[0], dp, ts)
                        : params.data[0]
                    const yFormatted = typeof params.data[1] === 'number'
                        ? this.formatNumber(params.data[1], dp, ts)
                        : params.data[1]
                    return `X: ${xFormatted}<br/>Y: ${yFormatted}`
                }
            },
            legend: {
                show: true,
                data: ['Data Points']
            },
            xAxis: {
                type: 'value',
                name: appearance?.xAxisLabel || xDimensions?.[0]?.label || 'X Values',
                nameLocation: 'middle',
                nameGap: 30
            },
            yAxis: {
                type: 'value',
                name: appearance?.yAxisLabel || yMetrics?.[0]?.label || 'Y Values',
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

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'scatter') {
                    const dataIndex = params.dataIndex
                    const point = scatterData[dataIndex]
                    const xValue = point[0]
                    emit('drill', { xValue, seriesName: 'scatter', datasetIndex: 0, index: dataIndex })
                }
            }
        }
    }

    private buildEmptyOption(appearance?: any) {
        return {
            backgroundColor: this.getBackgroundColor(appearance),
            title: {
                text: 'Not enough data for scatter plot',
                left: 'center',
                top: 'middle'
            }
        }
    }
}
