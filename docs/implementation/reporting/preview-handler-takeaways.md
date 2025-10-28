## Preview Handler (reporting/preview.post) — Key Takeaways

### Purpose
Transforms a reporting preview request into a safe SQL query, automatically joining the required tables using precomputed `auto_join_info`, executes it against the selected connection, and returns columns, rows, and metadata.

### Request contract (essential fields)
- **datasetId**: Base table name (seed for JOIN ordering)
- **xDimensions / breakdowns**: Dimension fields to select and group by
- **yMetrics**: Metric fields with optional aggregation
- **filters**: Basic filtering (equals, contains, in, between, is_null, not_null)
- **joins (optional)**: Manual join overrides (still allowed); auto-join runs only when no manual joins are provided
- **excludeNullsInDimensions**: Adds IS NOT NULL for each selected dimension
- **limit**: Capped to [1..1000], default 100
- **connectionId**: Required to run preview

### Field selection and grouping
- Builds `SELECT` from dimensions and metrics.
- Dimensions are also added to `GROUP BY`.
- If no fields are provided, defaults to `COUNT(*) AS count`.

### Table discovery
- Collects all tables referenced by dimensions, metrics, and filters.
- Ensures the base table is `datasetId`.

### Auto-join workflow (always uses auto_join_info)
1. Fetch `auto_join_info` for the `connectionId` and owner.
2. Reconstruct `TableGraph` from stored `nodes` and `adj` arrays.
3. Compute `pathsIndex` (stored Maps are not JSON-serializable; recomputed cheaply from the graph).
4. Run `selectJoinTree(tables, graph, pathsIndex)` to get the optimal join tree for the requested tables.
5. Add `INNER JOIN` clauses in dependency order, starting from `datasetId`:
   - Only join a `target` when its `source` has been included.
   - Build `ON` from foreign key `columnPairs` with safe identifier checks.

Notes:
- Current implementation uses `INNER JOIN` consistently (edge `joinType` is available for future extension).
- If `auto_join_info` is missing, the handler returns an error: `missing_auto_join_info`.

### Manual joins (when provided)
- If the request contains manual `joins`, they are applied after auto-join is skipped.
- Source/target are swapped when needed so that the not-yet-included table is joined in.
- Redundant joins are ignored if both tables were already included.

### Filters and options
- `filters` support: equals, contains, in, between, is_null, not_null.
- `excludeNullsInDimensions` adds `IS NOT NULL` for each selected dimension.

### Safety and sanitization
- All identifiers (`table`, `column`) are validated with a strict regex and wrapped as backtick-quoted identifiers.
- Bind parameters are used for values (e.g., for equals/in/between/contains).

### SQL assembly
The final SQL is constructed as:

```sql
SELECT <selectParts>
FROM `<datasetId>`
[INNER JOIN ... ON ...]
[CROSS JOIN ...]*  -- only used to include referenced tables not brought in by joins
[WHERE ...]
[GROUP BY ...]
LIMIT <limit>
```

### Execution and response
- Loads connection config from Supabase, executes the SQL with bound params.
- Response shape:
  - `columns`: [{ key, label }]
  - `rows`: result set
  - `meta`: { executionMs, sql, warnings? }

### Errors and logging
- Missing base table: `missing_dataset`
- Missing connection: `missing_connection`
- Missing auto-join info: `missing_auto_join_info`
- General failure: `query_failed`
- Verbose server logs are prefixed with `[PREVIEW_AUTO_JOIN]`.

### Future extensions
- Respect edge `joinType` (e.g., LEFT) from `auto_join_info` when assembling joins.
- Provide join path visualization notes/ids in `meta` for debugging.
- Expand operator support and date handling in filters.


