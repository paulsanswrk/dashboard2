/**
 * Renderer for Radar (Spider Web) charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class RadarChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['radar']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance } = context

        const categories = this.getCategories(context.rows, context.xDimensions, context.columns)
        const series = this.getSeriesData(
            context.rows,
            context.xDimensions,
            context.breakdowns,
            context.columns,
            'radar'
        )

        const palette = this.getPalette(appearance)

        // Get dimension labels for radar indicators
        const indicators = categories.map(cat => ({ name: String(cat), max: 100 }))

        // Update max values based on actual data
        series.forEach(s => {
            (s.data as number[]).forEach((val, idx) => {
                if (typeof val === 'number' && val > (indicators[idx]?.max || 0)) {
                    indicators[idx].max = Math.ceil(val * 1.2) // Add 20% headroom
                }
            })
        })

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            legend: {
                show: appearance?.showLegend ?? true,
                data: series.map(s => s.name),
                bottom: 10
            },
            radar: {
                indicator: indicators,
                shape: 'polygon'
            },
            series: [{
                type: 'radar',
                data: series.map((s, idx) => ({
                    value: s.data,
                    name: s.name,
                    areaStyle: { opacity: 0.3 },
                    lineStyle: { color: palette[idx % palette.length] },
                    itemStyle: { color: palette[idx % palette.length] }
                }))
            }]
        }

        return { option }
    }
}
