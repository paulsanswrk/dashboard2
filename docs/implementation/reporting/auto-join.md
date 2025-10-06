### Auto-Join (Implicit Join) Implementation

This document explains how the Report Builder suggests and applies table joins automatically based on the user’s current field selection. The approach avoids requiring the user to hand-pick relationships unless there are multiple valid options, in which case the UI offers a clear choice.

#### Goals
- Suggest joins only when fields from at least two different tables are used in the report (X/Dimensions, Y/Metrics, Breakdown).
- Surface only the relationships (FKs) that actually connect the tables in use.
- Apply a suggested join only when the user confirms it (single or multiple choices). Always show which joins are applied.
- Keep the experience deterministic and debuggable.

#### Components and Endpoints
- UI: `components/reporting/ReportingJoinsImplicit.vue` (rendered in the Zones column, below Filters)
- State: `useReportState.ts` (`joins` and field `table` tagging)
- Relationships: `GET /api/reporting/relationships?datasetId=...&connectionId=...`
- Preview: `POST /api/reporting/preview` (accepts `joins[]` and builds SQL JOIN clauses)

#### How we detect tables in use
Every field dragged from the schema panel includes its source table:
- `ReportingSchemaPanel` tags the dragged `field` payload with the current dataset name (`table`).
- In addition, a fallback heuristic parses `fieldId` like `table.column` if present and the `table` tag is missing.

We collect the set of tables from all zone fields:
- Gather tables from `xDimensions`, `yMetrics`, and `breakdowns`.
- If fewer than two unique tables are present, no joins are suggested.

#### Relationship discovery (MySQL)
Endpoint: `server/api/reporting/relationships.get.ts`
- Queries `information_schema.referential_constraints` + `key_column_usage`.
- Returns both directions for the selected dataset (`table_name = ? OR referenced_table_name = ?`).
- Each relationship includes ordered `columnPairs` for composite keys and update/delete rules.

Example response element (simplified):
```json
{
  "constraintName": "orders_customer_fk",
  "sourceTable": "orders",
  "targetTable": "customers",
  "columnPairs": [
    { "position": 1, "sourceColumn": "customer_id", "targetColumn": "id" }
  ]
}
```

#### Filtering relationships to those that matter
In `ReportingJoinsImplicit` we compute `usedTables` from zones and filter the relationships to those where both `sourceTable` and `targetTable` are in `usedTables`.

Rules:
- If `usedTables.size < 2`: no relevant FKs are shown.
- If exactly one relevant relationship exists: show a button “Apply suggested join”.
- If multiple relevant relationships exist: render a radio list to pick exactly one and an “Apply join” button.
- When the dataset changes, previously applied joins are cleared to avoid stale joins.

#### Applying a join
When the user applies a join, we push a `JoinRef` into `useReportState.joins`:
```ts
{
  constraintName: string,
  sourceTable: string,
  targetTable: string,
  joinType: 'inner',
  columnPairs: [{ position: number, sourceColumn: string, targetColumn: string }]
}
```

We default to `INNER JOIN` for suggested joins. (Left joins can be added later if desired.)

#### Query builder (JOIN clauses)
In `preview.post.ts` we convert `joins[]` into SQL JOIN clauses:
- For each join: `INNER JOIN targetTable ON (sourceCol1 = targetTable.targetCol1 AND sourceCol2 = targetTable.targetCol2 ...)`.
- Composite FKs become an `AND` of all `columnPairs` in ordinal order.
- We only include tables referenced by `joins[]`. If no join is applied, only the primary dataset is used.

Example generated SQL (excerpt):
```sql
SELECT o.city AS `city`, SUM(o.amount) AS `sum_amount`
FROM `orders` o
INNER JOIN `customers` c
  ON o.customer_id = c.id
GROUP BY o.city
LIMIT 100;
```

#### Debugging support
When `DEBUG_ENV=true`, the Joins section shows:
- Tables in use (derived from current zones)
- Count of “relevant FKs”
- The list of “applied joins”

This helps explain why a join was (or wasn’t) suggested.

#### Error surfacing
Preview responses include `meta.error` when MySQL errors occur (e.g., unknown columns). The builder displays the error above the chart/table to help diagnose misconfigured joins/fields.

#### Edge cases and notes
- If two or more different join paths connect the used tables, we require the user to choose one explicitly. We don’t auto-apply to avoid incorrect paths.
- Multi-hop joins (A→B→C) across multiple relationships are not yet implemented; the current scope is single-hop suggestions between the used tables.
- Field `table` tagging is essential; ensure fields coming from different datasets are actually tagged (or use the `table.column` fallback).

#### Future enhancements
- Add left join option with a simple toggle when applying a join.
- Support multi-hop join discovery and shortest-path selection.
- Show a compact “SQL explanation” alongside the generated SQL to clarify grouping and aggregations.


