/**
 * Renderer for Waterfall charts.
 * Uses stacked bar technique with transparent base bars.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class WaterfallChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['waterfall']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance } = context

        const categories = this.getCategories(context.rows, context.xDimensions, context.columns)
        const series = this.getSeriesData(
            context.rows,
            context.xDimensions,
            context.breakdowns,
            context.columns,
            'waterfall'
        )

        const palette = this.getPalette(appearance)

        const values: number[] = []
        const transparentValues: number[] = []
        let runningTotal = 0

        const sourceData = series[0]?.data || []
        sourceData.forEach((val) => {
            const numVal = Number(val) || 0
            if (numVal >= 0) {
                transparentValues.push(runningTotal)
                values.push(numVal)
            } else {
                transparentValues.push(runningTotal + numVal)
                values.push(Math.abs(numVal))
            }
            runningTotal += numVal
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
            series: [
                {
                    type: 'bar',
                    stack: 'waterfall',
                    itemStyle: { opacity: 0 },
                    data: transparentValues
                },
                {
                    type: 'bar',
                    stack: 'waterfall',
                    data: values.map((val, idx) => ({
                        value: val,
                        itemStyle: {
                            color: (Number(sourceData[idx]) >= 0)
                                ? (palette[0] || '#22c55e')
                                : (palette[1] || '#ef4444')
                        }
                    })),
                    label: {
                        show: appearance?.showLabels ?? false,
                        position: appearance?.labelsInside ? 'inside' : 'top',
                        ...this.getFontStyle(appearance?.labelFont),
                        formatter: (params: any) => {
                            const val = Number(sourceData[params.dataIndex])
                            if (val === 0 || val === null || val === undefined) return ''
                            const dp = appearance?.numberFormat?.decimalPlaces ?? 0
                            const ts = appearance?.numberFormat?.thousandsSeparator ?? true
                            return this.formatNumber(val, dp, ts)
                        }
                    }
                }
            ]
        }

        return { option }
    }
}
