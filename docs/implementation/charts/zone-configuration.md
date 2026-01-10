# Chart Zone Configuration

This document describes the zone configuration system that maps chart types to their corresponding field drop zones, aligning with the original Optiqo application.

## Zone Types

The reporting builder supports **7 zone types**:

| Zone          | Storage | Purpose                                         |
|---------------|---------|-------------------------------------------------|
| `x`           | Array   | Primary dimension (X-axis, categories, columns) |
| `y`           | Array   | Metrics/values (Y-axis, measures)               |
| `breakdowns`  | Array   | Secondary dimension for series/grouping         |
| `filters`     | Array   | Data filters (always shown)                     |
| `targetValue` | Single  | Target/comparison value (Number/Gauge/KPI)      |
| `location`    | Single  | Geographic field (Map)                          |
| `crossTab`    | Single  | Cross-tab dimension (Table/Pivot)               |

## Zone Configuration per Chart Type

```typescript
type ZoneConfig = {
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
```

### Configuration Matrix

| Chart Type    | X Zone             | Y Zone                   | Breakdown         | Target           | Location     | CrossTab                |
|---------------|--------------------|--------------------------|-------------------|------------------|--------------|-------------------------|
| **number**    | ❌                  | ✅ "Measure"              | ❌                 | ✅ "Target Value" | ❌            | ❌                       |
| **gauge**     | ❌                  | ✅ "Measure"              | ❌                 | ✅ "Target Value" | ❌            | ❌                       |
| **kpi**       | ❌                  | ✅ "Measure"              | ❌                 | ✅ "Target Value" | ❌            | ❌                       |
| **table**     | ✅ "Columns (Text)" | ✅ "Columns (Aggregated)" | ❌                 | ❌                | ❌            | ✅ "Cross Tab Dimension" |
| **pivot**     | ✅ "Columns"        | ✅ "Values"               | ✅ "Rows"          | ❌                | ❌            | ✅ "Cross Tab Dimension" |
| **pie**       | ✅ "Divide By"      | ✅ "Measure"              | ❌                 | ❌                | ❌            | ❌                       |
| **donut**     | ✅ "Divide By"      | ✅ "Measure"              | ❌                 | ❌                | ❌            | ❌                       |
| **funnel**    | ❌                  | ✅ "Stages"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **map**       | ❌                  | ✅ "Measure"              | ✅ "Break Down By" | ❌                | ✅ "Location" | ❌                       |
| **column**    | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **bar**       | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **stacked**   | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **line**      | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **area**      | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Break Down By" | ❌                | ❌            | ❌                       |
| **boxplot**   | ✅ "X-Axis"         | ✅ "Y-Axis"               | ❌                 | ❌                | ❌            | ❌                       |
| **scatter**   | ✅ "X-Axis"         | ✅ "Y-Axis"               | ❌                 | ❌                | ❌            | ❌                       |
| **bubble**    | ✅ "X-Axis"         | ✅ "Y-Axis"               | ✅ "Size"          | ❌                | ❌            | ❌                       |
| **treemap**   | ✅ "Hierarchy"      | ❌                        | ✅ "Size Values"   | ❌                | ❌            | ❌                       |
| **sankey**    | ✅ "Source"         | ✅ "Target"               | ❌                 | ❌                | ❌            | ❌                       |
| **radar**     | ✅ "Dimensions"     | ✅ "Values"               | ✅ "Series"        | ❌                | ❌            | ❌                       |
| **waterfall** | ✅ "Categories"     | ✅ "Values"               | ❌                 | ❌                | ❌            | ❌                       |
| **wordcloud** | ✅ "Words"          | ✅ "Size Values"          | ❌                 | ❌                | ❌            | ❌                       |

## Implementation Files

### State Management

**`composables/useReportState.ts`**

- Defines `ZoneType` union type
- Stores zone refs: `xDimensions`, `yMetrics`, `breakdowns`, `filters`, `targetValue`, `location`, `crossTabDimension`
- Provides functions: `addToZone`, `removeFromZone`, `moveInZone`, `updateFieldInZone`

### Zone Configuration

**`components/reporting/ReportingBuilder.vue`**

- Contains `zoneConfig` computed property
- Returns appropriate `ZoneConfig` based on `chartType`
- Defines visibility flags and labels per chart type

### Zone UI

**`components/reporting/ReportingZones.vue`**

- Renders zone drop areas conditionally based on `zoneConfig`
- Handles drag-and-drop for array zones (`onDrop`) and single zones (`onDropSingleZone`)
- Shows field options popup on click (`openPopup`)

## Zone Behavior

### Array Zones (x, y, breakdowns, filters)

- Accept multiple fields
- Support drag-and-drop reordering
- Display as list with remove buttons

### Single-Value Zones (targetValue, location, crossTab)

- Accept one field only (replaces existing)
- No reordering support
- Display as single item with remove button

## Alignment with Original App

Zone naming follows the original Optiqo app at `admin.optiqo.report/#charts`:


| Original Name        | Our Implementation                     |
|----------------------|----------------------------------------|
| MEASURE              | `yLabel: 'Measure'`                    |
| STAGES (Funnel)      | `yLabel: 'Stages'`                     |
| TARGET VALUE         | `targetValueLabel: 'Target Value'`     |
| DIVIDE BY            | `xLabel: 'Divide By'`                  |
| LOCATION             | `locationLabel: 'Location'`            |
| BREAK DOWN BY        | `breakdownLabel: 'Break Down By'`      |
| CROSS TAB DIMENSION  | `crossTabLabel: 'Cross Tab Dimension'` |
| COLUMNS (TEXT)       | `xLabel: 'Columns (Text)'`             |
| COLUMNS (AGGREGATED) | `yLabel: 'Columns (Aggregated)'`       |
| FILTER BY            | Always "Filter By"                     |

## Chart-Specific Zone Notes

### Funnel Chart

The funnel chart zone configuration matches the original Optiqo system:

- **Stages** (yMetrics): Drop a **value field** (numeric measure) here. This determines the size of each funnel stage.
- **Break Down By** (breakdowns): Drop a **category field** here. This creates the individual funnel sections with labels.

The X-axis zone is hidden for funnel charts since the category comes from the Break Down By zone.
