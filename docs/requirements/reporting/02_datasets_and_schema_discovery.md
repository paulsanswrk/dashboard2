### Sprint 02 — Datasets list and schema discovery

#### Goal
Implement dataset discovery and schema introspection via Nuxt server routes, exposing a clean API to the client for listing datasets and their fields with types.

#### Implementation Prompt (LLM-ready)
- Add server endpoints under `server/api/reporting/`:
  - `datasets.get.ts` — return an array of `{ id, name, label }` datasets; initially derive from Supabase schemas/tables allowed for reporting. Include pagination guard if needed.
  - `schema.get.ts` — accept `datasetId` and return `[{ fieldId, name, label, type, isNumeric, isDate, isString, isBoolean, suggestedAggregations }]`.
- Add relationships metadata with explicit support for compound foreign keys. Either:
  - Extend `schema.get.ts` to include a `relationships` array, or
  - Add `relationships.get.ts` that accepts `datasetId` and returns:
    - `[{ constraintName, sourceTable, targetTable, columnPairs: [{ sourceColumn, targetColumn, position }], updateRule, deleteRule, isDeferrable, initiallyDeferred }]`.
- Implement Postgres introspection (via Supabase) using `pg_constraint`, `pg_class`, and `pg_attribute` to construct `columnPairs` in ordinal order for composite keys.
- Implement a Supabase service utility on the server to introspect tables and column types. Ensure RLS-safe access using service role where needed; never expose service keys to the client.
- In the client `useReportingService.ts`, implement `listDatasets()` and `getSchema(datasetId)` that call the above routes.
- Add defensive caching on the server (in-memory per instance) with short TTL (e.g., 60s) to reduce schema requests.
- Respect constraints:
  - Route all Supabase communication via Nuxt server routes.
  - Do not modify `.env`. Use existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` via existing project patterns.

#### Deliverables
- `GET /api/reporting/datasets` and `GET /api/reporting/schema?datasetId=...` implemented.
- `useReportingService` methods and types added.
- Relationships endpoint or embedded relationships in schema response including composite `columnPairs`.

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



