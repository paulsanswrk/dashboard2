import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

/**
 * Handles: pie, donut chart types
 */
export class PieChart extends OptiqoChart {
    readonly type: string
    readonly label: string
    readonly icon: string

    constructor(type: 'pie' | 'donut' = 'pie') {
        super()
        this.type = type

        if (type === 'donut') {
            this.label = 'Donut'
            this.icon = 'i-heroicons-circle-stack'
        } else {
            this.label = 'Pie'
            this.icon = 'i-heroicons-chart-pie'
        }
    }

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: false,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Divide By',
            yLabel: 'Measure'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        const sliceWord = this.type === 'donut' ? 'segments' : 'slices'
        return [
            {fieldType: 'value field', action: `to define ${this.type === 'donut' ? 'segment' : 'slice'} sizes`, zone: 'Measure'},
            {fieldType: 'category field', action: `to divide into ${sliceWord}`, zone: 'Divide By'}
        ]
    }

    getHelperText(): string {
        return this.type === 'donut'
            ? 'Drag fields to show proportions with a center hole for labels.'
            : 'Drag fields to show proportions of a whole.'
    }
}
