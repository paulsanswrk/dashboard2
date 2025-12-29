import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class PivotChart extends OptiqoChart {
    readonly type = 'pivot'
    readonly label = 'Pivot'
    readonly icon = 'i-heroicons-view-columns'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: true,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: true,
            xLabel: 'Columns',
            yLabel: 'Values',
            breakdownLabel: 'Rows',
            crossTabLabel: 'Cross Tab Dimension'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to aggregate in cells', zone: 'Values'},
            {fieldType: 'category field', action: 'to define columns', zone: 'Columns'},
            {fieldType: 'category field', action: 'to define rows', zone: 'Rows'}
        ]
    }

    getHelperText(): string {
        return 'Drag fields to create a cross-tabulation heatmap table.'
    }
}
