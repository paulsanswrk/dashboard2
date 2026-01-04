# Internal Storage (Data Transfer) Feature

This document describes the Internal Storage feature which transfers data from external MySQL databases to Supabase PostgreSQL for faster querying and reduced external dependency.

## Overview

When a connection's `storage_location` is set to `internal`, the system:
1. Introspects the source MySQL database schema
2. Creates a dedicated PostgreSQL schema in Supabase
3. Transfers all data with chunked processing
4. Enables querying against the local PostgreSQL copy

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

## Database Schema

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
- `table_name` - Source table name
- `status` - `pending`, `processing`, `done`, `error`
- `last_row_offset` - For chunked transfer
- `total_rows` - Expected row count

## Query Routing

When a connection has `storage_location = 'internal'`, data queries are automatically routed to the PostgreSQL copy instead of the original MySQL source.

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

## Data Transfer Flow

### 1. Initialization (`initializeDataTransfer`)

```typescript
POST /api/data-transfer/start
{ connectionId: 50 }
```

Steps:
1. Get connection details
2. Build MySQL config (including SSH tunnel if enabled)
3. Create/update `datasource_sync` record
4. Introspect MySQL database (tables, columns, PKs, FKs, row counts)
5. Generate PostgreSQL schema name: `conn_{uuid}_{dbname}`
6. Create schema and tables in PostgreSQL
7. **Resume logic**: Compare row counts, skip already-synced tables
8. Queue tables that need syncing

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
| `SET` | `TEXT[]` | Array of values |

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

## Future Improvements

1. **Index Introspection**: Currently only PKs are created. Could add MySQL `SHOW INDEX` introspection
2. **Incremental Sync**: Track changes instead of full resync
3. **Parallel Table Transfer**: Process multiple tables concurrently
4. **Progress UI**: Real-time sync progress in frontend

