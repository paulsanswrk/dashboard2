/**
 * Renderer for Sankey diagrams.
 * Enhanced with gradient flows, vibrant node colors, and smooth animations.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class SankeyChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['sankey']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, columns, xDimensions, yMetrics, breakdowns, isDark } = context

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
                        text: 'Need both Source and Target fields for Sankey diagram',
                        subtext: 'Drag dimension fields to Source and Target zones',
                        left: 'center',
                        top: 'middle',
                        textStyle: {
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            fontSize: 16
                        },
                        subtextStyle: {
                            color: isDark ? '#6B7280' : '#9CA3AF',
                            fontSize: 13
                        }
                    }
                }
            }
        }

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true
        const palette = this.getPalette(appearance)

        // Vibrant color palette for nodes
        const nodePalette = palette.length >= 6 ? palette : [
            '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
            '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48B8D0'
        ]

        // Create nodes and links for Sankey diagram with colors
        const nodeColorMap = new Map<string, string>()
        const nodes: Array<{ name: string; itemStyle?: { color: string } }> = []
        const links: Array<{ source: string; target: string; value: number }> = []
        let colorIndex = 0

        rows.forEach((row) => {
            const rowData = typeof row === 'object' && row !== null ? row : {}
            const source = String(rowData[sourceCol] || 'Unknown Source')
            const target = String(rowData[targetCol] || 'Unknown Target')
            const value = valueCol ? Number(rowData[valueCol]) || 1 : 1

            // Add source node with color
            if (!nodeColorMap.has(source)) {
                const color = nodePalette[colorIndex % nodePalette.length]
                nodeColorMap.set(source, color)
                nodes.push({
                    name: source,
                    itemStyle: { color }
                })
                colorIndex++
            }

            // Add target node with color
            if (!nodeColorMap.has(target)) {
                const color = nodePalette[colorIndex % nodePalette.length]
                nodeColorMap.set(target, color)
                nodes.push({
                    name: target,
                    itemStyle: { color }
                })
                colorIndex++
            }

            // Add link
            links.push({
                source,
                target,
                value
            })
        })

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: {
                text: appearance?.chartTitle || '',
                show: !!appearance?.chartTitle,
                left: 'center',
                textStyle: {
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    fontSize: 18,
                    fontWeight: 600
                },
                padding: [0, 0, 20, 0]
            },
            tooltip: {
                trigger: 'item',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? '#475569' : '#E5E7EB',
                borderWidth: 1,
                textStyle: {
                    color: isDark ? '#F1F5F9' : '#1F2937'
                },
                formatter: (params: any) => {
                    const formattedValue = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
                    if (params.dataType === 'node') {
                        const nodeColor = nodeColorMap.get(params.name) || '#5470C6'
                        return `<div style="padding: 8px 12px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${nodeColor}; margin-right: 8px;"></span>
                            <strong>${params.name}</strong>
                        </div>`
                    } else {
                        const sourceColor = nodeColorMap.get(params.data.source) || '#5470C6'
                        return `<div style="padding: 8px 12px;">
                            <div style="margin-bottom: 6px;">
                                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${sourceColor}; margin-right: 6px;"></span>
                                ${params.data.source}
                                <span style="color: #9CA3AF; margin: 0 4px;">→</span>
                                ${params.data.target}
                            </div>
                            <div style="font-size: 16px; font-weight: 600;">${formattedValue}</div>
                        </div>`
                    }
                }
            },
            series: [{
                name: 'Sankey',
                type: 'sankey',
                layoutIterations: 32,
                nodeAlign: 'justify', // Options: 'left', 'right', 'justify'
                nodeWidth: 20,
                nodeGap: 12,
                draggable: true,
                emphasis: {
                    focus: 'adjacency',
                    blurScope: 'coordinateSystem',
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.3)'
                    },
                    lineStyle: {
                        opacity: 0.85
                    }
                },
                data: nodes,
                links: links,
                itemStyle: {
                    borderWidth: 0,
                    borderRadius: 2
                },
                lineStyle: {
                    color: 'gradient', // Beautiful gradient from source to target
                    curveness: 0.5,
                    opacity: 0.4
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params: any) => params.name,
                    fontSize: 12,
                    color: isDark ? '#E5E7EB' : '#374151',
                    fontWeight: 500
                },
                levels: [
                    {
                        depth: 0,
                        itemStyle: {
                            borderRadius: 4
                        },
                        lineStyle: {
                            opacity: 0.4
                        }
                    },
                    {
                        depth: 1,
                        itemStyle: {
                            borderRadius: 4
                        },
                        lineStyle: {
                            opacity: 0.4
                        }
                    },
                    {
                        depth: 2,
                        itemStyle: {
                            borderRadius: 4
                        },
                        lineStyle: {
                            opacity: 0.4
                        }
                    }
                ]
            }],
            // Smooth animation
            animation: true,
            animationDuration: 800,
            animationEasing: 'cubicOut'
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
