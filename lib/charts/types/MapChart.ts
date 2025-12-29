import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class MapChart extends OptiqoChart {
    readonly type = 'map'
    readonly label = 'Map'
    readonly icon = 'i-heroicons-map'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: false,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: true,
            showCrossTab: false,
            yLabel: 'Measure',
            locationLabel: 'Location',
            breakdownLabel: 'Break Down By'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to color regions by value', zone: 'Measure'},
            {fieldType: 'category field', action: 'with location information', zone: 'Location'},
            {fieldType: 'category field', action: 'to break down your data', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to color regions on a map based on values.'
    }
}
