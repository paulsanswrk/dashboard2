# Data Source Types

## Overview

The Optiqo application supports three distinct data source types, determined by the `storage_location` column in the `data_connections` table. This document explains how each type works and how queries are routed.

## Storage Location Types

### 1. External MySQL (`storage_location = 'external'`)

**Description**: Direct connection to external MySQL databases using provided credentials.

**Characteristics**:
- `database_type = 'mysql'`
- `storage_location = 'external'`
- Data remains in the external MySQL server
- No data stored in Supabase PostgreSQL

**Query Execution**:
```typescript
// Uses MySQL client with connection pool
const cfg = await loadConnectionConfigFromSupabase(event, connectionId)
rows = await withMySqlConnectionConfig(cfg, async (conn) => {
    const [res] = await conn.query({ sql, timeout: 30000 })
    return res
})
```

**Use Cases**:
- Customer's existing MySQL databases
- External data sources
- Legacy systems integration

---

### 2. OptiqoFlow Data (`storage_location = 'optiqoflow'`)

**Description**: Webhook-based data with multi-tenant isolation using PostgreSQL roles.

**Characteristics**:
- `database_type = 'postgresql'`
- `storage_location = 'optiqoflow'`
- Data pushed via webhooks
- Stored in tenant-specific schemas: `tenant_{short_name}`
- Requires user's organization to have `tenant_id` set

**Query Execution**:
```typescript
// Uses PostgreSQL with role-based tenant isolation
const roleName = await getTenantRoleName(tenantId) // e.g., "tenant_acme_cleaning_co_role"
await tx.unsafe(`SET LOCAL ROLE ${roleName}`)
const rows = await tx.unsafe(sql, params)
```

**Security Features**:
- Row-level security via PostgreSQL roles
- Views pre-filter data by `device_tenants.tenant_id`
- Automatic tenant isolation
- No cross-tenant data access possible

**Use Cases**:
- OptiqoFlow webhook data
- Multi-tenant SaaS data
- Tenant-isolated reporting

---

### 3. Synced MySQL Data (`storage_location = 'supabase_synced'`)

**Description**: MySQL data copied/synced to Supabase PostgreSQL for faster access.

**Characteristics**:
- `database_type = 'mysql'` (original source type)
- `storage_location = 'supabase_synced'`
- Data synced from MySQL to custom PostgreSQL schema
- Schema name stored in `datasource_sync.target_schema_name`
- **Currently not used** (infrastructure ready for future use)

**Query Execution**:
```typescript
// Uses PostgreSQL with custom schema search path
const sync = await getSyncInfo(connectionId)
await tx.unsafe(`SET LOCAL search_path TO "${sync.schemaName}", public`)
const rows = await tx.unsafe(translateIdentifiers(sql), params)
```

**Benefits**:
- Faster query performance (data in Supabase)
- No external connection overhead
- Reduced load on source MySQL server

**Use Cases** (future):
- Frequently accessed external data
- Data that needs faster access
- Reducing latency for dashboards

---

## Routing Logic

All query endpoints use the following routing pattern:

```typescript
const connection = await db.query.dataConnections.findFirst({
    where: eq(dataConnections.id, connectionId),
    columns: { storageLocation: true }
})

const storageLocation = connection?.storageLocation || 'external'

switch (storageLocation) {
    case 'external':
        // Direct MySQL connection
        rows = await withMySqlConnectionConfig(cfg, ...)
        break
        
    case 'optiqoflow':
        // PostgreSQL with tenant role isolation
        if (!tenantId) throw error
        rows = await executeOptiqoflowQuery(sql, params, tenantId)
        break
        
    case 'supabase_synced':
        // PostgreSQL with custom schema
        const sync = await getSyncInfo(connectionId)
        rows = await executeInternalStorageQuery(sync.schemaName, sql, params)
        break
}
```

## Migration Path

When migrating from the old implicit logic to explicit `storage_location`:

```sql
-- Old connections are automatically migrated:
UPDATE data_connections SET storage_location = CASE
    WHEN database_type = 'internal' THEN 'optiqoflow'
    WHEN database_type = 'mysql' AND storage_location = 'internal' THEN 'supabase_synced'
    WHEN database_type = 'mysql' THEN 'external'
END;

-- Update database_type for OptiqoFlow
UPDATE data_connections SET database_type = 'postgresql'
WHERE database_type = 'internal';
```

## SQL Translation

Both `optiqoflow` and `supabase_synced` routes translate MySQL syntax to PostgreSQL:

```typescript
function translateIdentifiers(sql: string): string {
    // Replace MySQL backticks with PostgreSQL double quotes
    return sql.replace(/`([^`]+)`/g, '"$1"')
}
```

**Limitations**:
- Only handles identifier translation (backticks → double quotes)
- Does not translate function differences (e.g., `NOW()`, `DATE_SUB()`)
- May require manual SQL adjustments for complex queries

## Error Handling

### Missing tenant_id for OptiqoFlow
```json
{
  "error": "User must be associated with an organization that has a tenant_id configured for Optiqoflow data access."
}
```

**Solution**: Set `organizations.tenant_id` for the user's organization.

### Synced storage not configured
```json
{
  "error": "Synced storage not configured properly for this connection"
}
```

**Solution**: Create record in `datasource_sync` table with `target_schema_name`.

## Performance Characteristics

| Storage Location | Latency | Scalability | Data Freshness |
|------------------|---------|-------------|----------------|
| `external` | Higher (network) | Limited by MySQL | Real-time |
| `optiqoflow` | Low (local PG) | High (Supabase) | Webhook-based |
| `supabase_synced` | Low (local PG) | High (Supabase) | Sync interval |

## Related Files

**Core Routing**:
- [`server/utils/queryRouter.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/utils/queryRouter.ts) - Centralized routing helper
- [`server/utils/optiqoflowQuery.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/utils/optiqoflowQuery.ts) - OptiqoFlow execution
- [`server/utils/internalStorageQuery.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/utils/internalStorageQuery.ts) - Synced storage execution
- [`server/utils/mysqlClient.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/utils/mysqlClient.ts) - External MySQL execution

**API Endpoints**:
- [`server/api/reporting/chart-data.post.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/api/reporting/chart-data.post.ts)
- [`server/api/reporting/table-preview.post.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/api/reporting/table-preview.post.ts)
- [`server/api/reporting/sql.post.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/api/reporting/sql.post.ts)
- [`server/api/reporting/preview.post.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/server/api/reporting/preview.post.ts)

**Schema**:
- [`lib/db/schema.ts`](file:///home/ubuntu/nodejs/optiqo-dashboard/lib/db/schema.ts) - Database schema with enum constraints
