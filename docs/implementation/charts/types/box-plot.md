# Box Plot Chart

## Overview

The Box Plot chart displays statistical distribution of numeric values across categories, showing the five-number summary: minimum, Q1, median, Q3, and maximum. This chart type is particularly useful for comparing distributions across categories and identifying outliers.

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| Type definition | `lib/charts/types/BoxPlotChart.ts` | Zone config, onboarding steps, helper text |
| Renderer | `lib/charts/renderers/BoxPlotChartRenderer.ts` | ECharts option building, data aggregation |
| Preview API | `server/api/reporting/preview.post.ts` | Aggregation bypass, higher row limits |

## Zone Configuration

| Zone | Enabled | Label | Purpose |
|------|---------|-------|---------|
| X-Axis | ✅ | X-Axis | Category field to group data by |
| Y-Axis | ✅ | Y-Axis | Numeric value field for statistics |
| Break Down By | ✅ | Break Down By | Optional further category breakdown |
| Target Value | ❌ | — | — |
| Location | ❌ | — | — |
| Cross Tab | ❌ | — | — |
| Size | ❌ | — | — |

## Data Pipeline

### Aggregation Bypass

Unlike most chart types, box plots require **raw, non-aggregated data** to compute statistics client-side. The preview API detects `chartType === 'boxplot'` and:

1. **Skips GROUP BY** — returns individual rows instead of aggregated results
2. **Uses higher row limits** — up to 5,000 rows (vs 1,000 for aggregated charts) to ensure statistically meaningful distributions
3. **Omits aggregation functions** — the metric column key uses the raw `fieldId` rather than an aggregation-prefixed alias

```typescript
// server/api/reporting/preview.post.ts
const skipAggregation = body.chartType === 'boxplot'
const maxLimit = skipAggregation ? 5000 : 1000
```

### Client-Side Quartile Computation

The renderer groups raw rows by the X dimension value and computes the five-number summary for each category:

```typescript
values.sort((a, b) => a - b)
const min    = values[0]
const q1     = values[Math.floor(values.length * 0.25)]
const median = values[Math.floor(values.length * 0.5)]
const q3     = values[Math.floor(values.length * 0.75)]
const max    = values[values.length - 1]
boxplotData.push([min, q1, median, q3, max])
```

### Metric Column Resolution

Because aggregation is skipped, the column key lookup differs from standard charts:

1. **Primary**: Match the raw `fieldId` directly against column keys
2. **Fallback**: Try aggregation-prefixed alias (for backwards compatibility)
3. **Last resort**: First non-dimension column

## Appearance Features

### Data Labels (Show Labels)

> [!IMPORTANT]
> **ECharts 5.6.0 does NOT support the `label` property on `boxplot` series.** The formatter function is never invoked.

The workaround uses `markPoint` with invisible markers:

```typescript
markPoint: {
    symbol: 'circle',
    symbolSize: 0,                          // invisible marker
    data: boxplotData.map((item, idx) => ({
        name: `median-${idx}`,
        coord: [idx, item[4]],              // positioned at max whisker
        value: item[2],                      // median value
        itemStyle: { color: 'transparent' },
        label: {
            show: true,
            position: 'top',
            formatter: '{c}',               // displays the median
            fontSize: 12,
            color: '#333'
        }
    }))
}
```

- **Controlled by**: `appearance.showLabels`
- **Displays**: Median value above each box
- **Position**: Top of max whisker

### Tooltip

Custom tooltip showing all five summary values:

```
Category Name
Max: 50
Q3: 40
Median: 30
Q1: 20
Min: 10
```

The tooltip formatter handles both direct `params.value` and `params.data.value` for compatibility with `markPoint` items.

### Styling

| Property | Source | Default |
|----------|--------|---------|
| Box fill color | `palette[0]` | Default palette first color |
| Box border color | `palette[1]` | `#333` |
| Background | `appearance.backgroundColor` | Transparent |
| Title | `appearance.chartTitle` | None |

## URL State Persistence

The `chartType` field is included in the URL-encoded `ReportState` (base64 `r` parameter), ensuring the box plot selection is preserved across page refreshes.

```typescript
// composables/useReportState.ts
type ReportState = {
    chartType?: string    // Persisted in URL
    selectedDatasetId: string | null
    // ...
}
```

## Known Limitations

| Limitation | Workaround | Status |
|------------|------------|--------|
| ECharts `label` not supported on boxplot series | `markPoint` with invisible markers | ✅ Implemented |
| No outlier detection | — | Not yet implemented |
| No breakdown support in renderer | Only single series rendered | Future enhancement |
| Quartile calculation uses simple index method | — | Adequate for most datasets |

## Example Configuration

```json
{
    "chartType": "boxplot",
    "xDimensions": [
        { "fieldId": "rating", "label": "Rating", "type": "varchar", "table": "film" }
    ],
    "yMetrics": [
        { "fieldId": "replacement_cost", "label": "Replacement Cost", "type": "decimal", "table": "film", "isNumeric": true }
    ],
    "appearance": {
        "showLabels": true,
        "chartTitle": "Cost Distribution by Rating"
    }
}
```
