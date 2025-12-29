/**
 * Abstract base class for all Optiqo chart types.
 * Each chart type implements this class to define its zone configuration,
 * onboarding steps, and metadata.
 */

export interface ZoneConfig {
    showXDimensions: boolean
    showYMetrics: boolean
    showBreakdowns: boolean
    showTargetValue: boolean
    showLocation: boolean
    showCrossTab: boolean
    xLabel?: string
    yLabel?: string
    breakdownLabel?: string
    targetValueLabel?: string
    locationLabel?: string
    crossTabLabel?: string
}

export interface OnboardingStep {
    fieldType: 'value field' | 'category field'
    action: string
    zone: string
    isOptional?: boolean
}

export abstract class OptiqoChart {
    /** Unique identifier for this chart type (e.g., 'bar', 'pie', 'table') */
    abstract readonly type: string

    /** Display label shown in the UI */
    abstract readonly label: string

    /** Heroicons icon name for the chart type selector */
    abstract readonly icon: string

    /** Get the zone configuration for this chart type */
    abstract getZoneConfig(): ZoneConfig

    /** Get the onboarding steps shown in the preview area */
    abstract getOnboardingSteps(): OnboardingStep[]

    /** Get the helper text shown below the onboarding steps */
    abstract getHelperText(): string
}

/** Default zone configuration used as fallback */
export const defaultZoneConfig: ZoneConfig = {
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
