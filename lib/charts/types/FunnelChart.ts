import { type OnboardingStep, OptiqoChart, type ZoneConfig } from '../OptiqoChart'

export class FunnelChart extends OptiqoChart {
    readonly type = 'funnel'
    readonly label = 'Funnel'
    readonly icon = 'i-heroicons-rectangle-stack'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: false,  // Hide X-Axis - funnel doesn't use traditional x-axis
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'X-Axis',  // Not shown
            yLabel: 'Stages',  // Value/measure field - determines stage sizes
            breakdownLabel: 'Break Down By'  // Category field - creates funnel sections
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            { fieldType: 'value field', action: 'to create first stage', zone: 'Stages' },
            { fieldType: 'category field', action: 'to break down your funnel in multiple series', zone: 'Break Down By' }
        ]
    }

    getHelperText(): string {
        return 'Drag a value field to Stages and a category field to Break Down By.'
    }
}

