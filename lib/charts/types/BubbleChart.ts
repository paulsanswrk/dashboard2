import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class BubbleChart extends OptiqoChart {
    readonly type = 'bubble'
    readonly label = 'Bubble'
    readonly icon = 'i-heroicons-ellipsis-horizontal-circle'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Category',
            yLabel: 'Bubble Size',
            breakdownLabel: 'Break Down By'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to define bubble sizes', zone: 'Bubble Size'},
            {fieldType: 'category field', action: 'to define categories', zone: 'Category'},
            {fieldType: 'category field', action: 'to break down into series', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to plot bubbles with X, Y, and size values.'
    }
}
