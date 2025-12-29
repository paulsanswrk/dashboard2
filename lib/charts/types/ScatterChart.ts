import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class ScatterChart extends OptiqoChart {
    readonly type = 'scatter'
    readonly label = 'Scatter'
    readonly icon = 'i-heroicons-squares-2x2'

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
            {fieldType: 'value field', action: 'to define Y-axis values', zone: 'Y-Axis'},
            {fieldType: 'category field', action: 'to define X-axis values', zone: 'X-Axis'},
            {fieldType: 'category field', action: 'to break down into series', zone: 'Break Down By', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag value fields to plot data points on X-Y axes.'
    }
}
