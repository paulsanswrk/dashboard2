import { type OnboardingStep, OptiqoChart, type ZoneConfig } from '../OptiqoChart'

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
            showSize: true,
            xLabel: 'X-Axis',
            yLabel: 'Y-Axis',
            breakdownLabel: 'Break Down By',
            sizeLabel: 'Size'
        }
    }



    getOnboardingSteps(): OnboardingStep[] {
        return [
            { fieldType: 'value field', action: 'to set Y-axis values', zone: 'Y-Axis' },
            { fieldType: 'category field', action: 'to set X-axis categories', zone: 'X-Axis' },
            { fieldType: 'value field', action: 'to define bubble sizes', zone: 'Size', isOptional: true }
        ]
    }

    getHelperText(): string {
        return 'Drag fields to plot bubbles with X, Y, and size values.'
    }
}
