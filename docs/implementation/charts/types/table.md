# Table Chart

## Overview

The Table chart renders tabular data with configurable headers, total rows, row striping, borders, and number formatting. It supports interactive features on dashboards: click-to-sort columns, sticky headers during scroll, and context-dependent sidebar switching (header click → HEADER & TOTAL config, cell click → TABLE STYLE config).

Unlike most chart types, tables are rendered as native HTML `<table>` rather than ECharts canvases — this is handled entirely by `ReportingPreview.vue`.

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| Type definition | `lib/charts/types/TableChart.ts` | Zone config, onboarding steps, helper text |
| Renderer | `components/reporting/ReportingPreview.vue` | HTML table rendering, sorting, sticky headers, event emitting |
| Config editor | `components/reporting/ChartConfigEditor.vue` | TABLE STYLE and HEADER & TOTAL configuration tabs |
| Dashboard bridge | `components/DashboardChartRenderer.vue` | `interactive` prop, event forwarding |

## Zone Configuration

| Zone | Enabled | Label | Purpose |
|------|---------|-------|---------|
| X-Axis | ✅ | Columns (Text) | Category/text columns |
| Y-Axis | ✅ | Columns (Aggregated) | Numeric/aggregated columns |
| Break Down By | ❌ | — | — |
| Target Value | ❌ | — | — |
| Location | ❌ | — | — |
| Cross Tab | ✅ | Cross Tab Dimension | Creates pivot table layout |
| Size | ❌ | — | — |

## Rendering

### HTML Table Structure

The table is rendered as a native `<table>` inside a scroll container:

```
div.reporting-preview-scroll    ← overflow-x/y: auto, height: 100%
  └─ table.min-w-full           ← border-collapse: collapse
       ├─ thead                 ← header row (conditional on showHeader)
       │    └─ tr > th*         ← sticky headers (position: sticky, top: 0)
       ├─ tbody                 ← data rows
       │    └─ tr* > td*        ← alternating odd/even row colors
       └─ tfoot                 ← total row (conditional on showTotal)
            └─ tr > td*         ← aggregated totals
```

### Sticky Headers

Headers use `position: sticky` applied directly to `<th>` elements (not `<thead>`, which doesn't work with `overflow: auto` containers in most browsers). Each `<th>` gets an explicit `backgroundColor` to prevent data rows from being visible behind the header during scrolling.

```typescript
const headerCellStyle = computed(() => ({
  position: 'sticky' as const,
  top: '0',
  zIndex: 10,
  backgroundColor: headerBgColor.value,
  // ...other styles
}))
```

### Switch Row/Column (Transpose)

When `switchRowColumn` is enabled, the table transposes its data:
- Original column headers become row labels
- Original rows become column headers
- Data is reindexed via `displayColumns` and `displayRows` computed properties

## Interactive Features

### Click-to-Sort

Clicking a column header cycles through a tri-state toggle:

1. **First click** → Ascending sort (↑ indicator)
2. **Second click** → Descending sort (↓ indicator)
3. **Third click** → Clear sort (no indicator, original order)

```typescript
function handleHeaderClick(colIdx: number, colKey: string) {
  if (sortColumn.value === colKey) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortColumn.value = null       // clear
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = colKey
    sortDirection.value = 'asc'
  }
}
```

**Sort algorithm:**
- Numeric values: direct `a - b` comparison
- Strings: `localeCompare` for locale-aware ordering
- Null/undefined: always sorted to the end

Sorting applies via a `sortedRows` computed property that wraps `displayRows`, ensuring it works correctly with the switch-row/column feature.

### Context-Dependent Sidebar Switching

When a table chart is on a dashboard in edit mode, clicking on it switches the configuration sidebar to the relevant tab:

| Click Target | Sidebar Tab | Config Shown |
|-------------|-------------|-------------|
| Column header | HEADER & TOTAL | Show header toggle, header background, header font, total row settings |
| Data cell | TABLE STYLE | Font family, text alignment, row colors, borders, text wrap, row height |

**Event chain:**

```
ReportingPreview (header-click / cell-click)
  → DashboardChartRenderer (forwards events)
    → Dashboard (emits table-header-click / table-cell-click with widgetId)
      → pages/dashboards/[id].vue (sets chartInitialTab ref)
        → WidgetOptionsSidebar (chartInitialTab prop)
          → WidgetSidebarChart (initialTab prop)
            → ChartConfigEditor (initialTab prop, watcher sets activeTab)
```

The `interactive` prop gates event emission — it's only set when `chartType === 'table'` and the dashboard is in edit mode.

## Configuration Options

### TABLE STYLE Tab

| Section | Property | Type | Default | Description |
|---------|----------|------|---------|-------------|
| **General** | `fontFamily` | string | `'inherit'` | Table font family |
| | `textAlign` | `'left' \| 'center' \| 'right'` | `'left'` | Cell text alignment |
| **Color Options** | `oddRowColor` | hex color | `#ffffff` | Odd row background |
| | `evenRowColor` | hex color | `#f9fafb` | Even row background |
| | `borderStyle` | `'all' \| 'horizontal' \| 'vertical' \| 'none'` | `'all'` | Which borders to show |
| | `borderType` | `'solid' \| 'dashed'` | `'solid'` | Border line style |
| | `borderColor` | hex color | `#e5e7eb` | Border color |
| | `borderWidth` | number (1–5) | `1` | Border width in px |
| **Options** | `allowTextWrap` | boolean | `false` | Allow text to wrap in cells |
| | `switchRowColumn` | boolean | `false` | Transpose rows and columns |
| | `rowHeight` | `16 \| 24 \| 32 \| 40 \| 48` | `32` | Row height in px |
| **Number Format** | (via `ChartConfigNumberFormat`) | object | — | Prefix, suffix, decimal places, thousands separator |

### HEADER & TOTAL Tab

| Section | Property | Type | Default | Description |
|---------|----------|------|---------|-------------|
| **Header** | `showHeader` | boolean | `true` | Show/hide header row |
| | `headerBgColor` | hex color | `#f8fafc` | Header background color |
| | `headerFont` | FontSettings | — | Color, size, bold, italic |
| **Total Row** | `showTotal` | boolean | `false` | Show/hide total row |
| | `totalBgColor` | hex color | `#f3f4f6` | Total row background |
| | `totalFont` | FontSettings | — | Color, size, bold, italic |
| **Total Column** | `showTotalColumn` | boolean | `false` | Show/hide total column (sums row values) |
| | `totalColumnAggregation` | string | `'sum'` | Aggregation type (sum, average, count, etc.) |
| | `totalColumnBgColor` | hex color | `#f3f4f6` | Total column background |
| | `totalColumnFont` | FontSettings | — | Color, size, bold, italic |

All configuration is stored under `appearance.table` within the chart state JSON.

## Example Configuration

```json
{
    "chartType": "table",
    "xDimensions": [
        { "fieldId": "name", "label": "Name", "type": "varchar", "table": "actor" }
    ],
    "yMetrics": [
        { "fieldId": "film_count", "label": "Film Count", "type": "int", "table": "actor", "isNumeric": true, "aggregation": "count" }
    ],
    "appearance": {
        "fontFamily": "Inter",
        "table": {
            "showHeader": true,
            "headerBgColor": "#f8fafc",
            "headerFont": { "bold": true, "size": 14, "color": "#1f2937" },
            "showTotal": true,
            "totalBgColor": "#f3f4f6",
            "oddRowColor": "#ffffff",
            "evenRowColor": "#f9fafb",
            "textAlign": "left",
            "borderStyle": "all",
            "borderType": "solid",
            "borderColor": "#e5e7eb",
            "borderWidth": 1,
            "allowTextWrap": false,
            "switchRowColumn": false,
            "rowHeight": 32,
            "showTotalColumn": true,
            "totalColumnAggregation": "sum",
            "totalColumnBgColor": "#f3f4f6",
            "totalColumnFont": { "bold": true }
        }
    }
}
```

## Per-Column Configuration (COLUMN NAME Tab)

Clicking a data cell in dashboard edit mode opens a **COLUMN NAME** tab in the sidebar with per-column formatting overrides.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| Column-level font | Override font color, size, bold, italic per column | ✅ Implemented |
| Column alignment | Override text alignment per column | ✅ Implemented |
| Prefix/Suffix per column | Add custom prefix/suffix to individual columns | ✅ Implemented |
| Column-level number format | Override decimal places, separator, prefix/suffix per column | ✅ Implemented |
| Column hyperlinks | Make column values clickable links | ❌ Not implemented |
| Column-level aggregation | Override aggregation function per column | ❌ Not implemented |

### Data Structure

Per-column overrides are stored in `appearance.table.columns[columnKey]`:

```json
{
  "table": {
    "columns": {
      "amount": {
        "font": { "color": "#e11d48", "bold": true, "size": 14 },
        "textAlign": "right",
        "prefix": "$",
        "suffix": "",
        "numberFormat": { "decimalPlaces": 2, "separator": "comma" }
      }
    }
  }
}
```

### Event Chain

`ReportingPreview.handleCellClick` → emits `cell-click(colIdx, colKey, colLabel)` → `DashboardChartRenderer` forwards → `Dashboard.handleTableCellClick` emits `table-cell-click(widgetId, colIdx, colKey, colLabel)` → `[id].vue` sets `chartInitialTab='column-name'`, stores `clickedColumnKey`/`clickedColumnLabel` → passed through `WidgetOptionsSidebar` → `WidgetSidebarChart` → `ChartConfigEditor`

## Deferred Features

### Additional Features from Reference System

| Feature | Description | Status |
|---------|-------------|--------|
| Row selection/highlighting | Click to select/highlight individual rows | ❌ Not implemented |
| Column resize | Drag column borders to resize | ❌ Not implemented |
| Column reorder | Drag column headers to reorder | ❌ Not implemented |
| Conditional formatting | Color cells based on value thresholds | ❌ Not implemented |
| Data bars | Show data bars within cells for numeric values | ❌ Not implemented |
| Pagination | Navigate through large datasets with page controls | ❌ Not implemented |
| Export from widget | Export individual table data as CSV/Excel | ❌ Not implemented |

## Known Limitations

| Limitation | Workaround | Status |
|------------|------------|--------|
| Sticky headers require constrained container height | Full height chain (`h-full`) applied through `DashboardChartRenderer` → `ReportingPreview` → scroll container | ✅ Fixed |
| Sort state is client-side only | Not persisted in chart state or URL — resets on reload | By design |
| No virtual scrolling for large datasets | All rows rendered in DOM; may impact performance with thousands of rows | Future enhancement |

