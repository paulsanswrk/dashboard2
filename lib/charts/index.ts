/**
 * Chart Registry - Central registry and factory for all Optiqo chart types.
 *
 * This module provides:
 * - A registry of all available chart types
 * - Factory functions to get chart configurations
 * - Type exports for use in Vue components
 */

import type {OnboardingStep, ZoneConfig} from './OptiqoChart'
import {defaultZoneConfig, OptiqoChart} from './OptiqoChart'

// Import all chart types
import {TableChart} from './types/TableChart'
import {NumberChart} from './types/NumberChart'
import {CartesianChart} from './types/CartesianChart'
import {PieChart} from './types/PieChart'
import {FunnelChart} from './types/FunnelChart'
import {MapChart} from './types/MapChart'
import {ScatterChart} from './types/ScatterChart'
import {BubbleChart} from './types/BubbleChart'
import {TreemapChart} from './types/TreemapChart'
import {SankeyChart} from './types/SankeyChart'
import {RadarChart} from './types/RadarChart'
import {BoxPlotChart} from './types/BoxPlotChart'
import {WordCloudChart} from './types/WordCloudChart'
import {PivotChart} from './types/PivotChart'

// Chart type registry
const chartRegistry = new Map<string, OptiqoChart>()

/**
 * Register a chart instance in the registry
 */
function registerChart(chart: OptiqoChart): void {
    chartRegistry.set(chart.type, chart)
}

// Register all chart types in display order
registerChart(new TableChart())
registerChart(new NumberChart('number'))
registerChart(new CartesianChart('column'))
registerChart(new CartesianChart('bar'))
registerChart(new CartesianChart('stacked'))
registerChart(new CartesianChart('line'))
registerChart(new CartesianChart('area'))
registerChart(new PieChart('pie'))
registerChart(new PieChart('donut'))
registerChart(new FunnelChart())
registerChart(new NumberChart('gauge'))
registerChart(new NumberChart('kpi'))
registerChart(new RadarChart())
registerChart(new ScatterChart())
registerChart(new BubbleChart())
registerChart(new BoxPlotChart())
registerChart(new CartesianChart('waterfall'))
registerChart(new TreemapChart())
registerChart(new SankeyChart())
registerChart(new PivotChart())
registerChart(new WordCloudChart())
registerChart(new MapChart())

/**
 * Get a chart instance by type
 */
export function getChart(type: string): OptiqoChart | undefined {
    return chartRegistry.get(type)
}

/**
 * Get all registered charts as an array (preserves registration order)
 */
export function getAllCharts(): OptiqoChart[] {
    return Array.from(chartRegistry.values())
}

/**
 * Get the zone configuration for a given chart type
 */
export function getZoneConfig(type: string): ZoneConfig {
    const chart = chartRegistry.get(type)
    return chart?.getZoneConfig() ?? defaultZoneConfig
}

/**
 * Get the onboarding steps for a given chart type
 */
export function getOnboardingSteps(type: string): OnboardingStep[] {
    const chart = chartRegistry.get(type)
    return chart?.getOnboardingSteps() ?? []
}

/**
 * Get the helper text for a given chart type
 */
export function getHelperText(type: string): string {
    const chart = chartRegistry.get(type)
    return chart?.getHelperText() ?? 'Drag fields to build your chart.'
}

/**
 * Get chart type metadata for UI display (type, label, icon)
 */
export function getChartTypes(): Array<{ value: string; label: string; icon: string }> {
    return getAllCharts().map(chart => ({
        value: chart.type,
        label: chart.label,
        icon: chart.icon
    }))
}

// Re-export types for convenience
export type {ZoneConfig, OnboardingStep}
export {OptiqoChart, defaultZoneConfig}
