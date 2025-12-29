import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class TableChart extends OptiqoChart {
    readonly type = 'table'
    readonly label = 'Table'
    readonly icon = 'i-heroicons-table-cells'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: false,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: true,
            xLabel: 'Columns (Text)',
            yLabel: 'Columns (Aggregated)',
            crossTabLabel: 'Cross Tab Dimension'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to add aggregated columns', zone: 'Columns (Aggregated)'},
            {fieldType: 'category field', action: 'to add text columns', zone: 'Columns (Text)'},
            {fieldType: 'category field', action: 'to create a pivot table', zone: 'Cross Tab Dimension', isOptional: true}
        ]
    }

    getHelperText(): string {
        return 'Drag fields from the left panel to create tables and pivot tables.'
    }
}
