# Multi-Tab Dashboard Charts Implementation

## Overview

This document outlines the implementation of multi-tab dashboard charts functionality, allowing users to save charts from the Report Builder and organize them across multiple tabs within dashboards with custom positioning.

## 🎯 Key Features

- **Chart Saving**: Save complete chart configurations including SQL, appearance, chart type, and PNG thumbnails plus width/height
- **Dynamic Widget Sizing**: Charts saved to dashboards are automatically sized based on their rendered dimensions
- **Multi-Tab Dashboard Organization**: Create dashboards with multiple tabs, each containing charts with custom positioning
- **Dashboard Thumbnails**: Dashboards capture PNG thumbnails on save (client-side snapshot) and store width/height
- **Tab Management**: Create, rename, and delete dashboard tabs with full CRUD operations
- **Vue Grid Layout Integration**: Charts are positioned using Vue Grid Layout for responsive dashboard layouts
- **Auto-saving**: Dashboard changes (name, layout, widget properties) are automatically saved with debouncing
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
    data_connection_id bigint REFERENCES public.data_connections(id),
    width integer,
    height integer,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key Fields:**
- `state_json`: Complete chart state including SQL, filters, appearance, and chart configuration
- `data_connection_id`: Stored alongside state for quicker filtering
- `width` / `height`: Captured client-side canvas size when saved
- `thumbnail_url`: Public URL to PNG stored in the `chart-thumbnails` bucket (PNG-only, generated client-side)
- `owner_id`: Links to Supabase auth.users for ownership verification

#### `dashboard_widgets` Table (Unified widgets)
```sql
CREATE TABLE public.dashboard_widgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    tab_id uuid NOT NULL REFERENCES public.dashboard_tab(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('chart','text','image','icon')),
    chart_id bigint REFERENCES public.charts(id) ON DELETE CASCADE,
    position jsonb NOT NULL,
    style jsonb NOT NULL DEFAULT '{}'::jsonb,
    config_override jsonb NOT NULL DEFAULT '{}'::jsonb,
    z_index integer NOT NULL DEFAULT 0,
    is_locked boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Key Fields:**

- `type`: widget flavor (`chart`, `text`, `image`, `icon`)
- `chart_id`: set when `type='chart'`
- `position`: Vue Grid Layout position data `{x,y,w,h,minW?,minH?}`
- `style`: widget-specific style payload (e.g., text formatting)
- `config_override`: per-instance overrides (charts)
- `z_index`, `is_locked`: layering and lock state

#### `reports` Table (Modified)

```sql
-- Reports can now reference either entire dashboards or specific tabs
-- scope: 'Dashboard' or 'Single Tab'
-- dashboard_id: set when scope = 'Dashboard'
-- tab_id: set when scope = 'Single Tab'
```

#### `dashboards` Table (Existing, extended)
- Referenced by `dashboard_charts` for ownership and permissions
- Extended with:
    - `width integer`
    - `height integer`
    - `thumbnail_url text` (PNG stored in `dashboard-thumbnails` bucket, generated client-side with `html-to-image`)

## 🔧 API Endpoints

### Charts API (`/api/reporting/charts/`)

#### `POST /api/reporting/charts/`
Creates a new saved chart.

- **Input**: `{ name, description?, state, width?, height?, thumbnailBase64? }`
- **Output**: `{ success: true, chartId: number }`
- **Authentication**: Required, verifies ownership

#### `GET /api/reporting/charts/`
Lists saved charts for the authenticated user.
- **Query Params**: `id?` (optional - get specific chart)
- **Output**: Array of chart objects or single chart object

#### `PUT /api/reporting/charts/`
Updates an existing chart.

- **Input**: `{ id, name?, description?, state?, width?, height?, thumbnailBase64? }`
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

- Returns `width`, `height`, and `thumbnail_url` for cards/list thumbnails.

#### `GET /api/dashboards/:id/full`

Returns dashboard metadata with all tabs and widget configurations. **Does NOT fetch chart data** - charts load their data progressively.

Returns `{ id, name, isPublic, createdAt, width?, height?, thumbnailUrl?, tabs: [{ id, name, position, widgets: [...] }] }`.

- **Authentication**: Required for private dashboards, public access for public dashboards
- **Server Processing**: Loads dashboard, tabs, widgets, and chart configurations (no SQL queries)

#### `PUT /api/dashboards`

Updates dashboard metadata.

- **Input**: `{ id, name?, layout?, width?, height?, thumbnailBase64? }`
- **Output**: `{ success: true }`

#### `DELETE /api/dashboards?id=...`
Deletes a dashboard (owner-only).

### Dashboard Full Load API (`/api/dashboards/[id]/full`)

Returns dashboard structure and widget metadata for immediate rendering. Sensitive fields are stored under `state_json.internal` and are removed from the response if the user is not the owner.

- Auth behavior:
  - Public dashboards: response is public-safe (no internal fields)
  - Private dashboards: only the owner may load; owner receives flattened state (public + internal fields)
- Server process:
    1) Load dashboard, tabs, widgets, and chart configurations from Supabase.
    2) Return metadata immediately (no SQL execution).
- Response structure: `{ id, name, isPublic, createdAt, tabs: [{ id, name, position, widgets: [{ widgetId, type, name, position, state, configOverride, style }] }] }`

### Chart Data API (`/api/dashboards/[id]/charts/[chartId]/data`) - NEW

Fetches data for a specific chart. Designed for progressive loading and future caching.

- **Method**: GET
- **Query Params**: `context?` (render context token), `filterOverrides?` (JSON array)
- **Response**: `{ columns: [...], rows: [...], meta?: { error?: string } }`
- **Server process**:
    1) Validate dashboard access and chart ownership
    2) Load chart SQL from `state_json.internal`
    3) Execute query via connection config or internal storage
    4) Return data or error

Note: Charts saved prior to the internal refactor (without `state_json.internal`) are not supported.

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
  - Captures chart thumbnails (PNG) with width/height and uploads to `chart-thumbnails`

### Dashboards UI

#### `pages/dashboards/index.vue` (New)
Lists user dashboards with Create/Edit/Delete actions.

- Provides List/Grid layout toggle (pill control) with persisted preference (localStorage).
- Grid view shows dashboard thumbnails (from `thumbnail_url`) with created date; fallback text when missing.

#### `pages/dashboards/[id].vue` (Enhanced)

Multi-tab dashboard editor with integrated toolbar and unified widgets. Highlights:

- **Unified widgets**: Charts and text blocks share the same grid via `dashboard_widgets`.
- **Sidebar**: `WidgetOptionsSidebar` swaps panels by widget type (text/chart); per-widget menus removed.
- **Text blocks**: Inline editable content; sidebar controls (font, size, padding, colors, shape, shadow, alignment); compact defaults (h=2).
- **Chart blocks**: Inline title editing (debounced save); actions handled in the sidebar.
- **Grid**: Vue Grid Layout; reduced min item height for compact widgets; drag/resize only in edit mode.
- **Tab Management**: Create, rename, delete tabs; outlined navigation.
- **Auto-saving**: Dashboard name changes and widget layout changes are automatically saved with 500ms debouncing.
- **Toolbar**: Edit/Done toggle, device previews, Auto Layout, Add Chart, Add Text, Show Options (sidebar toggle).
- **Thumbnails**: Captured with `html-to-image` on save (width/height/thumbnail_url persisted).

#### `DashboardChartRenderer.vue`
Renders saved chart state without builder controls. Supports progressive loading.

Props:
- `state`: saved chart state_json
- `dashboardId?`: dashboard ID for on-demand data fetching
- `chartId?`: chart ID for on-demand data fetching
- `configOverride?`: per-instance appearance overrides
- `dashboardFilters?`: applied dashboard-level filters
- `tabStyle?`: tab-level style options

Loading behavior:
1. If `dashboardId` and `chartId` provided: fetches data from `/api/dashboards/:id/charts/:chartId/data`
2. Otherwise: falls back to `useReportingService` composable

#### Client plugin (New)
- `plugins/vue3-grid-layout.client.ts` registers `GridLayout` and `GridItem` on the client to prevent `document is not defined` during SSR.

## 🔄 Data Flow

### Chart Saving Process
1. User creates chart in Report Builder
2. Clicks "Save Chart to Dashboard"
3. Selects destination (New Dashboard or Existing Dashboard Tab)
4. System:
   - Captures chart dimensions (width/height) from the rendered preview
   - Converts pixel dimensions to grid units using `pixelDimensionsToGridUnits()`:
     - Width (w): Maps pixel width to grid columns (1-12) based on container width ratio
     - Height (h): Converts pixel height to row units (pixels ÷ 30px row height, minimum 4 rows)
   - Saves complete chart state to `charts` table (including width/height for thumbnails)
   - Creates new dashboard/tab if selected
   - Creates entry in `dashboard_widgets` linking chart to tab with calculated positioning
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

### Dashboard Loading Process (Progressive)
1. Client calls `GET /api/dashboards/[id]/full`.
2. Server loads dashboard metadata, tabs, widgets, and chart configurations from Supabase.
3. Server returns immediately with dashboard structure (no SQL execution).
4. Client renders dashboard layout with loading spinners for each chart.
5. Each chart independently calls `GET /api/dashboards/[id]/charts/[chartId]/data`.
6. Charts render as their data arrives - failing charts don't block others.

### Auto-Saving Process

- **Dashboard Name Changes**: Debounced with 500ms delay, automatically saves via `PUT /api/dashboards` with name parameter.
- **Layout Changes**: Debounced with 500ms delay, automatically saves via `PUT /api/dashboards` with layout parameter containing widget positions.
- **Text Widget Changes**: Debounced with 200ms delay, saves via `PUT /api/dashboard-widgets`.
- **Chart Appearance Changes**: Debounced with 250ms delay, saves via `PUT /api/dashboard-widgets`.
- **Chart Renames**: Debounced with 300ms delay, saves via `PUT /api/reporting/charts`.

### Edit/View Mode Toggle

- **Edit Mode**: Enabled when accessing `/dashboards/[id]/edit`, shows editing toolbar and allows widget manipulation.
- **View Mode**: Default mode at `/dashboards/[id]`, read-only display of dashboard.
- **Mode Switching**: "Edit"/"Done" button toggles between modes without saving operations.

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

3. **`20251209120000_add_dashboard_thumbnail_columns.sql`**
    - Adds `width`, `height`, `thumbnail_url` to `dashboards`
    - Complements earlier addition of width/height/thumbnail to `charts`

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
- **Debounced Auto-saving**: Changes are automatically saved with 200-500ms debouncing to reduce server load while maintaining responsiveness
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
- ✅ Auto-saving for dashboard name changes (500ms debounce)
- ✅ Auto-saving for widget layout changes (500ms debounce)
- ✅ Edit/View mode toggle without manual saving

### Edge Cases Handled:
- Missing database connections
- Invalid chart configurations
- Ownership permission checks
- Duplicate chart placements prevented
- Legacy data migration compatibility

---

**Implementation Date**: October 29, 2025
**Auto-saving Enhancement**: December 12, 2025
**Status**: ✅ Complete and Ready for Production
**Migration Status**: Comprehensive migration applied, cleanup migration pending
