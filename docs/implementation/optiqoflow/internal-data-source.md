# OptiqoFlow Internal Data Source

Integration of the Supabase `optiqoflow` schema as an "Internal Data Source" for building charts and dashboards.

## Overview

The OptiqoFlow integration allows users to query data from the internal `optiqoflow` PostgreSQL schema in Supabase, alongside external MySQL connections. This enables dashboard creation using data synced from the main Optiqo platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vue/Nuxt)                      │
├─────────────────────────────────────────────────────────────┤
│  Integration Wizard  │  Chart Builder  │  Organization Page │
│  (Data Source Type)  │  (Query UI)     │  (Connection Mgmt) │
└──────────┬───────────┴────────┬────────┴─────────┬──────────┘
           │                    │                  │
           ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Nuxt Server)                  │
├─────────────────────────────────────────────────────────────┤
│  connections.post.ts  │ preview.post.ts │ sql.post.ts       │
│  full-schema.get.ts   │ ai-chart-assistant.post.ts          │
└──────────┬────────────┴────────┬────────┴───────────────────┘
           │                     │
           ▼                     ▼
┌─────────────────────┐  ┌────────────────────────────────────┐
│   MySQL (External)  │  │  optiqoflowQuery.ts (Internal)     │
│                     │  │  → executeOptiqoflowQuery()        │
│                     │  │  → getOptiqoflowSchema()           │
└─────────────────────┘  └──────────────┬─────────────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────────────┐
                         │  Supabase PostgreSQL               │
                         │  Schema: optiqoflow                │
                         └────────────────────────────────────┘
```

## Key Files

### Query Utility
**`server/utils/optiqoflowQuery.ts`**

| Function | Description |
|----------|-------------|
| `executeOptiqoflowQuery()` | Execute SQL against optiqoflow schema |
| `getOptiqoflowSchema()` | Introspect schema (tables, columns, PKs, FKs) |
| `translateIdentifiers()` | Convert MySQL backticks to PostgreSQL double quotes |
| `queryOptiqoflowTable()` | Simple SELECT query helper |
| `getDistinctValuesOptiqoflow()` | Get distinct column values |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/reporting/optiqoflow-schema` | Returns schema with `dbmsVersion: 'PostgreSQL 15'` |
| `GET /api/organizations/:id/connections` | List connections for org (Superadmin only) |
| `POST /api/reporting/connections` | Create connection (handles `databaseType: 'internal'`) |
| `GET /api/reporting/full-schema` | Returns optiqoflow schema for internal connections |

### Modified Files

| File | Change |
|------|--------|
| `pages/integration-wizard.vue` | Data source type switcher (MySQL/Internal) |
| `pages/organizations/[id].vue` | Data Connections card with add modal |
| `server/api/reporting/preview.post.ts` | Routes internal queries to optiqoflow |
| `server/api/reporting/sql.post.ts` | Routes internal queries to optiqoflow |
| `server/api/reporting/ai-chart-assistant.post.ts` | Sets PostgreSQL 15 for internal sources |
| `server/api/reporting/connections.post.ts` | Handles internal source with placeholder credentials |

## Data Source Identification

Internal data sources are identified by `database_type = 'internal'` in the `data_connections` table.

```sql
-- Internal Data Source record
INSERT INTO data_connections (
  database_type,    -- 'internal'
  database_name,    -- 'optiqoflow'
  host,             -- 'internal'
  username,         -- 'service_role'
  password,         -- 'internal'
  dbms_version      -- 'PostgreSQL 15'
)
```

## Query Routing

```typescript
// In preview.post.ts and sql.post.ts
if (connection.database_type === 'internal') {
  // Route to optiqoflow
  const pgSql = translateIdentifiers(sql)
  rows = await executeOptiqoflowQuery(pgSql, params)
} else if (storageInfo.useInternalStorage) {
  // Existing internal storage (data transfer)
  rows = await executeInternalStorageQuery(schemaName, sql)
} else {
  // External MySQL
  rows = await withMySqlConnectionConfig(cfg, ...)
}
```

## AI Integration

The AI Chart Assistant uses `dbmsVersion` to generate correct SQL syntax:

```typescript
// For internal sources, use PostgreSQL 15
const dbmsVersion = connection.database_type === 'internal' 
  ? 'PostgreSQL 15' 
  : (connection.dbms_version || 'MySQL 8')
```

## Distinction from Internal Storage

| Feature | Internal Data Source | Internal Storage |
|---------|---------------------|------------------|
| Purpose | Direct query of optiqoflow | Data transfer from MySQL |
| Schema | `optiqoflow` (fixed) | Dynamic per-connection |
| Identifier | `database_type = 'internal'` | `storage_location = 'internal'` |
| Query Utility | `optiqoflowQuery.ts` | `internalStorageQuery.ts` |
