/**
 * Renderer for Pivot Table charts.
 * Uses heatmap-style visualization for cross-tabulation.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class PivotChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['pivot']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, breakdowns } = context

        const xKey = xDimensions?.[0]?.fieldId
        const breakdownKey = breakdowns?.[0]?.fieldId
        const metricAliases = this.getMetricAliases(context.columns)
        const firstMetric = metricAliases[0]

        if (!firstMetric || rows.length === 0) {
            return {
                option: {
                    backgroundColor: this.getBackgroundColor(appearance),
                    title: {
                        text: 'Pivot Table',
                        subtext: 'Add columns, rows, and values to create a pivot table',
                        left: 'center',
                        top: 'middle',
                        textStyle: {
                            fontSize: 20
                        },
                        subtextStyle: {
                            fontSize: 14,
                            color: '#666'
                        }
                    }
                }
            }
        }

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Build pivot data structure
        const colValues = new Set<string>()
        const rowValues = new Set<string>()
        const pivotData = new Map<string, Map<string, number>>()

        rows.forEach((row) => {
            const colVal = xKey ? String(row[xKey] || 'Total') : 'Total'
            const rowVal = breakdownKey ? String(row[breakdownKey] || 'Total') : 'Total'
            const metricVal = Number(row[firstMetric]) || 0

            colValues.add(colVal)
            rowValues.add(rowVal)

            if (!pivotData.has(rowVal)) {
                pivotData.set(rowVal, new Map())
            }
            const rowMap = pivotData.get(rowVal)!
            rowMap.set(colVal, (rowMap.get(colVal) || 0) + metricVal)
        })

        const colArray = Array.from(colValues)
        const rowArray = Array.from(rowValues)

        // Create heatmap-style pivot visualization
        const heatmapData: [number, number, number][] = []
        let maxVal = 0

        rowArray.forEach((rowVal, rowIdx) => {
            const rowMap = pivotData.get(rowVal)
            colArray.forEach((colVal, colIdx) => {
                const value = rowMap?.get(colVal) || 0
                heatmapData.push([colIdx, rowIdx, value])
                maxVal = Math.max(maxVal, value)
            })
        })

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            tooltip: {
                position: 'top',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const value = this.formatNumber(params.data[2], dp, ts)
                    return `<div style="padding: 5px 10px;">${rowArray[params.data[1]]} / ${colArray[params.data[0]]}: ${value}</div>`
                }
            },
            grid: {
                left: '15%',
                right: '10%',
                top: '10%',
                bottom: '25%'
            },
            xAxis: {
                type: 'category',
                data: colArray,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    rotate: colArray.length > 5 ? 45 : 0
                }
            },
            yAxis: {
                type: 'category',
                data: rowArray,
                splitArea: {
                    show: true
                }
            },
            visualMap: {
                min: 0,
                max: maxVal || 100,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 5,
                inRange: {
                    color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
                }
            },
            series: [{
                name: 'Pivot',
                type: 'heatmap',
                data: heatmapData,
                label: {
                    show: true,
                    formatter: (params: any) => this.formatNumber(params.data[2], dp, ts)
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        }

        return { option }
    }
}
