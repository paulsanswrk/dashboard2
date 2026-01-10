/**
 * Chart Renderer Registry
 * 
 * Central registry for all chart type renderers.
 * Maps chart types to their renderer implementations.
 */

import type { BaseChartRenderer } from './BaseChartRenderer'
import type { ChartRenderContext, ChartRenderResult } from './types'

import { PieChartRenderer } from './PieChartRenderer'
import { CartesianChartRenderer } from './CartesianChartRenderer'
import { NumberChartRenderer } from './NumberChartRenderer'
import { FunnelChartRenderer } from './FunnelChartRenderer'
import { ScatterChartRenderer } from './ScatterChartRenderer'
import { RadarChartRenderer } from './RadarChartRenderer'
import { BubbleChartRenderer } from './BubbleChartRenderer'
import { BoxPlotChartRenderer } from './BoxPlotChartRenderer'
import { TreemapChartRenderer } from './TreemapChartRenderer'
import { SankeyChartRenderer } from './SankeyChartRenderer'
import { MapChartRenderer } from './MapChartRenderer'
import { WordCloudChartRenderer } from './WordCloudChartRenderer'
import { PivotChartRenderer } from './PivotChartRenderer'
import { WaterfallChartRenderer } from './WaterfallChartRenderer'

// Registry mapping chart types to renderers
const rendererRegistry = new Map<string, BaseChartRenderer>()

/**
 * Register a renderer for multiple chart types
 */
function registerRenderer(renderer: BaseChartRenderer): void {
    renderer.chartTypes.forEach(type => {
        rendererRegistry.set(type, renderer)
    })
}

// Register all renderers
registerRenderer(new PieChartRenderer())
registerRenderer(new CartesianChartRenderer())
registerRenderer(new NumberChartRenderer())
registerRenderer(new FunnelChartRenderer())
registerRenderer(new ScatterChartRenderer())
registerRenderer(new RadarChartRenderer())
registerRenderer(new BubbleChartRenderer())
registerRenderer(new BoxPlotChartRenderer())
registerRenderer(new TreemapChartRenderer())
registerRenderer(new SankeyChartRenderer())
registerRenderer(new MapChartRenderer())
registerRenderer(new WordCloudChartRenderer())
registerRenderer(new PivotChartRenderer())
registerRenderer(new WaterfallChartRenderer())

/**
 * Get the renderer for a given chart type
 */
export function getRenderer(chartType: string): BaseChartRenderer | undefined {
    return rendererRegistry.get(chartType)
}

/**
 * Check if a renderer exists for the given chart type
 */
export function hasRenderer(chartType: string): boolean {
    return rendererRegistry.has(chartType)
}

/**
 * Get all registered chart types
 */
export function getRegisteredChartTypes(): string[] {
    return Array.from(rendererRegistry.keys())
}

// Re-export types for convenience
export type { ChartRenderContext, ChartRenderResult }
export { BaseChartRenderer } from './BaseChartRenderer'
