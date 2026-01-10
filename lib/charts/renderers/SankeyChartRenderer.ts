/**
 * Renderer for Sankey diagrams.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class SankeyChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['sankey']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, columns, xDimensions, yMetrics, breakdowns } = context

        const xKey = xDimensions?.[0]?.fieldId
        const yKey = yMetrics?.[0]?.fieldId
        const breakdownKey = breakdowns?.[0]?.fieldId

        // Fallback for SQL-based charts
        const sourceCol = xKey || (columns.length > 0 ? columns[0].key : null)
        const targetCol = yKey || (columns.length > 1 ? columns[1].key : null)
        const valueCol = breakdownKey || (columns.length > 2 ? columns[2].key : null)

        if (!sourceCol || !targetCol) {
            return {
                option: {
                    backgroundColor: this.getBackgroundColor(appearance),
                    title: {
                        text: 'Need both source and target data for Sankey diagram',
                        left: 'center',
                        top: 'middle'
                    }
                }
            }
        }

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Create nodes and links for Sankey diagram
        const nodes = new Map<string, { name: string }>()
        const links: any[] = []

        rows.forEach((row) => {
            const rowData = typeof row === 'object' && row !== null ? row : {}
            const source = String(rowData[sourceCol] || 'Unknown Source')
            const target = String(rowData[targetCol] || 'Unknown Target')
            const value = valueCol ? Number(rowData[valueCol]) || 1 : 1

            // Add nodes
            if (!nodes.has(source)) {
                nodes.set(source, { name: source })
            }
            if (!nodes.has(target)) {
                nodes.set(target, { name: target })
            }

            // Add link
            links.push({
                source: source,
                target: target,
                value: value
            })
        })

        const nodeArray = Array.from(nodes.values())

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
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const formattedValue = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
                    if (params.dataType === 'node') {
                        return `<div style="padding: 5px 10px;">${params.name}</div>`
                    } else {
                        return `<div style="padding: 5px 10px;">${params.data.source} → ${params.data.target}: ${formattedValue}</div>`
                    }
                }
            },
            series: [{
                name: 'Sankey',
                type: 'sankey',
                layout: 'none',
                emphasis: {
                    focus: 'adjacency'
                },
                data: nodeArray,
                links: links,
                itemStyle: {
                    borderWidth: 0,
                    borderColor: '#aaa'
                },
                lineStyle: {
                    color: 'source',
                    curveness: 0.5
                },
                label: {
                    show: true,
                    position: 'inside',
                    formatter: (params: any) => params.name,
                    fontSize: 12
                }
            }]
        }

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'sankey') {
                    if (params.dataType === 'node') {
                        emit('drill', { xValue: params.name, seriesName: 'sankey', datasetIndex: 0, index: 0 })
                    } else if (params.dataType === 'edge') {
                        const link = params.data
                        emit('drill', { xValue: `${link.source} → ${link.target}`, seriesName: 'sankey', datasetIndex: 0, index: 0 })
                    }
                }
            }
        }
    }
}
