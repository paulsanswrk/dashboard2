# Dashboard Performance Optimizations

## Overview

This document describes performance optimizations implemented for dashboard chart loading and identifies additional optimization opportunities.

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

**Response Structure**:
```typescript
{
  // ... dashboard metadata
  tabs: [{
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

---

## Remaining Optimization Opportunities

### High Priority

#### 1. Parallel Database Queries in `/full` Endpoint
**Current**: Dashboard, tabs, widgets, and charts are loaded sequentially.
**Recommendation**: Use `Promise.all()` to parallelize independent queries.

```typescript
const [tabs, widgets, charts] = await Promise.all([
  loadTabs(dashboardId),
  loadWidgets(dashboardId),
  loadCharts(chartIds)
])
```
**Expected Impact**: 30-50% reduction in `/full` response time.

#### 2. Shared Auth State (`useAuth` Composable)
**Current**: Each component using `useAuth()` triggers an independent profile fetch.
**Recommendation**: Refactor to use `useState()` for shared profile state.

```typescript
// Before: each component fetches independently
const { userProfile } = useAuth()

// After: shared state across all components
const userProfile = useState('userProfile', () => null)
```
**Expected Impact**: Eliminate 5-7 redundant `/profiles` API calls per page load.

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

#### 5. Connection Query Parallelization
**Current**: `/connections` endpoint may execute queries sequentially.
**Recommendation**: Batch schema introspection queries.

#### 6. Response Compression
**Current**: Large chart data responses sent uncompressed.
**Recommendation**: Enable Brotli/gzip compression at the edge.

### Low Priority

#### 7. Virtual Scrolling for Large Dashboards
**Current**: All widgets rendered in DOM regardless of viewport.
**Recommendation**: Implement virtual scrolling for dashboards with 20+ widgets.

#### 8. Service Worker Caching
**Current**: No offline support for dashboard metadata.
**Recommendation**: Cache dashboard structure for instant repeat visits.

---

## Files Modified

| File | Changes |
|------|---------|
| `server/utils/sanitizeChartState.ts` | New - strips sensitive fields |
| `server/api/dashboards/[id]/full.get.ts` | Added cache lookups and sanitization |
| `components/Dashboard.vue` | Added `dataStatus` prop handling |
| `components/DashboardChartRenderer.vue` | Updated loading logic for cached data |

## Related Documentation

- [Multi-Tenant Data Architecture](../optiqoflow/multi-tenant-data-architecture.md) - Cache table schema
- [Dashboard Charts Implementation](./dashboard-charts-implementation.md) - Chart loading process
