import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class FunnelChart extends OptiqoChart {
    readonly type = 'funnel'
    readonly label = 'Funnel'
    readonly icon = 'i-heroicons-rectangle-stack'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Stages',
            yLabel: 'Measure',
            breakdownLabel: 'Break Down By'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to define stage values', zone: 'Measure'},
            {fieldType: 'category field', action: 'to define funnel stages', zone: 'Stages'},
            {fieldType: 'category field', action: 'to break down your funnel', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to visualize conversion or process stages.'
    }
}
