/**
 * Renderer for Box Plot charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class BoxPlotChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['boxplot']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions } = context

        const palette = this.getPalette(appearance)
        const metricAliases = this.getMetricAliases(context.columns)

        // Group data by category
        const boxplotData: number[][] = []
        const categoryMap = new Map<string, number[]>()

        const xKey = xDimensions?.[0]?.fieldId
        const yKey = metricAliases[0]

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

        const option = {
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
                itemStyle: { color: palette[0], borderColor: palette[1] || '#333' }
            }]
        }

        return { option }
    }
}
