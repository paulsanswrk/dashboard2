import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class RadarChart extends OptiqoChart {
    readonly type = 'radar'
    readonly label = 'Radar'
    readonly icon = 'i-heroicons-globe-alt'

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
            {fieldType: 'value field', action: 'to define dimension values', zone: 'Y-Axis'},
            {fieldType: 'category field', action: 'to define dimensions', zone: 'X-Axis'},
            {fieldType: 'category field', action: 'to compare multiple series', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to compare multiple dimensions on a spider web.'
    }
}
