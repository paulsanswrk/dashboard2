# Charts Implementation Documentation

## Overview

This document describes the comprehensive charts implementation for the Optiqo dashboard, featuring Apache ECharts with support for 21 different chart types, an intelligent adaptive zone system, a **polymorphic renderer architecture**, and **per-series customization** via the Series Options Panel.

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
    
    // Formatting utilities
    protected formatNumber(value: number, decimalPlaces: number, thousandsSeparator: boolean): string
    protected getPalette(appearance?: AppearanceConfig): string[]
    protected getFontStyle(font?: FontStyle): Record<string, any>
    
    // Data extraction
    protected getCategories(rows, xDimensions, columns): string[]
    protected getSeriesData(rows, xDimensions, breakdowns, columns, chartType): SeriesData[]
    
    // Per-series customization
    protected getSeriesConfig(seriesName: string, appearance?: AppearanceConfig): SeriesConfig
    protected applySeriesOverrides(seriesOption, seriesName, appearance?, palette?, seriesIndex?): Record<string, any>
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

## Series Options Panel

### Overview

Click on any chart series element (bar, line, pie slice, etc.) to open the **Series Options Panel** for per-series customization.

### Components

| Component | Path | Description |
|-----------|------|-------------|
| SeriesOptionsPanel.vue | `components/reporting/` | Sidebar UI for series config |
| ReportingChart.vue | `components/reporting/` | Emits `series-click` event |
| builder.vue | `pages/reporting/` | Handles event, toggles panel |

### SeriesConfig Type

```typescript
interface SeriesConfig {
    color?: string
    visualizationType?: 'default' | 'bar' | 'line' | 'area'
    smoothing?: 'sharp' | 'smooth'
    lineStyle?: 'solid' | 'dashed' | 'dotted'
    markerStyle?: 'none' | 'circle' | 'square' | 'diamond' | 'triangle'
    showOnSecondaryAxis?: boolean
    showLabels?: boolean
    showLabelBackground?: boolean
    labelFont?: FontStyle
    showTrendLine?: boolean
}
```

### Event Flow

1. User clicks chart series element
2. `ReportingChart.vue` emits `series-click` with `{ seriesName, seriesIndex }`
3. `ReportingBuilder.vue` forwards event to `builder.vue`
4. `builder.vue` shows `SeriesOptionsPanel` in right sidebar
5. Panel updates `appearance.seriesOptions[seriesName]`
6. Chart re-renders with overrides via `applySeriesOverrides()`

### Applying Overrides in Renderers

```typescript
// In CartesianChartRenderer.ts
const seriesConfig = series.map((s, idx) => {
    let baseConfig = { name: s.name, type: echartsType, data: s.data, ... }
    // Apply per-series customization
    baseConfig = this.applySeriesOverrides(baseConfig, s.name, appearance, palette, idx)
    return baseConfig
})
```

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

Primary chart rendering component (~270 lines):

- Uses polymorphic renderer lookup
- ECharts initialization and cleanup
- ResizeObserver for responsive behavior
- Click event delegation to renderers
- Emits `series-click` for Series Options Panel
- Supports `seriesOptions` in appearance config

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
    seriesOptions?: Record<string, SeriesConfig>  // Per-series customization
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
- **Per-series customization via Series Options Panel**
- **Secondary Y-axis support**

---

## Chart Data Caching

Charts support intelligent data caching via two new database columns:

| Column | Type | Purpose |
|--------|------|---------|
| `has_dynamic_filter` | boolean | True if chart uses relative date filters |
| `cache_status` | text | Current cache state: `cached`, `stale`, `dynamic`, `unknown` |

### Cache Flow

1. **On chart save**: Dependencies extracted from `state_json`, `cache_status` computed
2. **On data fetch**: Check `cache_status` for O(1) cache decision
3. **On data push**: Webhook invalidates cache for affected tables

### Data Source Strategies

| Source | Strategy |
|--------|----------|
| Optiqoflow | Cache invalidated on webhook push |
| MySQL | Permanent cache (manual refresh only) |

See: [Multi-Tenant Data Architecture](../optiqoflow/multi-tenant-data-architecture.md)


