/**
 * Renderer for Number, KPI, and Gauge charts.
 * Single-value display charts.
 */

import { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

export class NumberChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['number', 'kpi', 'gauge']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const { chartType, appearance } = context

        if (chartType === 'gauge') {
            return this.buildGaugeOption(context)
        }

        // Number and KPI are similar
        return this.buildNumberOption(context, chartType === 'kpi')
    }

    private buildGaugeOption(context: ChartRenderContext): ChartRenderResult {
        const { appearance, columns, rows } = context
        const value = this.getKpiValue(rows, columns)
        const label = this.getKpiLabel(columns)
        const max = Math.max(value, 100)

        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true

        const option = {
            title: this.buildTitleConfig(appearance),
            tooltip: {
                formatter: () => {
                    const formattedValue = this.formatNumber(value, dp, ts)
                    return `${label}: ${formattedValue}`
                }
            },
            series: [{
                name: label,
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: max,
                splitNumber: 5,
                axisLine: {
                    lineStyle: {
                        width: 10,
                        color: [
                            [0.3, '#67e0e3'],
                            [0.7, '#37a2da'],
                            [1, '#fd666d']
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                    length: '12%',
                    width: 20,
                    offsetCenter: [0, '-60%'],
                    itemStyle: {
                        color: 'auto'
                    }
                },
                axisTick: {
                    length: 12,
                    lineStyle: {
                        color: 'auto',
                        width: 2
                    }
                },
                splitLine: {
                    length: 20,
                    lineStyle: {
                        color: 'auto',
                        width: 5
                    }
                },
                axisLabel: {
                    color: '#464646',
                    fontSize: 20,
                    distance: -60,
                    formatter: (val: number) => this.formatNumber(val, dp, ts)
                },
                title: {
                    offsetCenter: [0, '50%'],
                    fontSize: 16
                },
                detail: {
                    fontSize: 30,
                    offsetCenter: [0, '0%'],
                    valueAnimation: true,
                    formatter: (val: number) => this.formatNumber(val, dp, ts),
                    color: 'auto'
                },
                data: [{
                    value: value,
                    name: label
                }]
            }]
        }

        return { option }
    }

    private buildNumberOption(context: ChartRenderContext, isKpi: boolean): ChartRenderResult {
        const { appearance, columns, rows } = context
        const value = this.getKpiValue(rows, columns)
        const label = this.getKpiLabel(columns)
        const palette = this.getPalette(appearance)

        const formattedValue = this.formatValueWithPrefixSuffix(value, appearance)

        const option = {
            backgroundColor: this.getBackgroundColor(appearance),
            title: {
                text: appearance?.chartTitle || '',
                show: !!appearance?.chartTitle,
                left: 'center',
                top: '5%',
                textStyle: {
                    fontFamily: appearance?.fontFamily || 'Arial',
                    fontSize: 16
                }
            },
            graphic: [
                {
                    type: 'group',
                    left: 'center',
                    top: 'middle',
                    children: [
                        {
                            type: 'text',
                            style: {
                                text: formattedValue,
                                fill: palette[0] || '#3366CC',
                                font: isKpi ? 'bold 72px Arial' : 'bold 64px Arial',
                                textAlign: 'center',
                                textVerticalAlign: 'middle'
                            }
                        },
                        {
                            type: 'text',
                            top: isKpi ? 50 : 45,
                            style: {
                                text: label,
                                fill: '#666',
                                font: isKpi ? '18px Arial' : '16px Arial',
                                textAlign: 'center',
                                textVerticalAlign: 'top'
                            }
                        }
                    ]
                }
            ]
        }

        return { option }
    }
}
