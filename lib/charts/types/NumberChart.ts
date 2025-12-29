import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

/**
 * Handles: number, gauge, kpi chart types
 * These are single-value charts with optional target comparison
 */
export class NumberChart extends OptiqoChart {
    readonly type: string
    readonly label: string
    readonly icon: string

    constructor(type: 'number' | 'gauge' | 'kpi' = 'number') {
        super()
        this.type = type

        switch (type) {
            case 'gauge':
                this.label = 'Gauge'
                this.icon = 'i-heroicons-clock'
                break
            case 'kpi':
                this.label = 'KPI'
                this.icon = 'i-heroicons-presentation-chart-bar'
                break
            default:
                this.label = 'Number'
                this.icon = 'i-heroicons-hashtag'
        }
    }

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: false,
            showYMetrics: true,
            showBreakdowns: false,
            showTargetValue: true,
            showLocation: false,
            showCrossTab: false,
            yLabel: 'Measure',
            targetValueLabel: 'Target Value'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to display as a number', zone: 'Measure'},
            {fieldType: 'value field', action: 'to set a target value', zone: 'Target Value', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag a value field to display as a prominent number.'
    }
}
