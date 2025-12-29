import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

/**
 * Handles: bar, column, stacked, line, area, waterfall chart types
 * These are cartesian charts with X-Axis, Y-Axis, and Break Down By zones
 */
export class CartesianChart extends OptiqoChart {
    readonly type: string
    readonly label: string
    readonly icon: string

    constructor(type: 'bar' | 'column' | 'stacked' | 'line' | 'area' | 'waterfall' = 'bar') {
        super()
        this.type = type

        switch (type) {
            case 'column':
                this.label = 'Column'
                this.icon = 'i-heroicons-chart-bar'
                break
            case 'stacked':
                this.label = 'Stacked'
                this.icon = 'i-heroicons-chart-bar-square'
                break
            case 'line':
                this.label = 'Line'
                this.icon = 'i-heroicons-chart-bar'
                break
            case 'area':
                this.label = 'Area'
                this.icon = 'i-heroicons-chart-bar'
                break
            case 'waterfall':
                this.label = 'Waterfall'
                this.icon = 'i-heroicons-bars-arrow-down'
                break
            default:
                this.label = 'Bar'
                this.icon = 'i-heroicons-chart-bar'
        }
    }

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'X-Axis',
            yLabel: 'Y-Axis',
            breakdownLabel: 'Break Down By'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        const steps: OnboardingStep[] = [
            {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
            {fieldType: 'category field', action: 'to define X-axis categories', zone: 'X-Axis'}
        ]

        if (this.type === 'stacked') {
            steps.push({fieldType: 'category field', action: 'to create stacks', zone: 'Break Down By'})
        } else if (this.type !== 'waterfall') {
            steps.push({fieldType: 'category field', action: 'to break down into multiple series', zone: 'Break Down By', isOptional: true})
        }

        return steps
    }

    getHelperText(): string {
        switch (this.type) {
            case 'line':
                return 'Drag fields to show trends over time or categories.'
            case 'area':
                return 'Drag fields to show cumulative totals over categories.'
            case 'stacked':
                return 'Drag fields to create stacked bar or column charts.'
            case 'waterfall':
                return 'Drag fields to show cumulative increases and decreases.'
            default:
                return 'Drag fields to visualize data as bars.'
        }
    }
}
