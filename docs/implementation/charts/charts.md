# Charts Implementation Documentation

## Overview

This document describes the comprehensive charts implementation for the Optiqo dashboard, featuring a complete migration from Chart.js to Apache ECharts with support for 12 different chart types and an intelligent, adaptive zone system.

## Migration from Chart.js to Apache ECharts

### Background
The original implementation used Chart.js v4.4.4 loaded via CDN for basic charting functionality, supporting only 6 chart types with limited customization options.

### Migration Strategy
- **Replaced Chart.js dependency** with ECharts v5.5.0 as a proper npm package
- **Eliminated CDN loading** in favor of proper bundling and tree-shaking
- **Maintained API compatibility** while enhancing functionality
- **Preserved all existing features** while adding new capabilities

### Key Improvements
- **Better Performance**: ECharts offers superior rendering performance, especially for large datasets
- **Enhanced Features**: Richer customization options and built-in animations
- **Better Responsiveness**: Improved responsive behavior across devices
- **Modern Architecture**: Proper dependency management and TypeScript support

## Supported Chart Types

The implementation now supports **21 comprehensive chart types**, each with intelligent zone configuration matching the original Optiqo app:

### 1. Table/Grid View
- **Purpose**: Data table display for detailed record viewing
- **Zones**: Columns (Text), Columns (Aggregated), Cross Tab Dimension
- **Use Case**: Detailed data inspection and export

### 2. Bar/Column Chart
- **Purpose**: Compare values across categories
- **Zones**: X-Axis, Y-Axis, Break Down By
- **Features**: Stacking support, horizontal/vertical orientation

### 3. Line Chart
- **Purpose**: Show trends and changes over time
- **Zones**: X-Axis, Y-Axis, Break Down By
- **Features**: Smooth curves, markers, trend analysis

### 4. Area Chart
- **Purpose**: Emphasize magnitude of change over time
- **Zones**: X-Axis, Y-Axis, Break Down By
- **Features**: Filled areas under lines, opacity control

### 5. Pie Chart
- **Purpose**: Show parts of a whole
- **Zones**: Divide By, Measure
- **Features**: Customizable radius, legend positioning

### 6. Donut Chart
- **Purpose**: Show parts of a whole with hollow center
- **Zones**: Divide By, Measure
- **Features**: Configurable inner radius, emphasis effects

### 7. Funnel Chart
- **Purpose**: Show sequential stages in a process
- **Zones**: Stages, Measure, Break Down By
- **Features**: Automatic sorting, proportional sizing

### 8. Number/Gauge/KPI

- **Purpose**: Display single values against a target
- **Zones**: Measure, Target Value
- **Features**: Configurable ranges, needle styling, animations

### 9. Map/Geographic Visualization
- **Purpose**: Show data geographically
- **Zones**: Location, Measure, Break Down By
- **Features**: World map integration, color mapping, zooming

### 10. Scatter Plot
- **Purpose**: Show relationship between two variables
- **Zones**: X-Axis, Y-Axis, Break Down By
- **Features**: Point sizing, correlation analysis

### 11. Bubble Chart

- **Purpose**: Show relationship with size encoding
- **Zones**: Category, Bubble Size, Break Down By
- **Features**: Bubble sizing, grouping

### 12. Treemap
- **Purpose**: Display hierarchical data as nested rectangles
- **Zones**: Divide By, Measure, Break Down By
- **Features**: Hierarchical layout, size-based coloring

### 13. Sankey/Flow Diagram
- **Purpose**: Show flow and distribution between nodes
- **Zones**: Source, Target, Values
- **Features**: Flow visualization, node-link diagrams

### 14. Word Cloud

- **Purpose**: Display word frequency visually
- **Zones**: Word List, Word Count
- **Features**: Automatic sizing, random positioning

### 15. Pivot Table

- **Purpose**: Cross-tabulation of data
- **Zones**: Columns, Values, Rows, Cross Tab Dimension
- **Features**: Aggregation, drill-down

## Intelligent Zone System

### Adaptive Zone Configuration

The system dynamically shows/hides zones and updates labels based on the selected chart type. Zone configurations are defined in `pages/reporting/builder.vue` and match the original Optiqo application at `admin.optiqo.report/#charts`.

```typescript
type ZoneConfig = {
  showXDimensions: boolean
  showYMetrics: boolean
  showBreakdowns: boolean
  showTargetValue: boolean    // For number, gauge, kpi
  showLocation: boolean       // For map
  showCrossTab: boolean       // For table, pivot
  xLabel?: string
  yLabel?: string
  breakdownLabel?: string
  targetValueLabel?: string
  locationLabel?: string
  crossTabLabel?: string
}
```

### Zone Configurations by Chart Type

| Chart Type           | X Zone           | Y Zone                 | Breakdown       | Special Zones         |
|----------------------|------------------|------------------------|-----------------|-----------------------|
| Table                | ✅ Columns (Text) | ✅ Columns (Aggregated) | ❌               | ✅ Cross Tab Dimension |
| Number/Gauge/KPI     | ❌                | ✅ Measure              | ❌               | ✅ Target Value        |
| Bar/Column/Line/Area | ✅ X-Axis         | ✅ Y-Axis               | ✅ Break Down By | ❌                     |
| Stacked/Waterfall    | ✅ X-Axis         | ✅ Y-Axis               | ✅ Break Down By | ❌                     |
| Pie/Donut            | ✅ Divide By      | ✅ Measure              | ❌               | ❌                     |
| Funnel               | ✅ Stages         | ✅ Measure              | ✅ Break Down By | ❌                     |
| Map                  | ❌                | ✅ Measure              | ✅ Break Down By | ✅ Location            |
| Scatter              | ✅ X-Axis         | ✅ Y-Axis               | ✅ Break Down By | ❌                     |
| Bubble               | ✅ Category       | ✅ Bubble Size          | ✅ Break Down By | ❌                     |
| Treemap              | ✅ Divide By      | ✅ Measure              | ✅ Break Down By | ❌                     |
| Sankey               | ✅ Source         | ✅ Target               | ✅ Values        | ❌                     |
| Radar/BoxPlot        | ✅ X-Axis         | ✅ Y-Axis               | ✅ Break Down By | ❌                     |
| Word Cloud           | ✅ Word List      | ✅ Word Count           | ❌               | ❌                     |
| Pivot                | ✅ Columns        | ✅ Values               | ✅ Rows          | ✅ Cross Tab Dimension |

### Dynamic Zone Rendering

The `ReportingZones.vue` component conditionally renders zones based on the current chart type configuration, providing context-appropriate labels and hiding irrelevant zones. The `Filter By` zone is always visible for all chart types.

## Technical Implementation

### Core Components

#### ReportingChart.vue
- **Primary chart rendering component**
- **ECharts integration** with proper initialization and cleanup
- **Type-safe chart type definitions**
- **Responsive container** with proper aspect ratios

#### ReportingBuilder.vue
- **Chart type selection interface**
- **Zone configuration computation**
- **Integration with reporting state management**

#### ReportingZones.vue
- **Dynamic zone rendering** based on chart type
- **Drag-and-drop functionality** for field assignment
- **Context-aware labeling**

### State Management

#### useReportState.ts
- **Centralized state** for all chart configuration
- **URL synchronization** for shareable report states
- **History management** with undo/redo functionality

### Chart State Structure

Charts store their complete configuration in `state_json`, which contains both public appearance settings and internal execution data:

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
    // ... additional appearance options
  }
  internal: {
    dataConnectionId: number
    selectedDatasetId: string
    xDimensions: DimensionRef[]
    yMetrics: MetricRef[]
    breakdowns: DimensionRef[]
    filters: FilterCondition[]
    joins: JoinConfig[]
    excludeNullsInDimensions: boolean
    useSql: boolean
    overrideSql: boolean
    sqlText: string
    actualExecutedSql: string        // Parameterized SQL with ? placeholders
    actualExecutedSqlParams: any[]   // Parameter values for the SQL placeholders
  }
}
```

#### SQL Parameter Storage

When charts are saved, both the parameterized SQL and its parameter values are stored:

- **`actualExecutedSql`**: The SQL query template with `?` placeholders for parameterized values
- **`actualExecutedSqlParams`**: Array of values corresponding to each `?` placeholder in order

This enables proper execution when rendering dashboards, as the stored params are passed to the database driver alongside the SQL template.

**Data Flow:**
1. `preview.post.ts` generates SQL with params and returns both in response
2. `ReportingBuilder.vue` stores both in chart state when saving
3. Dashboard rendering endpoints (`full.get.ts`, `preview.get.ts`) extract both and execute: `conn.query(sql, params)`

### Data Flow Architecture

```
User Selection → Chart Type → Zone Configuration → Data Binding → ECharts Rendering
     ↓              ↓              ↓              ↓              ↓
Chart Type   →  Zone Rules   →  Field Mapping  →  Data Transform → Visualization
Selection     Applied         to Zones         to ECharts      with Interactions
```

## Features Preserved and Enhanced

### ✅ Preserved Features
- **All existing styling options** (colors, fonts, spacing)
- **Number formatting** (decimal places, thousands separators)
- **Chart titles and labels**
- **Legend positioning and styling**
- **Click interactions** for drill-down functionality
- **Responsive design** and mobile compatibility

### ✨ Enhanced Features
- **12 chart types** vs. original 6
- **Intelligent zone adaptation**
- **Superior performance** with ECharts
- **Enhanced animations** and transitions
- **Better tooltip formatting**
- **Improved accessibility**

### 🎨 Styling and Theming
- **Consistent color palettes** across all chart types
- **Dark theme support** maintained
- **Customizable appearance** options
- **Responsive typography** and spacing

## Performance Optimizations

### ECharts Advantages
- **Better memory management** with proper disposal
- **Efficient rendering** for large datasets
- **Optimized bundle size** through tree-shaking
- **GPU acceleration** where supported

### Implementation Optimizations
- **Conditional rendering** of zones based on chart type
- **Efficient data transformation** for ECharts format
- **Proper event handling** with cleanup
- **Responsive chart sizing** with container queries

## Future Considerations

### Potential Enhancements
1. **Chart Type Presets**: Save and reuse chart configurations
2. **Advanced Map Support**: Custom region definitions and geoJSON support
3. **Animation Controls**: User-controllable animation settings
4. **Export Options**: Enhanced export capabilities for different formats
5. **Real-time Updates**: WebSocket integration for live data

### Technical Debt
1. **Zone Configuration**: Currently hardcoded, could be made more configurable
2. **Chart Type Detection**: Could be enhanced with AI-powered recommendations
3. **Performance Monitoring**: Add metrics for chart rendering performance

## Testing and Quality Assurance

### Coverage Areas
- **All 12 chart types** render correctly
- **Zone adaptation** works for each chart type
- **Data transformation** produces valid ECharts configurations
- **Click interactions** trigger appropriate drill-down events
- **Responsive behavior** across different screen sizes
- **Styling consistency** with existing design system

### Edge Cases Handled
- **Empty datasets** show appropriate fallbacks
- **Invalid data types** are handled gracefully
- **Missing required fields** show helpful error states
- **Large datasets** maintain performance

## Conclusion

This implementation represents a significant upgrade from the original Chart.js-based system, providing users with a comprehensive, intelligent, and high-performance charting solution that adapts to their specific visualization needs while maintaining full backward compatibility.

The intelligent zone system ensures that users only see relevant data assignment options for each chart type, reducing cognitive load and improving the overall user experience. The migration to ECharts provides a solid foundation for future enhancements and ensures the platform can handle modern data visualization requirements.
