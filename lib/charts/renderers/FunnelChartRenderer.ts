/**
 * Renderer for Funnel charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class FunnelChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['funnel']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, columns, xDimensions, yMetrics } = context

        const xKey = xDimensions?.[0]?.fieldId
        const yKey = yMetrics?.[0]?.fieldId

        // Fallback for SQL-based charts
        const nameCol = xKey || (columns.length > 0 ? columns[0].key : null)
        const valueCol = yKey || (columns.length > 1 ? columns[1].key : columns[0]?.key)

        if (!nameCol || !valueCol || !rows.length) {
            return { option: this.buildEmptyOption(appearance) }
        }

        const palette = this.getPalette(appearance)
        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Create funnel data - sort by value descending for proper funnel shape
        const funnelData = rows
            .map((row, index) => {
                const rowData = typeof row === 'object' && row !== null ? row : {}
                const nameValue = rowData[nameCol]
                const valueValue = rowData[valueCol]

                return {
                    name: nameValue != null ? String(nameValue) : `Stage ${index + 1}`,
                    value: valueValue != null ? Number(valueValue) : 0
                }
            })
            .sort((a, b) => b.value - a.value)

        const option = {
            title: this.buildTitleConfig(appearance),
            tooltip: {
                trigger: 'item',
                confine: true,
                appendToBody: true,
                renderMode: 'html',
                formatter: (params: any) => {
                    const formattedValue = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
                    return `<div style="padding: 5px 10px;">${params.name}: ${formattedValue}</div>`
                }
            },
            legend: {
                show: true,
                data: funnelData.map(item => item.name),
                bottom: '15%',
                left: 'center',
                orient: 'horizontal',
                padding: [5, 0, 5, 0]
            },
            series: [{
                name: 'Funnel',
                type: 'funnel',
                left: '5%',
                top: 60 + (appearance?.titlePaddingBottom ?? 0),
                bottom: '30%',
                width: '90%',
                min: 0,
                max: funnelData.length > 0 ? funnelData[0].value : 100,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                data: funnelData,
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'inside',
                    formatter: (params: any) => {
                        const formattedValue = typeof params.value === 'number'
                            ? this.formatNumber(params.value, dp, ts)
                            : params.value
                        return `${params.name}: ${formattedValue}`
                    }
                },
                emphasis: {
                    label: {
                        fontSize: 20
                    }
                }
            }]
        }

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'funnel') {
                    const dataIndex = params.dataIndex
                    const data = funnelData[dataIndex]
                    emit('drill', { xValue: data.name, seriesName: 'funnel', datasetIndex: 0, index: dataIndex })
                }
            }
        }
    }

    private buildEmptyOption(appearance?: any) {
        return {
            backgroundColor: this.getBackgroundColor(appearance),
            title: {
                text: 'No data available',
                left: 'center',
                top: 'middle'
            }
        }
    }
}
