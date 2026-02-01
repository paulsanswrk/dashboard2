# Dashboard Preview API & Logic

This document describes the implementation of the dashboard preview system, specifically the `/api/dashboards/[id]/preview` and `/api/dashboards/[id]/charts/[chartId]/data` endpoints.

## Overview

The dashboard preview system is designed to provide a highly performant and secure way to view dashboards, both for authenticated users and via public links. It uses a **Progressive Loading Architecture** to ensure that dashboard metadata (tabs, layout, widget info) loads instantly, while heavier chart data is fetched asynchronously.

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboards/[id]/preview` | `GET` | Fetches dashboard metadata, layout, and sanitized widget state. Checks for public access and password protection. |
| `/api/dashboards/[id]/charts/[chartId]/data` | `GET` | Fetches data for a specific chart. Supports live queries, caching, and filter injection. |

## Progressive Loading Architecture

1.  **Metadata Fetch**: The frontend calls `/api/dashboards/[id]/preview`.
2.  **Sanitization**: The server queries the database but **sanitizes** the chart state using `sanitizeChartState`. Sensitive fields like `actualExecutedSql` and `sqlParams` are stripped to prevent exposure to the client.
3.  **UI Shell**: The dashboard renders its layout and widget shells immediately. Chart widgets are set to a `pending` state.
4.  **Asynchronous Data Fetch**: Each `DashboardChartRenderer` component independently calls the chart data endpoint. This parallelizes database queries and allows the dashboard to remain interactive during loading.

## Security & Authentication

### Public vs. Private
- **Private Dashboards**: Require an authenticated user with appropriate permissions (Creator, Admin, or delegated access).
- **Public Dashboards**: Accessible to everyone unless password-protected.

### Password Protection
Public dashboards can be secured with a password.
1.  If a password is set, the preview API returns `{ requiresPassword: true }`.
2.  The user enters the password, which is verified via `/api/dashboards/[id]/verify-password`.
3.  Upon success, a secure cookie `dashboard_[id]_auth` is set, containing a hashed token.
4.  **Auth Token Propagation**: Both the preview endpoint and the chart data endpoint check for this cookie (passed as an `authToken` query parameter) to authorize access.

## Data Source Handling

The system supports multiple data storage locations:
-   **external**: Standard MySQL connections.
-   **optiqoflow**: Postgres-based multi-tenant storage.
-   **supabase_synced**: Internal Supabase-managed storage.

### Optiqoflow Tenant Fallback (Fix implemented Feb 2026)
Optiqoflow connections require a `tenant_id` for isolation. In a standard session, this is derived from the user's profile.
-   **Problem**: Public/Preview sessions often lack a user profile, causing `tenant_id` resolution to fail.
-   **Solution**: The chart data API now implements a **Dashboard Organization Fallback**. If no user session is present, it uses the `organization_id` associated with the dashboard itself to resolve the `tenant_id`, ensuring public charts load correctly.

## Debugging Common Issues

### EAI_AGAIN (DNS Resolution)
If a chart fails with `EAI_AGAIN internal`, it usually means the system tried to use a standard MySQL client to connect to an `internal` host (used by Optiqoflow).
-   **Check**: Ensure the `storage_location` in `data_connections` is correctly set to `optiqoflow`.
-   **Implementation**: The code must route these requests through `executeOptiqoflowQuery` rather than `withMySqlConnection`.

### Missing SQL in Preview
If a chart loads but is empty or shows "Missing SQL":
-   **Check**: Ensure `sanitizeChartState` isn't stripping necessary metadata.
-   **Verification**: View the chart in the builder to ensure SQL has been generated and saved to `state_json`.
