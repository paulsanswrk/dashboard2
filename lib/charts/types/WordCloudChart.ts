import {type OnboardingStep, OptiqoChart, type ZoneConfig} from '../OptiqoChart'

export class WordCloudChart extends OptiqoChart {
    readonly type = 'wordcloud'
    readonly label = 'Word Cloud'
    readonly icon = 'i-heroicons-cloud'

    getZoneConfig(): ZoneConfig {
        return {
            showXDimensions: true,
            showYMetrics: true,
            showBreakdowns: false,
            showTargetValue: false,
            showLocation: false,
            showCrossTab: false,
            xLabel: 'Word List',
            yLabel: 'Word Count'
        }
    }

    getOnboardingSteps(): OnboardingStep[] {
        return [
            {fieldType: 'value field', action: 'to set word sizes', zone: 'Word Count'},
            {fieldType: 'category field', action: 'to define words', zone: 'Word List'}
        ]
    }

    getHelperText(): string {
        return 'Drag category and value fields to create a word cloud.'
    }
}
