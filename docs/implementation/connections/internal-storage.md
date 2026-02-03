# Internal Storage (Data Transfer) Feature

This document describes the Internal Storage feature which transfers data from external MySQL databases to Supabase PostgreSQL for faster querying and reduced external dependency.

## Overview

The system supports three storage locations:

| Storage Location | Description | Use Case |
|-----------------|-------------|----------|
| `external` | Queries run directly against source MySQL | Default for all connections |
| `optiqoflow` | OptiqoFlow internal data sources | Built-in demo/internal data |
| `supabase_synced` | MySQL synced to Supabase PostgreSQL | (*Dev only*) Hybrid - schema from MySQL, data synced to PostgreSQL |

When a connection's `storage_location` is set to `optiqoflow` or `supabase_synced`, the system:
1. Introspects the source MySQL database schema
2. Creates a dedicated PostgreSQL schema in Supabase
3. Transfers all data with chunked processing
4. Enables querying against the local PostgreSQL copy

> **Important**: `supabase_synced` connections are treated as **PostgreSQL** for query generation and AI interactions. Since the data is stored in Supabase PostgreSQL, Claude AI generates PostgreSQL-compatible SQL queries directly (not MySQL syntax). No syntax translation is performed at query time.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  MySQL Source   │────▶│  Data Transfer   │────▶│   PostgreSQL    │
│   (External)    │     │    Pipeline      │     │   (Supabase)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │   sync_queue     │
                        │ (chunked state)  │
                        └──────────────────┘
```

## Key Files

### Data Transfer
| File | Purpose |
|------|---------|
| `server/utils/dataTransfer.ts` | Core transfer logic, queue processing |
| `server/utils/schemaManager.ts` | DDL operations, INSERT execution |
| `server/utils/mysqlTypeMapping.ts` | MySQL → PostgreSQL type conversion |
| `server/utils/mysqlClient.ts` | MySQL connection with SSH tunnel support |
| `server/api/data-transfer/start.post.ts` | API endpoint to trigger sync |
| `server/api/cron/sync-data.get.ts` | Scheduled sync (currently disabled) |
| `lib/db/schema.ts` | `datasource_sync` and `sync_queue` tables |

### Query Routing
| File | Purpose |
|------|---------|
| `server/utils/internalStorageQuery.ts` | Query execution against PostgreSQL schemas |
| `server/api/reporting/sql.post.ts` | Raw SQL queries - routes to internal storage |
| `server/api/reporting/preview.post.ts` | Chart preview queries - routes to internal storage |
| `server/api/reporting/distinct-values.post.ts` | Filter value lookups - routes to internal storage |
| `server/api/reporting/table-preview.post.ts` | Table data preview - routes to internal storage |
| `server/api/reporting/full-schema.get.ts` | Uses cached `schema_json` for all connections |
| `server/api/dashboards/[id]/full.get.ts` | Dashboard chart data - routes to internal storage |

### Connection Management
| File | Purpose |
|------|---------|
| `server/api/reporting/connections.post.ts` | Creates new connections with `storage_location` |
| `server/api/reporting/connections.put.ts` | Updates schema with FK enrichment |
| `pages/integration-wizard.vue` | UI for creating connections (incl. synced DB option) |
| `components/DataTransferPanel.vue` | Sync controls for data transfer |

## Database Schema

### `storage_location` Column

The `data_connections.storage_location` column is **NOT NULL** and must be one of:
- `external` - Default for MySQL connections
- `optiqoflow` - Internal data sources
- `supabase_synced` - Synced database connections

> **Implementation Note**: The `connections.post.ts` defaults `storage_location` to `'external'` if not provided, and `'optiqoflow'` for internal data sources.

### `datasource_sync` Table
Tracks sync state for each connection:
- `connection_id` - Link to data connection
- `target_schema_name` - PostgreSQL schema name (e.g., `conn_abc123_mydb`)
- `sync_status` - `idle`, `queued`, `syncing`, `synced`, `error`
- `sync_progress` - JSON with progress details
- `foreign_key_metadata` - Stored FK relationships from MySQL
- `next_sync_at` - Scheduled next sync time

### `sync_queue` Table
Tracks per-table sync progress:
- `sync_id` - Link to datasource_sync
- `status` - `pending`, `processing`, `done`, `error`
- `last_row_offset` - For chunked transfer
- `total_rows` - Expected row count

## Query Routing

When a connection has `storage_location` set to `optiqoflow` or `supabase_synced`, data queries are automatically routed to the PostgreSQL copy instead of the original MySQL source.

### How It Works

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Query Request  │────▶│  Check storage_loc   │────▶│  PostgreSQL     │
│  (Chart/Filter) │     │  + target_schema     │     │  (Supabase)     │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │ (if external)
                               ▼
                        ┌─────────────────┐
                        │  MySQL Source   │
                        └─────────────────┘
```

### Key Functions in `internalStorageQuery.ts`

- `loadInternalStorageInfo(connectionId)` - Checks if connection uses internal storage, returns schema name
- `executeInternalStorageQuery(schemaName, sql, params)` - Executes SQL against PostgreSQL with search_path set
- `translateIdentifiers(sql)` - Converts MySQL backticks to PostgreSQL double quotes
- `queryInternalTable(schemaName, tableName)` - Simple table queries
- `getDistinctValuesInternal(schemaName, tableName, columnName)` - Filter value lookups

### Schema Loading Optimization

The `full-schema.get.ts` endpoint uses cached `schema_json` from the connection record for **all connections** (not just internal storage). This avoids unnecessary MySQL introspection on every chart builder load.

For `supabase_synced` connections, the schema (including foreign keys) is fetched from MySQL directly when no cache exists.

## Foreign Key Detection

### MariaDB Compatibility Fix

The system introspects foreign keys from MySQL/MariaDB using `information_schema`. A key compatibility issue was discovered:

> **Problem**: `information_schema.referential_constraints` is often empty in MariaDB, while foreign keys exist in `information_schema.key_column_usage`.

**Solution** (implemented in both `full-schema.get.ts` and `connections.put.ts`):

```sql
-- OLD (doesn't work in MariaDB):
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_name = kcu.constraint_name

-- NEW (works in both MySQL and MariaDB):
FROM information_schema.key_column_usage kcu
LEFT JOIN information_schema.referential_constraints rc
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.referenced_table_name IS NOT NULL
```

This queries `KEY_COLUMN_USAGE` directly (which reliably contains FK data) and optionally joins to `referential_constraints` for update/delete rules.

### Files with FK Queries
| File | Purpose |
|------|---------|
| `server/api/reporting/full-schema.get.ts` | Schema introspection for schema editor |
| `server/api/reporting/connections.put.ts` | Schema save with FK enrichment |

## Synced Database Feature

### Overview

The "Synced Database" (`supabase_synced`) feature allows creating connections that:
1. Connect to external MySQL databases for **schema discovery**
2. Sync data to Supabase PostgreSQL for **query execution**
3. Provide the benefits of both: live schema updates + fast local queries

### Access Control

- **Creation**: Restricted to superadmins in dev mode only
- **Usage**: Available to all users once created
- **Dev Mode Detection**: Checks if hostname is `localhost` or `127.0.0.1`

### Integration Wizard UI

The "Synced Database" card appears in the integration wizard with:
- Purple theme with "Dev Only" badge
- Only visible when `canCreateSyncedDb` is true
- Sets `storageLocation: 'supabase_synced'` and `databaseType: 'mysql'`

### Data Transfer Panel

The `DataTransferPanel.vue` shows sync controls for:
- `storage_location === 'internal'` (legacy)
- `storage_location === 'supabase_synced'`

## Data Transfer Flow

### 1. Initialization (`initializeDataTransfer`)

```typescript
POST /api/data-transfer/start
{ connectionId: 50 }
```

Steps:
1. Get connection details
2. Verify `storage_location` is `optiqoflow` or `supabase_synced`
3. Build MySQL config (including SSH tunnel if enabled)
4. Create/update `datasource_sync` record
5. Introspect MySQL database (tables, columns, PKs, FKs, row counts)
6. Generate PostgreSQL schema name: `conn_{uuid}_{dbname}`
7. Create schema and tables in PostgreSQL
8. **Resume logic**: Compare row counts, skip already-synced tables
9. Queue tables that need syncing

### 2. Resume Logic

On each sync start, the system compares MySQL vs PostgreSQL row counts:

```
⏭️ [SYNC] Skipping table1: PostgreSQL has 5000 rows, MySQL has 5000 rows (match)
📋 [SYNC] Queuing table2: PostgreSQL has 3000 rows, MySQL has 8000 rows (needs sync)
```

Tables with matching counts are skipped. This enables **resumable syncs** after timeouts.

### 3. Queue Processing (`processSyncQueue`)

For each queued table:
1. **Truncate** existing data (full resync)
2. **Read** chunks of 5000 rows from MySQL
3. **Insert** into PostgreSQL using raw SQL
4. Update offset and continue until complete
5. Fix auto-increment sequences

### 4. Chunked Transfer

Large tables are transferred in chunks to handle Vercel's function timeout limits:

```
📥 [SYNC] Inserting 5000 rows into conn_xxx.table
✅ [SYNC] Inserted 5000 rows
📊 [SYNC] Processed: table - 5000 rows (more chunks)
```

## Type Mapping

MySQL types are converted to PostgreSQL equivalents:

| MySQL Type | PostgreSQL Type | Notes |
|------------|-----------------|-------|
| `TINYINT(1)` | `SMALLINT` | Not BOOLEAN - MySQL sends 0/1 integers |
| `BIT(1)` | `SMALLINT` | Same reason |
| `VARCHAR(n)` | `VARCHAR(n)` | Length preserved |
| `DATETIME` | `TIMESTAMP` | |
| `TIMESTAMP` | `TIMESTAMP WITH TIME ZONE` | |
| `JSON` | `JSONB` | |
| `ENUM` | `TEXT` | Enum values stored as text |
| `SET` | `TEXT[]` | Array of values (with data conversion) |

### SET Type Data Conversion

MySQL's `SET` type stores multiple values as a comma-separated string. PostgreSQL requires proper array literal format:

```
MySQL value:     "Deleted Scenes,Behind the Scenes"
PostgreSQL:      {"Deleted Scenes","Behind the Scenes"}
```

**Implementation** (in `schemaManager.ts`):
- `readMySqlChunk()` returns column types alongside data
- `bulkInsert()` detects `SET` columns and calls `convertSetToArray()`
- Empty SET values become `{}` (empty array)

### Constraint Handling

For flexible data import:
- **NOT NULL**: Disabled - MySQL data often has nulls in "NOT NULL" columns
- **PRIMARY KEY**: Enabled - Needed for query performance
- **Foreign Keys**: Not created - Metadata stored but no constraints

### Zero-Date Handling

MySQL "zero dates" (`0000-00-00 00:00:00`) are invalid in PostgreSQL:
- Schema creation: Converted to `NULL` default
- Data insertion: Converted to `NULL`

## SSH Tunnel Support

For MySQL servers behind firewalls:

```typescript
{
  host: 'localhost',     // MySQL connects to tunnel
  port: 3306,
  useSshTunneling: true,
  ssh: {
    host: 'jump.example.com',
    port: 22,
    user: 'tunnel-user',
    privateKey: '-----BEGIN...'
  }
}
```

The `mysqlClient.ts` establishes SSH tunnel before MySQL connection.

## API Endpoints

### Start/Resume Sync
```http
POST /api/data-transfer/start
Content-Type: application/json

{ "connectionId": 50 }
```

Response:
```json
{
  "success": true,
  "schemaName": "conn_abc123_mydb",
  "tablesQueued": 5,
  "tablesSkipped": 7,
  "message": "Data transfer initialized. 5 tables queued, 7 already synced."
}
```

### Scheduled Sync (Disabled)
```http
GET /api/cron/sync-data
Authorization: Bearer {CRON_SECRET}
```

Currently disabled in `vercel.json`. Enable by adding:
```json
{
  "path": "/api/cron/sync-data",
  "schedule": "*/5 * * * *"
}
```

## Error Handling

### PostgreSQL Insert Errors

Using raw `pgClient.unsafe()` for detailed error messages:

```
❌ [SYNC] Insert failed on conn_xxx.table:
   └─ Error: null value in column "date" violates not-null constraint
   └─ Code: 23502
   └─ Detail: Failing row contains (1, 'foo', null, ...)
```

### Gateway Timeouts

On Vercel timeout (5 min limit):
1. Sync stops mid-process
2. Call `/api/data-transfer/start` again
3. Resume logic skips completed tables
4. Only unfinished tables are re-synced

## Configuration

### Environment Variables
- `CRON_SECRET` - Auth for scheduled sync endpoint
- `DATABASE_URL` - PostgreSQL connection string

### Vercel Settings
- Function timeout: 5 minutes (Vercel limit)
- Processing time: 290 seconds (with buffer)

## Recent Fixes

### 2026-02-02: MariaDB FK Query Fix
- **Issue**: Foreign keys not detected for MariaDB databases
- **Cause**: `referential_constraints` table is empty in MariaDB
- **Fix**: Changed FK queries to use `KEY_COLUMN_USAGE` with LEFT JOIN
- **Files**: `full-schema.get.ts`, `connections.put.ts`

### 2026-02-02: Connection Save Fix
- **Issue**: Connections failing to save with NULL constraint violation
- **Cause**: `storage_location` column is NOT NULL but code set it to null
- **Fix**: Default to `'external'` for MySQL connections, `'optiqoflow'` for internal
- **File**: `connections.post.ts`

### 2026-02-02: Synced DB Data Transfer Fix
- **Issue**: "Sync Now" button not working for `supabase_synced` connections
- **Fix**: Updated storage location check to include `supabase_synced`
- **Files**: `data-transfer/start.post.ts`, `DataTransferPanel.vue`

### 2026-02-03: MySQL SET Type Data Conversion
- **Issue**: Sync fails on tables with SET columns: `malformed array literal: "Deleted Scenes,Behind the Scenes"`
- **Cause**: MySQL SET values are comma-separated strings, PostgreSQL expects array literal format `{...}`
- **Fix**: Added `convertSetToArray()` function, modified `readMySqlChunk()` to return column types, updated `bulkInsert()` to detect SET columns and convert values
- **Files**: `dataTransfer.ts`, `schemaManager.ts`

### 2026-02-03: Synced MySQL DBs Treated as PostgreSQL
- **Issue**: Synced MySQL databases were still using MySQL syntax for AI and query building
- **Change**: Now treat `supabase_synced` connections as PostgreSQL for all query purposes
- **Benefits**: Claude AI generates native PostgreSQL queries, no syntax translation needed
- **Files**: `ai-chart-assistant.post.ts`, `connections.post.ts`, `queryRouter.ts`, `preview.post.ts`, `chart-data.post.ts`

## Future Improvements

1. **Index Introspection**: Currently only PKs are created. Could add MySQL `SHOW INDEX` introspection
2. **Incremental Sync**: Track changes instead of full resync
3. **Parallel Table Transfer**: Process multiple tables concurrently
4. **Progress UI**: Real-time sync progress in frontend
5. **Cache Invalidation**: Auto-clear schema cache when schema changes

