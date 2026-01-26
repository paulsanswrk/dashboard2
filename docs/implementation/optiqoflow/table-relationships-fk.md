# Table Relationships FK Integration

Integrates foreign key relationships from `optiqoflow.table_relationships` into the internal data source schema for chart building with auto-joins.

## Overview

The `table_relationships` table contains business-level FK definitions pushed by Optiqo Flow. These are merged into the schema introspection alongside any native PostgreSQL FKs from `information_schema`.

```
optiqoflow.table_relationships
           │
           ▼
getTableRelationships() ──▶ getOptiqoflowSchema()
           │
           ▼
connections.post.ts ──▶ data_connections.schema_json
                   └──▶ data_connections.auto_join_info.graph
           │
           ▼
Chart Builder uses FKs for auto-joins
```

## Key Files

| File | Purpose |
|------|---------|
| `server/utils/optiqoflowQuery.ts` | `getTableRelationships()` and `getOptiqoflowSchema()` |
| `server/api/reporting/connections.post.ts` | Auto-fetches schema for internal connections |
| `server/utils/schemaGraph.ts` | `buildGraph()` for auto_join_info computation |

## table_relationships Schema

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'optiqoflow' AND table_name = 'table_relationships';
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `source_table` | text | Table containing the FK column |
| `source_column` | text | Column referencing another table |
| `target_table` | text | Referenced table |
| `target_column` | text | Referenced column (usually PK) |
| `relationship_type` | text | `many-to-one`, `one-to-many`, etc. |
| `description` | text | Human-readable description |

## FK Format for buildGraph

Foreign keys are stored in a format compatible with `buildGraph()`:

```typescript
interface ForeignKey {
  constraintName: string          // e.g., "tr_work_orders_room_id"
  sourceTable: string             // "work_orders"
  targetTable: string             // "rooms"
  columnPairs: Array<{
    position: number              // 1
    sourceColumn: string          // "room_id"
    targetColumn: string          // "id"
  }>
}
```

Constraint names use prefixes:
- `fk_` – from `information_schema` (native PostgreSQL FKs)
- `tr_` – from `table_relationships` (business-level FKs)

## Connection Creation Flow

```typescript
// In connections.post.ts
if (isInternalSource) {
  const schema = await getOptiqoflowSchema()  // Merges table_relationships
  record.schema_json = schema
  
  const graph = buildGraph({ schema: { tables: schema.tables } })
  record.auto_join_info = {
    graph: {
      nodes: Array.from(graph.nodes.entries()),
      adj: Array.from(graph.adj.entries())
    }
  }
}
```

## Refreshing Existing Connections

Existing internal connections created before this feature need a schema refresh:

**Option 1: Re-create the connection**

**Option 2: Via PUT endpoint**
```bash
curl -X PUT "/api/reporting/connections?id=62" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schema": {"tables": []}}'
```
The next schema save will auto-populate FKs.

**Option 3: SQL verification**
```sql
-- Check internal connections missing FKs
SELECT id, internal_name,
       jsonb_array_length(COALESCE(schema_json->'tables', '[]'::jsonb)) as table_count,
       auto_join_info IS NOT NULL as has_graph
FROM data_connections 
WHERE database_type = 'internal';
```

## Related Documentation

- [Internal Data Source](./internal-data-source.md) – Architecture overview
- [Auto-Join Performance](../connections/auto-join-performance.md) – Graph computation strategy
