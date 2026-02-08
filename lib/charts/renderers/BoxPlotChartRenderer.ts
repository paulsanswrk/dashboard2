/**
 * Renderer for Box Plot charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class BoxPlotChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['boxplot']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions, yMetrics } = context

        const palette = this.getPalette(appearance)

        // Resolve metric column key — box plots receive raw (non-aggregated) data,
        // so the column key is the plain fieldId rather than an agg-prefixed alias.
        const columnKeys = context.columns.map(c => c.key)
        const rawFieldId = yMetrics?.[0]?.fieldId
        let yKey: string | undefined
        if (rawFieldId && columnKeys.includes(rawFieldId)) {
            // Best case: raw fieldId matches a column directly (skipAggregation path)
            yKey = rawFieldId
        } else {
            // Fallback: try aggregation-prefixed alias, then first non-dimension column
            const metricAliases = this.getMetricAliases(context.columns)
            const dimKeys = new Set((xDimensions || []).map(d => d.fieldId))
            yKey = metricAliases[0] || columnKeys.find(k => !dimKeys.has(k))
        }

        // Group data by category
        const boxplotData: number[][] = []
        const categoryMap = new Map<string, number[]>()
        const xKey = xDimensions?.[0]?.fieldId

        rows.forEach(row => {
            const cat = xKey ? String(row[xKey] || 'Unknown') : 'Data'
            const val = yKey ? Number(row[yKey]) || 0 : 0
            if (!categoryMap.has(cat)) {
                categoryMap.set(cat, [])
            }
            categoryMap.get(cat)!.push(val)
        })

        const categories: string[] = []
        categoryMap.forEach((values, cat) => {
            categories.push(cat)
            values.sort((a, b) => a - b)
            const min = values[0] || 0
            const max = values[values.length - 1] || 0
            const q1 = values[Math.floor(values.length * 0.25)] || 0
            const median = values[Math.floor(values.length * 0.5)] || 0
            const q3 = values[Math.floor(values.length * 0.75)] || 0
            boxplotData.push([min, q1, median, q3, max])
        })

        const option: Record<string, any> = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            xAxis: { type: 'category', data: categories },
            yAxis: { type: 'value' },
            grid: {
                top: 60 + (appearance?.titlePaddingBottom ?? 0),
                bottom: '15%'
            },
            series: [{
                type: 'boxplot',
                data: boxplotData,
                itemStyle: { color: palette[0], borderColor: palette[1] || '#333' },
                // ECharts boxplot does NOT support label — use markPoint for data labels
                ...(appearance?.showLabels ? {
                    markPoint: {
                        symbol: 'circle',
                        symbolSize: 0,
                        data: boxplotData.map((item, idx) => ({
                            name: `median-${idx}`,
                            coord: [idx, item[4]],  // position at max whisker
                            value: item[2],          // display median value
                            itemStyle: { color: 'transparent' },
                            label: {
                                show: true,
                                position: 'top',
                                formatter: '{c}',
                                fontSize: 12,
                                color: '#333'
                            }
                        }))
                    }
                } : {})
            }],
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const v = params.value || params.data?.value || []
                    if (Array.isArray(v) && v.length >= 5) {
                        return `<div style="padding:4px 8px">${params.name}<br/>Max: ${v[4]}<br/>Q3: ${v[3]}<br/>Median: ${v[2]}<br/>Q1: ${v[1]}<br/>Min: ${v[0]}</div>`
                    }
                    return ''
                }
            }
        }

        return { option }
    }
}
