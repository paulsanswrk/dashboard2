# Dashboard Charts Implementation

## Overview

This document outlines the implementation of dashboard charts functionality, allowing users to save charts from the Report Builder and organize them on dashboards with custom positioning.

## 🎯 Key Features

- **Chart Saving**: Save complete chart configurations including SQL queries, appearance settings, and chart types
- **Dashboard Organization**: Create dashboards that can contain multiple charts with custom positioning
- **Vue Grid Layout Integration**: Charts are positioned using Vue Grid Layout for responsive dashboard layouts
- **Complete State Preservation**: All chart state (SQL, filters, appearance, chart type) is preserved

## 🗄️ Database Schema

### Tables Created/Modified

#### `charts` Table (Renamed from `reporting_reports`)
```sql
CREATE TABLE public.charts (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    description text,
    owner_email text NOT NULL,
    owner_id uuid,
    state_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key Fields:**
- `state_json`: Complete chart state including SQL, filters, appearance, and chart configuration
- `owner_id`: Links to Supabase auth.users for ownership verification

#### `dashboard_charts` Table (Junction Table)
```sql
CREATE TABLE public.dashboard_charts (
    dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    chart_id bigint NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
    position jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (dashboard_id, chart_id)
);
```

**Key Fields:**
- `position`: JSON object containing Vue Grid Layout position data (x, y, width, height, etc.)
- Composite primary key ensures each chart appears only once per dashboard

#### `dashboards` Table (Existing)
- Referenced by `dashboard_charts` for ownership and permissions

## 🔧 API Endpoints

### Charts API (`/api/reporting/charts/`)

#### `POST /api/reporting/charts/`
Creates a new saved chart.
- **Input**: `{ name, description?, state }`
- **Output**: `{ success: true, chartId: number }`
- **Authentication**: Required, verifies ownership

#### `GET /api/reporting/charts/`
Lists saved charts for the authenticated user.
- **Query Params**: `id?` (optional - get specific chart)
- **Output**: Array of chart objects or single chart object

#### `PUT /api/reporting/charts/`
Updates an existing chart.
- **Input**: `{ id, name?, description?, state? }`
- **Authentication**: Required, verifies ownership

#### `DELETE /api/reporting/charts/`
Deletes a chart.
- **Query Params**: `id`
- **Authentication**: Required, verifies ownership

### Dashboard Charts API (`/api/dashboard-reports/`)

#### `POST /api/dashboard-reports/`
Adds a chart to a dashboard with positioning.
- **Input**: `{ dashboardId, chartId, position }`
- **Output**: `{ success: true }`
- **Authentication**: Required, verifies ownership of both dashboard and chart

### Dashboards API (`/api/dashboards`)

Server endpoints for managing dashboards and layouts.

#### `GET /api/dashboards`
Lists dashboards owned by the authenticated user.

#### `GET /api/dashboards/:id`
Returns dashboard with chart links and saved positions. Implementation avoids ambiguous PostgREST embeds by fetching `dashboard_charts` and `charts` separately and mapping server-side.

#### `PUT /api/dashboards`
Updates dashboard name and/or layout positions. Input: `{ id, name?, layout?: [{ chartId, position }] }`.

#### `DELETE /api/dashboards?id=...`
Deletes a dashboard (owner-only).

### Dashboard Full Load API (`/api/dashboards/[id]/full`)

Single endpoint that returns everything needed to render a dashboard:
- If `is_public` is true: no auth required; otherwise only the owner can load.
- Loads Supabase entities first (dashboard, links, charts), then executes external SQL for each chart in parallel using the saved `dataConnectionId`.
- Response:
```
{
  id, name, isPublic, createdAt,
  charts: [{ id, name, position, state, data: { columns, rows, meta } }]
}
```

## 🎨 Frontend Components

### `SelectBoardModal.vue` (New)
Modal for selecting where to save a chart (New Dashboard or Existing Dashboard).
- **Features**: Radio button selection, conditional search dropdown
- **Props**: `isOpen`, `modelValue`
- **Emits**: `close`, `save`

### `ChartsModal.vue` (Renamed from `ReportsModal.vue`)
Modal for managing saved charts (Save/Load functionality).
- **Features**: List saved charts, load existing charts, save current chart
- **Props**: Chart state props (useSql, chartType, etc.)
- **Emits**: `close`, `load-chart`

### `ReportingBuilder.vue` (Enhanced)
Enhanced to support dashboard saving functionality.
- **New Features**:
  - "Save Chart to Dashboard" button
  - Integration with SelectBoardModal
  - Complete chart state saving (SQL, appearance, chart type)
  - Dashboard chart relationship creation

### Dashboards UI

#### `pages/dashboards/index.vue` (New)
Lists user dashboards with Create/Edit/Delete actions.

#### `pages/dashboards/[id].vue` (New)
Edit Dashboard page using Vue Grid Layout with device preview toggles (desktop/tablet/mobile). Uses `ClientOnly` and a client-only plugin to avoid SSR DOM access. Loads data via `GET /api/dashboards/[id]/full` and passes preloaded data to chart renderer.

#### `DashboardChartRenderer.vue` (New)
Renders saved chart state without builder controls. Props:
- `state`: saved chart state_json
- `preloadedColumns?`, `preloadedRows?`: when provided (from the full endpoint), the component renders immediately without making client data requests.

#### Client plugin (New)
- `plugins/vue3-grid-layout.client.ts` registers `GridLayout` and `GridItem` on the client to prevent `document is not defined` during SSR.

## 🔄 Data Flow

### Chart Saving Process
1. User creates chart in Report Builder
2. Clicks "Save Chart to Dashboard"
3. Selects destination (New Dashboard or Existing Dashboard)
4. System:
   - Saves complete chart state to `charts` table
   - Creates new dashboard if selected
   - Creates entry in `dashboard_charts` with positioning
   - Shows success confirmation

### Chart Loading Process
1. User opens saved chart from ChartsModal
2. System:
   - Retrieves complete chart state from `charts` table
   - Restores all settings (SQL, filters, appearance, chart type)
   - Updates URL parameters for connection persistence

### Dashboard Loading Process (Single Request)
1. Client calls `GET /api/dashboards/[id]/full`.
2. Server loads dashboard, links, and charts from Supabase.
3. For each chart with SQL state, server runs external queries in parallel using the saved `dataConnectionId` (LIMIT enforced; destructive statements blocked).
4. Server returns a single payload with layout, chart configs, and chart data.

## 📊 Chart State Structure

Complete chart state saved in `state_json`:

```typescript
{
  // Connection & Dataset
  selectedDatasetId: string | null,
  dataConnectionId: number | null,

  // Dimensions & Metrics
  xDimensions: Field[],
  yMetrics: Field[],
  filters: Filter[],
  breakdowns: Field[],
  excludeNullsInDimensions: boolean,

  // Appearance
  appearance: {
    palette: any[],
    stacked: boolean,
    chartTitle: string,
    dateFormat: string,
    xAxisLabel: string,
    yAxisLabel: string,
    legendTitle: string,
    numberFormat: { decimalPlaces: number, thousandsSeparator: boolean },
    legendPosition: string
  },

  // SQL Configuration
  useSql: boolean,
  overrideSql: boolean,
  sqlText: string,
  actualExecutedSql: string,

  // Chart Configuration
  chartType: 'table' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey'
}
```

## 🚀 Migration History

### Applied Migrations:
1. **`20251029120000_comprehensive_chart_migration.sql`**
   - Renames `reporting_reports` → `charts`
   - Creates `dashboard_charts` table with proper schema
   - Adds indexes and comments

2. **`20251029120002_cleanup_dashboard_tables.sql`** (Pending)
   - Removes legacy `dashboard_reports` table
   - Ensures column naming consistency (`chart_id`)
   - Updates constraints and indexes

## 🔒 Security & Permissions

- **Authentication Required**: All endpoints require valid Supabase session
- **Ownership Verification**: Users can only access/modify their own charts and dashboards
- **Foreign Key Constraints**: CASCADE deletes ensure data integrity
- **Row Level Security**: Enforced through ownership checks in API layer

Full-load specifics:
- Public dashboards (`is_public = true`) can be loaded without a session.
- Private dashboards require ownership; sharing can extend this later.

## 🔮 Future Enhancements

### Potential Features:
- **Dashboard Sharing**: Allow dashboards to be shared with other users
- **Chart Templates**: Pre-built chart configurations
- **Bulk Operations**: Move/copy multiple charts between dashboards
- **Dashboard Themes**: Custom styling for entire dashboards
- **Chart Dependencies**: Link related charts with drill-down functionality

### Technical Improvements:
- **Real-time Collaboration**: Multiple users editing dashboards simultaneously
- **Chart Versioning**: Track changes and allow rollbacks
- **Performance Optimization**: Lazy loading for large dashboards
- **Export/Import**: Dashboard backup and restore functionality

## 📈 Performance Considerations

- **Indexes**: Proper indexing on `dashboard_id` and `chart_id` for efficient queries
- **JSON Storage**: Efficient storage of complex chart configurations
- **Connection Pooling**: Database connection management for concurrent users
- **Caching Strategy**: Potential for caching frequently accessed charts
 - **Parallel Server Fetch**: The full-load endpoint executes external SQL for all charts concurrently to reduce TTFB.
 - **SSR Safety**: Grid layout is registered in a client-only plugin and rendered inside `ClientOnly` to avoid accessing `document` during SSR.

## 🧪 Testing Coverage

### Manual Testing Performed:
- ✅ Chart saving with complete state preservation
- ✅ Dashboard creation and chart placement
- ✅ Chart loading and state restoration
- ✅ SQL query preservation and execution
- ✅ Chart type and appearance restoration
- ✅ Error handling for invalid operations

### Edge Cases Handled:
- Missing database connections
- Invalid chart configurations
- Ownership permission checks
- Duplicate chart placements prevented
- Legacy data migration compatibility

---

**Implementation Date**: October 29, 2025
**Status**: ✅ Complete and Ready for Production
**Migration Status**: Comprehensive migration applied, cleanup migration pending
