/**
 * Renderer for Map charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class MapChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['map']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, yMetrics } = context

        const xKey = xDimensions?.[0]?.fieldId
        const yKey = yMetrics?.[0]?.fieldId

        if (!xKey || !yKey) {
            return {
                option: {
                    backgroundColor: this.getBackgroundColor(appearance),
                    title: {
                        text: 'Not enough data for map chart',
                        left: 'center',
                        top: 'middle'
                    }
                }
            }
        }

        const palette = this.getPalette(appearance)
        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        // Create map data - map country/region names to values
        const mapData = rows.map((row) => {
            const region = String(row[xKey] || '').toLowerCase()
            const value = Number(row[yKey]) || 0
            return { name: region, value: value }
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
                formatter: (params: any) => {
                    const formattedValue = typeof params.value === 'number'
                        ? this.formatNumber(params.value, dp, ts)
                        : params.value
                    return `${params.name}: ${formattedValue}`
                }
            },
            visualMap: {
                min: 0,
                max: Math.max(...mapData.map(item => item.value)),
                left: 'left',
                top: 'bottom',
                text: ['High', 'Low'],
                calculable: true,
                inRange: {
                    color: palette.slice(0, 5)
                }
            },
            series: [{
                name: 'Data',
                type: 'map',
                map: 'world',
                roam: true,
                emphasis: {
                    label: {
                        show: true
                    }
                },
                data: mapData
            }]
        }

        return {
            option,
            clickHandler: (params, emit) => {
                if (params.componentType === 'series' && params.seriesType === 'map') {
                    const regionName = params.name
                    const dataIndex = mapData.findIndex(item => item.name === regionName.toLowerCase())
                    if (dataIndex >= 0) {
                        const data = mapData[dataIndex]
                        emit('drill', { xValue: data.name, seriesName: 'map', datasetIndex: 0, index: dataIndex })
                    }
                }
            }
        }
    }
}
