# Dashboard Performance Optimizations

## Overview

This document describes performance optimizations implemented for the dashboard page load and chart rendering pipeline.

## Implemented Optimizations

### 1. Chart Metadata Sanitization

**Problem**: Raw SQL queries were exposed in the `/api/dashboards/:id/full` response, creating a security risk and unnecessarily increasing response size.

**Solution**: Created `server/utils/sanitizeChartState.ts` that strips sensitive fields before transmission.

| Stripped Fields | Reason |
|----------------|--------|
| `actualExecutedSql` | Security - raw SQL exposure |
| `sqlText` | Security - raw SQL exposure |
| `sqlParams` | Security - parameter values |
| `overrideSql` | Redundant metadata |
| `useSql` | Can infer from SQL presence |

### 2. Cached Data Preloading

**Problem**: All charts would fetch data individually after initial page load, causing a waterfall pattern.

**Solution**: Modified `/api/dashboards/:id/full` to:
1. Resolve tenant ID from dashboard's organization
2. Query `chart_data_cache` for each chart in parallel
3. Include `preloadedColumns`, `preloadedRows`, and `dataStatus` for cached charts

The client-side `mapWidget()` in `pages/dashboards/[id].vue` passes these fields through to `Dashboard.vue`, which forwards them to `DashboardChartRenderer`. If `dataStatus === 'cached'` and no dashboard filters are active, the renderer uses the preloaded data directly **without making a `/data` API call**.

**Response Structure**:
```typescript
{
  // ... dashboard metadata
  tabs: [{
    widgetsLoaded: true | false,
    widgets: [{
      type: 'chart',
      state: { /* sanitized chart config */ },
      dataStatus: 'cached' | 'pending',
      preloadedColumns?: Array<{key, label}>,
      preloadedRows?: Array<Record<string, unknown>>
    }]
  }]
}
```

### 3. Progressive Loading with Status

**Problem**: No indication whether a chart had cached data available.

**Solution**: Added `dataStatus` field:
- `cached`: Render immediately with preloaded data
- `pending`: Show loading spinner, fetch via `/charts/:chartId/data`

### 4. Parallel Client-Side Data Fetching

**Problem**: `onMounted` executed sequentially: `await loadUserProfile()` → `await Promise.all([load(), loadConnections()])`, and `loadFilters()` was called inside `load()` after the main data had returned. This created a ~400ms+ waterfall.

**Solution**: All initial fetches now run in parallel via a single `Promise.all`:
```typescript
onMounted(async () => {
  const fetches = [
    loadUserProfile(),
    loadDashboard(true),
    loadFilters()
  ]
  if (isEditMode.value) {
    fetches.push(loadConnections())
  }
  await Promise.all(fetches)
})
```

### 5. Deferred Connection Loading

**Problem**: `/api/reporting/connections` (4+ DB queries, ~215ms) was always fetched, even in view mode where connections aren't needed.

**Solution**: `loadConnections()` is only called when the URL contains `/edit` (checked via `isEditMode`, which is URL-based and instantly available). Uses `isEditMode` rather than `isEditableSession` to avoid a race condition with the profile load.

### 6. Active Tab Lazy Loading

**Problem**: `/api/dashboards/:id/full` loaded widgets and ran cache lookups for **all tabs**, but only the first tab's charts are rendered initially.

**Solution**: Three-part change:

#### Server-side: `full.get.ts` accepts `activeTabId` query param
- Accepts `activeTabId` (or the `__first__` sentinel, resolved to the first tab after tab metadata loads)
- Loads widgets only for `WHERE tab_id = activeTabId`
- Returns other tabs with `widgets: []` and `widgetsLoaded: false`
- Omitting `activeTabId` gives full behavior (backward compatible for PDF rendering, reports)

#### New endpoint: `/api/dashboards/:id/tabs/:tabId/widgets`
- Lightweight endpoint that loads widgets, chart metadata, and cached data for a single tab
- Uses `AuthHelper` for access control
- Same cache lookup pattern as `full.get.ts`

#### Client-side: `selectTab()` lazy-loads
```typescript
async function selectTab(tabId: string) {
  activeTabId.value = tabId
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab && !tab.widgetsLoaded) {
    await loadTabWidgets(tabId)
  }
  // ... layout update
}
```

`loadDashboard(initialLoad)` accepts a boolean:
- `true` (initial mount): passes `__first__` for tab-scoped loading
- `false` (after widget add/delete): loads all tabs to stay in sync

---

## Remaining Optimization Opportunities

### High Priority

#### 1. Server-Side Access Control Consolidation
**Current**: `data.get.ts` re-validates dashboard access independently per chart.
**Recommendation**: Use a shared session/token from `full.get.ts`.

#### 2. Dashboard List Elimination
**Current**: `/api/dashboards` (full list, ~237ms) is fetched but only used in the "Add Chart" gallery modal.
**Recommendation**: Lazy-load on modal open.

#### 3. Cache Warming for Active Dashboards
**Current**: Cache only populated after first chart view.
**Recommendation**: Implement background cache warming for frequently accessed dashboards.

### Medium Priority

#### 4. Font Loading Optimization
**Current**: Loading 7 Google Font families with all weights.
**Recommendation**: 
- Use `font-display: swap`
- Subset fonts to used characters
- Preload critical fonts

#### 5. Response Compression
**Current**: Large chart data responses sent uncompressed.
**Recommendation**: Enable Brotli/gzip compression at the edge.

### Low Priority

#### 6. Virtual Scrolling for Large Dashboards
**Current**: All widgets rendered in DOM regardless of viewport.
**Recommendation**: Implement virtual scrolling for dashboards with 20+ widgets.

#### 7. Service Worker Caching
**Current**: No offline support for dashboard metadata.
**Recommendation**: Cache dashboard structure for instant repeat visits.

---

## Files Modified

| File | Changes |
|------|---------|
| `server/utils/sanitizeChartState.ts` | Strips sensitive fields from chart state |
| `server/api/dashboards/[id]/full.get.ts` | Cache lookups, sanitization, `activeTabId` param for tab-scoped loading |
| `server/api/dashboards/[id]/tabs/[tabId]/widgets.get.ts` | **New** — lazy-loads widgets for a single tab |
| `composables/useDashboardsService.ts` | Updated types (`dataStatus`, `preloadedColumns/Rows`, `widgetsLoaded`) and `getDashboardFull` signature |
| `pages/dashboards/[id].vue` | Parallel fetches, preloaded data passthrough, deferred connections, lazy tab loading |
| `components/Dashboard.vue` | `dataStatus` prop handling and passthrough to renderer |
| `components/DashboardChartRenderer.vue` | Loading logic for cached data — skips `/data` API call when cached |

## Related Documentation

- [Multi-Tenant Data Architecture](../optiqoflow/multi-tenant-data-architecture.md) - Cache table schema
- [Dashboard Charts Implementation](./dashboard-charts-implementation.md) - Chart loading process
