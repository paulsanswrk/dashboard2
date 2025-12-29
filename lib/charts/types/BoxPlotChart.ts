import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class BoxPlotChart extends OptiqoChart {
    readonly type = 'boxplot'
    readonly label = 'Box Plot'
    readonly icon = 'i-heroicons-bars-3'

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
        return [
            {fieldType: 'value field', action: 'to calculate statistics', zone: 'Y-Axis'},
            {fieldType: 'category field', action: 'to group data', zone: 'X-Axis'},
            {fieldType: 'category field', action: 'to break down by category', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to show statistical distribution of values.'
    }
}
