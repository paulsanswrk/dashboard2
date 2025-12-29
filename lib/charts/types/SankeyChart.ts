import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class SankeyChart extends OptiqoChart {
    readonly type = 'sankey'
    readonly label = 'Sankey'
    readonly icon = 'i-heroicons-arrows-right-left'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Source',
            yLabel: 'Target',
            breakdownLabel: 'Values'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'category field', action: 'to define flow sources', zone: 'Source'},
            {fieldType: 'category field', action: 'to define flow targets', zone: 'Target'},
            {fieldType: 'value field', action: 'to define flow widths', zone: 'Values', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to show flow relationships between entities.'
    }
}
