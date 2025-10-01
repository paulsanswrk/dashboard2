### Sprint 02 — Datasets list and schema discovery

#### Goal
Implement dataset discovery and schema introspection against MySQL via Nuxt server routes (no Supabase RPC), exposing a clean API to the client for listing datasets and their fields with types.

#### Implementation Prompt (LLM-ready)
- Add server endpoints under `server/api/reporting/` backed by MySQL:
  - `datasets.get.ts` — return `{ id, name, label }` from `information_schema.tables` for `table_schema = database()`.
  - `schema.get.ts` — accept `datasetId`; return columns from `information_schema.columns` with derived flags for types.
- Add relationships metadata with explicit support for compound foreign keys:
  - `relationships.get.ts` — accept `datasetId` and return:
    - `[{ constraintName, sourceTable, targetTable, columnPairs: [{ sourceColumn, targetColumn, position }], updateRule, deleteRule, isDeferrable=false, initiallyDeferred=false }]` using `information_schema.referential_constraints` + `key_column_usage` grouped by `constraint_name` and ordered by `ordinal_position`.
- Use existing MySQL + SSH tunnel utilities in Nuxt server (no calls through Supabase). Handle pooling or short-lived connections suitable for Vercel.
- In the client `useReportingService.ts`, implement `listDatasets()` and `getSchema(datasetId)` that call the above routes.
- Add defensive caching on the server (in-memory per instance) with short TTL (e.g., 60s) to reduce schema requests.
- Respect constraints:
  - Use Nuxt server routes to access MySQL; do not proxy through Supabase.
  - Do not modify `.env`. Use existing debug config or runtime secrets per deployment.

#### Deliverables
- `GET /api/reporting/datasets`, `GET /api/reporting/schema?datasetId=...`, and `GET /api/reporting/relationships?datasetId=...` implemented against MySQL.
- `useReportingService` methods and types added.
- Relationships endpoint returns composite `columnPairs` in ordinal order.

#### Acceptance Criteria
- Navigating to `/reporting/builder` loads datasets into the left panel list.
- Selecting a dataset retrieves its schema and renders fields grouped by type.
- Errors are handled with user-friendly toasts and no secrets leak to the browser.
- For a table with a composite FK, the relationships API returns all column pairs in correct order and target mapping.

#### Out of Scope
- Permissions model across organizations.
- Cross-dataset joins.

#### Test Checklist
- Hit `/api/reporting/datasets` and `/api/reporting/schema` directly; verify shape and caching.
- Switch datasets in the UI; ensure schema refreshes correctly and no uncaught errors appear.
- Validate a known composite foreign key in the database is returned with accurate `columnPairs` mapping and rules.



