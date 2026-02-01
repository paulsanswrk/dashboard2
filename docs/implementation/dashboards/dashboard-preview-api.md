# Dashboard Preview API & Logic

This document describes the implementation of the dashboard preview system, specifically the `/api/dashboards/[id]/preview` and `/api/dashboards/[id]/charts/[chartId]/data` endpoints.

## Overview

The dashboard preview system is designed to provide a highly performant and secure way to view dashboards, both for authenticated users and via public links. It uses a **Cache-Aware Progressive Loading Architecture** to ensure that dashboard metadata loads instantly, cached chart data is delivered with the initial response, and only uncached charts require additional requests.

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboards/[id]/preview` | `GET` | Fetches dashboard metadata, layout, sanitized widget state, and **cached chart data** when available. Checks for public access and password protection. |
| `/api/dashboards/[id]/charts/[chartId]/data` | `GET` | Fetches data for a specific chart. Supports live queries, caching, and filter injection. Only called for charts without cached data. |

## Cache-Aware Progressive Loading Architecture

### Request Flow

```
┌─────────────────┐     ┌──────────────────────┐
│   Dashboard     │────▶│  /preview endpoint   │
│   Preview Page  │     │  (includes cache     │
└────────┬────────┘     │   lookup)            │
         │              └──────────────────────┘
         ▼                        │
   ┌─────────────────────────────┐│
   │ Chart widgets receive:      ││
   │ • dataStatus: 'cached'      ││◀── Data embedded in response
   │   + data.columns, data.rows ││    (no additional request)
   │ • dataStatus: 'pending'     ││
   │   (no data embedded)        ││
   └───────────┬─────────────────┘│
               │                   │
               ▼ (only for 'pending')
   ┌─────────────────────────────┐
   │  /charts/{id}/data endpoint │
   │  (fetches + caches data)    │
   └─────────────────────────────┘
```

### Implementation Details

1. **Metadata Fetch with Cache Lookup**: The frontend calls `/api/dashboards/[id]/preview`.

2. **Parallel Cache Lookup**: The preview endpoint:
   - Queries dashboard metadata, tabs, and widgets
   - Collects all chart IDs
   - Performs parallel cache lookups for each chart
   - Uses `extractSqlFromState` and `extractDataConnectionId` utilities for consistent state parsing

3. **Response Structure**: For each chart widget, the response includes:
   - If cached: `{ dataStatus: 'cached', data: { columns: [...], rows: [...] } }`
   - If not cached: `{ dataStatus: 'pending' }` (data field omitted)

4. **Sanitization**: Chart state is sanitized using `sanitizeChartState` to strip sensitive fields like `actualExecutedSql` and `sqlParams`.

5. **Frontend Handling**: The `DashboardChartRenderer` component:
   - For `dataStatus: 'cached'`: Uses embedded data directly (no API call)
   - For `dataStatus: 'pending'`: Calls `/charts/{id}/data` endpoint to fetch data

### Performance Impact

| Scenario | Before | After |
|----------|--------|-------|
| All charts cached | 2 requests (preview + data) | 1 request (preview only) |
| No charts cached | 2 requests | 2 requests (unchanged) |
| Mixed (some cached) | N+1 requests | 1 + uncached count |

## Security & Authentication

### Public vs. Private
- **Private Dashboards**: Require an authenticated user with appropriate permissions (Creator, Admin, or delegated access).
- **Public Dashboards**: Accessible to everyone unless password-protected.

### Password Protection
Public dashboards can be secured with a password.
1. If a password is set, the preview API returns `{ requiresPassword: true }`.
2. The user enters the password, which is verified via `/api/dashboards/[id]/verify-password`.
3. Upon success, a secure cookie `dashboard_[id]_auth` is set, containing a hashed token.
4. **Auth Token Propagation**: Both the preview endpoint and the chart data endpoint check for this cookie (passed as an `authToken` query parameter) to authorize access.

## Data Source Handling

The system supports multiple data storage locations:
- **external**: Standard MySQL connections.
- **optiqoflow**: Postgres-based multi-tenant storage.
- **supabase_synced**: Internal Supabase-managed storage.

### Optiqoflow Tenant Fallback (Fix implemented Feb 2026)
Optiqoflow connections require a `tenant_id` for isolation. In a standard session, this is derived from the user's profile.
- **Problem**: Public/Preview sessions often lack a user profile, causing `tenant_id` resolution to fail.
- **Solution**: The chart data API now implements a **Dashboard Organization Fallback**. If no user session is present, it uses the `organization_id` associated with the dashboard itself to resolve the `tenant_id`, ensuring public charts load correctly.

## Cache System

### Cache Key Generation
Cache keys are generated using `generateCacheKey(chartId, { sql, dataSource, filters })`:
- SQL query text
- Data source type
- Applied filters (for filtered cache entries)

### Cache Lookup in Preview
The preview endpoint performs cache lookups using:
- `effectiveTenantId`: Resolved from dashboard's organization
- `cacheKey`: Generated from chart's SQL (no filters applied for base cache)

### When Cache Is Missing
Charts return `dataStatus: 'pending'` when:
- No SQL in chart state (new/unsaved chart)
- No `dataConnectionId` configured
- Cache entry not found or expired

## Debugging Common Issues

### EAI_AGAIN (DNS Resolution)
If a chart fails with `EAI_AGAIN internal`, it usually means the system tried to use a standard MySQL client to connect to an `internal` host (used by Optiqoflow).
- **Check**: Ensure the `storage_location` in `data_connections` is correctly set to `optiqoflow`.
- **Implementation**: The code must route these requests through `executeOptiqoflowQuery` rather than `withMySqlConnection`.

### Missing SQL in Preview
If a chart loads but is empty or shows "Missing SQL":
- **Check**: Ensure `sanitizeChartState` isn't stripping necessary metadata.
- **Verification**: View the chart in the builder to ensure SQL has been generated and saved to `state_json`.

### Cache Not Working
If charts always show `dataStatus: 'pending'`:
- **Check server logs** for: `[preview.get.ts] Chart X: sql=missing, connectionId=Y`
- **Verify SQL exists** in chart's `state_json.internal.actualExecutedSql`
- **Check tenant ID**: Ensure dashboard's organization has a valid `tenant_id`
- **Verify cache entry**: Query `chart_data_cache` table for matching `chart_id` and `tenant_id`
