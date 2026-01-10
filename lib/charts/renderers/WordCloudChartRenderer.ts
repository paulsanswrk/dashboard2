/**
 * Renderer for Word Cloud charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class WordCloudChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['wordcloud']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, rows, xDimensions } = context

        const palette = this.getPalette(appearance)
        const metricAliases = this.getMetricAliases(context.columns)
        const categories = this.getCategories(rows, xDimensions, context.columns)
        const series = this.getSeriesData(rows, xDimensions, context.breakdowns, context.columns, 'wordcloud')

        // Build word cloud data from categories and values
        const wordcloudData: { name: string; value: number }[] = []
        const xKey = xDimensions?.[0]?.fieldId
        const yKey = metricAliases[0]

        if (xKey && yKey) {
            rows.forEach(row => {
                const name = String(row[xKey] || '')
                const value = Number(row[yKey]) || 1
                if (name) {
                    wordcloudData.push({ name, value })
                }
            })
        } else {
            // Fallback: use categories with uniform values
            categories.forEach((cat, idx) => {
                const val = series[0]?.data[idx]
                wordcloudData.push({
                    name: String(cat),
                    value: typeof val === 'number' ? val : 10
                })
            })
        }

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: this.buildTitleConfig(appearance),
            series: [{
                type: 'wordCloud',
                shape: 'circle',
                left: 'center',
                top: 60 + (appearance?.titlePaddingBottom ?? 0),
                width: '80%',
                height: '80%',
                rotationRange: [-45, 45],
                rotationStep: 15,
                sizeRange: [14, 60],
                gridSize: 8,
                drawOutOfBound: false,
                textStyle: {
                    fontFamily: appearance?.fontFamily || 'Arial',
                    color: () => palette[Math.floor(Math.random() * palette.length)]
                },
                emphasis: {
                    textStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.3)'
                    }
                },
                data: wordcloudData
            }]
        }

        return { option }
    }
}
