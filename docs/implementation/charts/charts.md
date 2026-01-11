# Charts Implementation Documentation

## Overview

This document describes the comprehensive charts implementation for the Optiqo dashboard, featuring Apache ECharts with support for 21 different chart types, an intelligent adaptive zone system, and a **polymorphic renderer architecture**.

## Architecture

### Polymorphic Chart Renderers

The chart rendering system uses a **polymorphic architecture** where each chart type family has its own dedicated renderer class. This replaces the previous monolithic approach with many if-else branches.

```
lib/charts/renderers/
├── types.ts              # Shared TypeScript interfaces
├── BaseChartRenderer.ts  # Base class with common utilities
├── index.ts              # Renderer registry
├── PieChartRenderer.ts   # pie, donut
├── CartesianChartRenderer.ts  # bar, column, line, area, stacked
├── NumberChartRenderer.ts # number, kpi, gauge
├── FunnelChartRenderer.ts
├── ScatterChartRenderer.ts
├── RadarChartRenderer.ts
├── BubbleChartRenderer.ts
├── BoxPlotChartRenderer.ts
├── TreemapChartRenderer.ts
├── SankeyChartRenderer.ts
├── MapChartRenderer.ts
├── WordCloudChartRenderer.ts
├── PivotChartRenderer.ts
└── WaterfallChartRenderer.ts
```

### Key Classes

#### BaseChartRenderer

Abstract base class providing shared utilities:

```typescript
abstract class BaseChartRenderer {
    abstract readonly chartTypes: string[]
    abstract buildOption(context: ChartRenderContext): ChartRenderResult
    
    // Shared utilities
    protected formatNumber(value: number, decimalPlaces: number, thousandsSeparator: boolean): string
    protected getPalette(appearance?: AppearanceConfig): string[]
    protected getFontStyle(font?: FontStyle): Record<string, any>
    protected getCategories(rows, xDimensions, columns): string[]
    protected getSeriesData(rows, xDimensions, breakdowns, columns, chartType): SeriesData[]
    // ... more utilities
}
```

#### ChartRenderContext

Context object passed to renderers:

```typescript
interface ChartRenderContext {
    chartType: string
    columns: Column[]
    rows: Array<Record<string, unknown>>
    xDimensions: ReportField[]
    breakdowns: ReportField[]
    yMetrics: ReportField[]
    sizeValue?: ReportField  // For bubble chart SIZE zone
    appearance?: AppearanceConfig
    isDark: boolean
}
```

#### Renderer Registry

Charts are rendered via registry lookup:

```typescript
import { getRenderer } from '~/lib/charts/renderers'

const renderer = getRenderer(props.chartType)
const { option, clickHandler } = renderer.buildOption(context)
chartInstance.setOption(option)
```

### Adding New Chart Types

1. Create a new renderer class extending `BaseChartRenderer`:

```typescript
// lib/charts/renderers/MyNewChartRenderer.ts
export class MyNewChartRenderer extends BaseChartRenderer {
    readonly chartTypes = ['mynewchart']

    buildOption(context: ChartRenderContext): ChartRenderResult {
        const palette = this.getPalette(context.appearance)
        // Build ECharts option...
        return { option, clickHandler }
    }
}
```

2. Register in `lib/charts/renderers/index.ts`:

```typescript
import { MyNewChartRenderer } from './MyNewChartRenderer'
registerRenderer(new MyNewChartRenderer())
```

3. Add to the `chartType` prop union in `ReportingChart.vue`

---

## Supported Chart Types

**21 chart types** organized into renderer families:

| Renderer | Chart Types | Description |
|----------|-------------|-------------|
| PieChartRenderer | pie, donut | Parts of a whole |
| CartesianChartRenderer | bar, column, line, area, stacked | X-Y axis charts |
| NumberChartRenderer | number, kpi, gauge | Single value display |
| FunnelChartRenderer | funnel | Sequential stages |
| ScatterChartRenderer | scatter | X-Y correlation |
| BubbleChartRenderer | bubble | Scatter with size encoding |
| RadarChartRenderer | radar | Multi-dimensional comparison |
| BoxPlotChartRenderer | boxplot | Statistical distribution |
| TreemapChartRenderer | treemap | Hierarchical rectangles |
| SankeyChartRenderer | sankey | Flow diagrams |
| MapChartRenderer | map | Geographic visualization |
| WordCloudChartRenderer | wordcloud | Text frequency |
| PivotChartRenderer | pivot | Cross-tabulation heatmap |
| WaterfallChartRenderer | waterfall | Cumulative changes |

---

## Intelligent Zone System

### Zone Configuration

Zone configurations are defined in `lib/charts/types/` using `OptiqoChart` classes:

```typescript
interface ZoneConfig {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  showTargetValue: boolean
  showLocation: boolean
  showCrossTab: boolean
  showSize?: boolean        // For bubble chart SIZE zone
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
  sizeLabel?: string        // Label for SIZE zone
}
```

### Zone Configurations by Chart Type

| Chart Type | X Zone | Y Zone | Breakdown | Special |
|------------|--------|--------|-----------|---------|
| Table | ✅ Columns (Text) | ✅ Columns (Aggregated) | ❌ | ✅ Cross Tab |
| Number/Gauge/KPI | ❌ | ✅ Measure | ❌ | ✅ Target Value |
| Bar/Column/Line/Area | ✅ X-Axis | ✅ Y-Axis | ✅ Break Down By | ❌ |
| Stacked/Waterfall | ✅ X-Axis | ✅ Y-Axis | ✅ Break Down By | ❌ |
| Pie/Donut | ✅ Divide By | ✅ Measure | ❌ | ❌ |
| Funnel | ❌ | ✅ Stages | ✅ Break Down By | ❌ |
| Map | ❌ | ✅ Measure | ✅ Break Down By | ✅ Location |
| Scatter | ✅ X-Axis | ✅ Y-Axis | ✅ Break Down By | ❌ |
| Bubble | ✅ X-Axis | ✅ Y-Axis | ✅ Break Down By | ✅ Size |
| Treemap | ✅ Divide By | ✅ Measure | ✅ Break Down By | ❌ |
| Sankey | ✅ Source | ✅ Target | ✅ Values | ❌ |
| Radar/BoxPlot | ✅ X-Axis | ✅ Y-Axis | ✅ Break Down By | ❌ |
| Word Cloud | ✅ Word List | ✅ Word Count | ❌ | ❌ |
| Pivot | ✅ Columns | ✅ Values | ✅ Rows | ✅ Cross Tab |

---

## Core Components

### ReportingChart.vue

Primary chart rendering component (~230 lines):

- Uses polymorphic renderer lookup
- ECharts initialization and cleanup
- ResizeObserver for responsive behavior
- Click event delegation to renderers

### lib/charts/

```
lib/charts/
├── OptiqoChart.ts       # Base class for chart type metadata
├── index.ts             # Chart type registry (zones, onboarding)
├── types/               # Chart type definitions (14 files)
│   ├── CartesianChart.ts
│   ├── PieChart.ts
│   └── ...
└── renderers/           # Chart renderers (16 files)
    ├── BaseChartRenderer.ts
    ├── CartesianChartRenderer.ts
    └── ...
```

---

## Chart State Structure

Charts store configuration in `state_json`:

```typescript
interface ChartStateJson {
  chartType: string
  appearance: {
    chartTitle?: string
    showLegend?: boolean
    legendPosition?: 'top' | 'right' | 'bottom' | 'left'
    palette?: string[]
    stacked?: boolean
    numberFormat?: { decimalPlaces?: number; thousandsSeparator?: boolean }
  }
  internal: {
    dataConnectionId: number
    selectedDatasetId: string
    xDimensions: DimensionRef[]
    yMetrics: MetricRef[]
    breakdowns: DimensionRef[]
    filters: FilterCondition[]
    joins: JoinConfig[]
    actualExecutedSql: string
    actualExecutedSqlParams: any[]
  }
}
```

---

## Performance

### ECharts Advantages
- Superior rendering for large datasets
- GPU acceleration where supported
- Proper memory management with disposal
- Optimized bundle through tree-shaking

### Architecture Benefits
- Each renderer focused on single responsibility
- No massive switch/if-else chains
- Easy to test individual renderers
- Simple to add new chart types

---

## Features

### Preserved
- All styling options (colors, fonts, spacing)
- Number formatting
- Legend positioning
- Click interactions for drill-down
- Responsive design
- Dark theme support

### Enhanced
- 21 chart types
- Polymorphic architecture
- Intelligent zone adaptation
- Clean separation of concerns
- Better maintainability
