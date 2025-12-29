import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class TreemapChart extends OptiqoChart {
    readonly type = 'treemap'
    readonly label = 'Treemap'
    readonly icon = 'i-heroicons-squares-plus'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Divide By',
            yLabel: 'Measure',
            breakdownLabel: 'Break Down By'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to define rectangle sizes', zone: 'Measure'},
            {fieldType: 'category field', action: 'to divide into categories', zone: 'Divide By'},
            {fieldType: 'category field', action: 'to add hierarchy levels', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to show hierarchical data as nested rectangles.'
    }
}
