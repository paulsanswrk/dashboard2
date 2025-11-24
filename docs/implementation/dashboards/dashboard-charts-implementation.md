# Multi-Tab Dashboard Charts Implementation

## Overview

This document outlines the implementation of multi-tab dashboard charts functionality, allowing users to save charts from the Report Builder and organize them across multiple tabs within dashboards with custom positioning.

## 🎯 Key Features

- **Chart Saving**: Save complete chart configurations including SQL queries, appearance settings, and chart types
- **Multi-Tab Dashboard Organization**: Create dashboards with multiple tabs, each containing charts with custom positioning
- **Tab Management**: Create, rename, and delete dashboard tabs with full CRUD operations
- **Vue Grid Layout Integration**: Charts are positioned using Vue Grid Layout for responsive dashboard layouts
- **Complete State Preservation**: All chart state (SQL, filters, appearance, chart type) is preserved
- **Flexible Reporting**: Generate reports for entire dashboards or specific tabs

## 🗄️ Database Schema

### Tables Created/Modified

#### `dashboard_tab` Table (New)

```sql
CREATE TABLE public.dashboard_tab (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Key Fields:**

- `dashboard_id`: Reference to the parent dashboard
- `name`: Display name of the tab
- `position`: Order of tabs within the dashboard (0-based)

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

#### `dashboard_charts` Table (Junction Table - Modified)
```sql
CREATE TABLE public.dashboard_charts (
    tab_id UUID NOT NULL REFERENCES public.dashboard_tab(id) ON DELETE CASCADE,
    chart_id bigint NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
    position jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (tab_id, chart_id)
);
```

**Key Fields:**

- `tab_id`: Reference to the dashboard tab containing this chart
- `position`: JSON object containing Vue Grid Layout position data (x, y, width, height, etc.)
- Composite primary key ensures each chart appears only once per tab

#### `reports` Table (Modified)

```sql
-- Reports can now reference either entire dashboards or specific tabs
-- scope: 'Dashboard' or 'Single Tab'
-- dashboard_id: set when scope = 'Dashboard'
-- tab_id: set when scope = 'Single Tab'
```

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

### Dashboard Tabs API (`/api/dashboard-tabs/`)

#### `POST /api/dashboard-tabs/`

Adds a chart to a specific dashboard tab with positioning.

- **Input**: `{ tabId, chartId, position }`
- **Output**: `{ success: true }`
- **Authentication**: Required, verifies ownership of both tab and chart

### Dashboard Tabs Management API (`/api/dashboards/tabs/`)

#### `POST /api/dashboards/tabs/`

Creates a new tab in a dashboard.

- **Input**: `{ dashboardId, name }`
- **Output**: `{ success: true, tab: { id, name, position } }`
- **Authentication**: Required, verifies dashboard ownership

#### `PUT /api/dashboards/tabs/`

Updates a tab (rename or reposition).

- **Input**: `{ tabId, name?, position? }`
- **Output**: `{ success: true, tab: updatedTab }`
- **Authentication**: Required, verifies tab ownership

#### `DELETE /api/dashboards/tabs/`

Deletes a tab (cannot delete the last tab in a dashboard).

- **Query Params**: `id` (tab ID)
- **Output**: `{ success: true }`
- **Authentication**: Required, verifies tab ownership

### Dashboards API (`/api/dashboards`)

Server endpoints for managing dashboards and layouts.

#### `GET /api/dashboards`
Lists dashboards owned by the authenticated user.

#### `GET /api/dashboards/:id/full`

Returns complete dashboard with all tabs and their charts. Returns `{ id, name, isPublic, createdAt, tabs: [{ id, name, position, charts: [...] }] }`.

- **Authentication**: Required for private dashboards, public access for public dashboards
- **Server Processing**: Loads dashboard, tabs, charts, and executes SQL queries in parallel

#### `PUT /api/dashboards`

Updates dashboard name.

- **Input**: `{ id, name }`
- **Output**: `{ success: true }`

#### `DELETE /api/dashboards?id=...`
Deletes a dashboard (owner-only).

### Dashboard Full Load API (`/api/dashboards/[id]/full`)

Single endpoint that returns everything needed to render a multi-tab dashboard. Sensitive fields are stored under `state_json.internal` and are removed from the response if the user is not the owner.

- Auth behavior:
  - Public dashboards: response is public-safe (no internal fields), but includes chart data required for rendering.
  - Private dashboards: only the owner may load; owner receives flattened state (public + internal fields for backward compatibility).
- Server process:
    1) Load dashboard, tabs, chart links, and charts from Supabase.
    2) Use `state_json.internal` to execute external SQL for all charts in parallel across all tabs.
  3) Return data; omit SQL and internal fields for non-owners.
- Response structure: `{ id, name, isPublic, createdAt, tabs: [{ id, name, position, charts: [{ id, name, position, state, data: { columns, rows, meta? } }] }] }`

Note: Charts saved prior to this refactor (without `state_json.internal`) are not supported by this endpoint or the builder APIs.

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

#### `pages/dashboards/[id].vue` (Enhanced)

Multi-tab dashboard editor with integrated toolbar. Features:

- **Tab Navigation**: Outlined tab headers with active state indication (orange border-bottom)
- **Tab Management**: Create, rename, delete tabs with dropdown menus
- **Toolbar Integration**: Save Dashboard, device preview toggles, Auto Layout, Preview, Get PDF buttons within tab area
- **Chart Management**: Add charts to specific tabs, drag-and-drop positioning
- **Vue Grid Layout**: Responsive chart positioning with device-specific layouts
- Uses `ClientOnly` and client-only plugins to avoid SSR DOM access
- Loads data via `GET /api/dashboards/[id]/full` and renders tab-organized charts

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
3. Selects destination (New Dashboard or Existing Dashboard Tab)
4. System:
   - Saves complete chart state to `charts` table
   - Creates new dashboard/tab if selected
   - Creates entry in `dashboard_charts` linking chart to tab with positioning
   - Shows success confirmation

### Tab Management Process

1. User clicks "+" to create new tab or uses dropdown to rename/delete tabs
2. System validates permissions and tab constraints (minimum 1 tab per dashboard)
3. Updates `dashboard_tab` table and refreshes UI

### Chart Loading Process
1. User opens saved chart from ChartsModal
2. System:
   - Retrieves complete chart state from `charts` table
   - Restores all settings (SQL, filters, appearance, chart type)
   - Updates URL parameters for connection persistence

### Dashboard Loading Process (Multi-Tab)
1. Client calls `GET /api/dashboards/[id]/full`.
2. Server loads dashboard, all tabs, chart links, and charts from Supabase.
3. For each chart with SQL state across all tabs, server runs external queries in parallel using the saved `dataConnectionId` (LIMIT enforced; destructive statements blocked).
4. Server returns a single payload with dashboard info, tabs array, and chart data organized by tab.

## 📊 Chart State Structure

Complete chart state saved in `state_json` with sensitive fields wrapped under `internal`:

```typescript
{
  // Public part
  appearance: { /* palette, labels, legend, formatting */ },
  chartType: 'table' | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'funnel' | 'gauge' | 'map' | 'scatter' | 'treemap' | 'sankey',

  // Internal (non-public) builder/query configuration
  internal: {
    selectedDatasetId: string | null,
    dataConnectionId: number | null,
    xDimensions: Field[],
    yMetrics: Field[],
    filters: Filter[],
    breakdowns: Field[],
    excludeNullsInDimensions: boolean,
    useSql: boolean,
    overrideSql: boolean,
    sqlText: string,
    actualExecutedSql: string
  }
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
