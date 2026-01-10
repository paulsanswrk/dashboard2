/**
 * Renderer for Treemap charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class TreemapChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['treemap']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, columns, xDimensions, breakdowns } = context

        const xKey = xDimensions?.[0]?.fieldId
        const breakdownKey = breakdowns?.[0]?.fieldId

        // Fallback for SQL-based charts
        const categoryCol = xKey || (columns.length > 0 ? columns[0].key : null)
        const sizeCol = breakdownKey || (columns.length > 1 ? columns[1].key : null)

        if (!categoryCol) {
            return {
                option: {
                    backgroundColor: this.getBackgroundColor(appearance),
                    title: {
                        text: 'Need at least category data for treemap',
                        left: 'center',
                        top: 'middle'
                    }
                }
            }
        }

        const palette = this.getPalette(appearance)
        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Create hierarchical treemap data
        const treemapData: any[] = []
        const processedItems = new Set<string>()

        rows.forEach((row) => {
            const rowData = typeof row === 'object' && row !== null ? row : {}
            const category = String(rowData[categoryCol] || 'Unknown')
            const size = sizeCol ? Number(rowData[sizeCol]) || 0 : 1

            if (!processedItems.has(category)) {
                treemapData.push({
                    name: category,
                    value: size,
                    itemStyle: {
                        color: palette[treemapData.length % palette.length]
                    }
                })
                processedItems.add(category)
            } else {
                // Update existing item value
                const existing = treemapData.find(item => item.name === category)
                if (existing) {
                    existing.value += size
                }
            }
        })

        const option = {
            title: {
                text: appearance?.chartTitle || '',
                show: !!appearance?.chartTitle,
                left: 'center',
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'item',
                confine: true,
                position: 'top',
                renderMode: 'html',
                appendToBody: true,
                formatter: (params: any) => {
                    const formattedValue = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
                    return `<div style="padding: 5px 10px;">${params.name}: ${formattedValue}</div>`
                }
            },
            series: [{
                name: 'Treemap',
                type: 'treemap',
                data: treemapData,
                roam: true,
                nodeClick: false,
                breadcrumb: {
                    show: false
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2,
                    gapWidth: 2
                },
                label: {
                    show: true,
                    formatter: (params: any) => {
                        const formattedValue = typeof params.value === 'number'
                            ? this.formatNumber(params.value, dp, ts)
                            : params.value
                        return `${params.name}\n${formattedValue}`
                    }
                },
                emphasis: {
                    itemStyle: {
                        borderColor: '#333',
                        borderWidth: 3
                    }
                }
            }]
        }

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'treemap') {
                    const nodeName = params.name
                    const dataIndex = treemapData.findIndex(item => item.name === nodeName)
                    if (dataIndex >= 0) {
                        const data = treemapData[dataIndex]
                        emit('drill', { xValue: data.name, seriesName: 'treemap', datasetIndex: 0, index: dataIndex })
                    }
                }
            }
        }
    }
}
