# Optiqo Dashboard Sync Integration

This document describes the implementation of real-time data synchronization between the main Optiqo platform and this dashboard application.

## Overview

The integration allows the dashboard to receive real-time updates (INSERT, UPDATE, DELETE) and perform full synchronization of historical data from Optiqo's central database. This ensures the dashboard always has the latest operational data without direct database peering.

## Architecture

- **Source**: Optiqo Platform (PostgreSQL)
- **Transport**: HTTP Webhooks (HMAC-SHA256 signed)
- **Destination**: This Dashboard (Nuxt + Supabase)
- **Storage**: Dedicated `optiqoflow` schema in Supabase

## Implementation Details

### 1. Dedicated Schema (`optiqoflow`)

To keep the database organized and separated from local dashboard configuration (like user dashboards and layouts), all synced data is stored in the `optiqoflow` schema.

- **Schema Name**: `optiqoflow`
- **Permissions**:
    - `authenticated` role: USAGE and SELECT/INSERT/UPDATE/DELETE access.
    - `service_role`: Full administrative access (used by the webhook).

### 2. Webhook Endpoint

The webhook receiver is implemented in:
[server/api/optiqo-webhook.post.ts](file:///home/ubuntu/nodejs/optiqo-dashboard/server/api/optiqo-webhook.post.ts)

**Security**:
The endpoint verifies the `x-webhook-signature` header using an HMAC-SHA256 hash of the raw request body and a shared secret (`OPTIQO_WEBHOOK_SECRET`).

**Table Mapping**:
Optiqo table names are mapped to simplified names within the `optiqoflow` schema:
| Optiqo Table | Dashboard Table |
|--------------|-----------------|
| `adhoc_work_orders` | `work_orders` |
| `attendance_events` | `attendance_events` |
| `zone_categories` | `zones` |
| ... and 18 more | |

### 3. Synchronization Modes

- **Real-time (INSERT/UPDATE/DELETE)**: Single records are upserted or deleted as they change in Optiqo.
- **FULL_SYNC**: Used for initial data import. On the first batch (offset 0), all existing data for the specific `tenant_id` is cleared from the target table to ensure consistency.

## Environment Variables

The following variables must be configured in the deployment environment (e.g., Vercel):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Dashboard Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for schema operations |
| `OPTIQO_WEBHOOK_SECRET` | Shared secret for signature verification |

## Querying Synced Data

When querying data from this schema using the Supabase client, you must specify the schema:

```typescript
const supabase = useSupabaseClient({
  db: { schema: 'optiqoflow' }
})

const { data } = await supabase.from('work_orders').select('*')
```

Or via direct SQL/Drizzle:
```sql
SELECT * FROM optiqoflow.work_orders WHERE tenant_id = '...';
```

## Monitoring

Synchronization attempts and performance can be monitored via the logs table:
```sql
SELECT * FROM optiqoflow.webhook_logs ORDER BY created_at DESC;
```

---

## Multi-Tenant Data Isolation

### Tenant Views

Per-tenant views are dynamically created in the `tenants` schema:

```
tenants.{tenant_uuid}_work_orders
tenants.{tenant_uuid}_sites
...
```

Views provide:
- **Row isolation**: Filter by `tenant_id` or related fields
- **Column isolation**: Only columns pushed for that tenant

### Column Tracking

The webhook tracks which columns are pushed per tenant/table:

```sql
SELECT * FROM tenants.tenant_column_access 
WHERE tenant_id = '...' AND table_name = 'work_orders';
```

When columns change, views are automatically regenerated.

---

## Chart Data Cache Invalidation

When data is pushed, the webhook invalidates cached chart data:

1. Logs push to `tenants.tenant_data_push_log`
2. Calls `invalidate_chart_cache_for_tables(tenant_id, [tables])`
3. Marks affected cache entries as invalid
4. Updates chart `cache_status` to `stale`

This ensures charts reflect fresh data without manual intervention.

| Table | Location | Purpose |
|-------|----------|---------|
| `tenant_column_access` | tenants schema | Column lists per tenant/table |
| `tenant_data_push_log` | tenants schema | Audit log of data pushes |
| `chart_data_cache` | public schema | Cached chart results |
| `chart_table_dependencies` | public schema | Chart → table mapping |

---

## Related Documentation

- [Multi-Tenant Data Architecture](../optiqoflow/multi-tenant-data-architecture.md)
- [Internal Data Source](internal-data-source.md)

