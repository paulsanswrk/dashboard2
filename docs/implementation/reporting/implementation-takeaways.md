### Reporting Implementation - End-to-End Takeaways

#### Scope covered (Sprints 1 → 13, selected parts of 12)
- Foundation and routing: `/reporting` landing and `/reporting/builder` page with a 3‑panel layout (`ReportingLayout`).
- Dataset and schema discovery (MySQL): Nuxt server routes query `information_schema` to list tables and fields; relationships endpoint returns composite FK column pairs.
- Drag-and-drop zones and state: Native HTML5 DnD to add fields to X, Y, Breakdown; central state (`useReportState`) persisted in the `r` query param for shareable links and restored on load.
- Live preview query (MySQL): Server endpoint converts state to a safe query with sensible auto-aggregation defaults (SUM for numeric, COUNT otherwise), GROUP BY on dimensions, filters, and LIMIT.
- Visualization: Chart switcher (Table, Bar, Line, Pie, Donut, KPI). Chart.js loaded client-side; data mapped to a normalized series model; responsive rendering.
- Filtering and null handling: Filter UI with operators (equals, contains, in, between, is null, not null). Option to exclude nulls in dimensions. Server applies filters safely with parameterized queries.
- Undo/redo history: Bounded, coalesced history with undo/redo controls; state changes push snapshots, URL stays in sync without spamming history.
- Appearance and formatting: Right-side `ReportingAppearancePanel` with titles, axis labels, number formatting, color palettes, stacked bars, and legend position. Chart updates instantly as settings change.
- Breakdown and multi-series mapping: Multiple series when a breakdown dimension is present; stacked/grouped controls in appearance.
- Tooltips and (temporarily disabled) drill-down: Enhanced tooltips (number formatting). Drill event wiring exists but is currently disabled in the builder per request.
- Save/Load (Supabase):
  - SQL for `public.reporting_reports` (RLS enabled) under `docs/database/migrations/20251001101500_reporting_reports_table.sql` for manual apply.
  - Endpoints: `POST/GET/PUT/DELETE /api/reporting/reports` using `supabaseAdmin` and `serverSupabaseUser(event)` for auth.
  - Modal UI: Save current state with a name; list, load, delete saved reports.
- Joins (compound FK support):
  - Relationships endpoint returns ordered `columnPairs` for composite keys.
  - Preview query builder accepts INNER/LEFT JOIN specs and ANDs all column pairs in ON clauses.
  - `ReportingJoinsPanel` lets users add/remove joins from available relationships.
- Custom SQL mode (read-only):
  - Endpoint `POST /api/reporting/sql` runs SELECT queries with forbidden DDL/DML patterns blocked; enforces LIMIT.
  - UI toggle in builder with textarea and Run SQL; auto-preview pauses in SQL mode; results render as a table.

#### Key design decisions
- Server routes as the source of truth: All data access occurs via Nuxt server routes; no direct client connections to MySQL or Supabase service keys.
- Safe SQL construction: Identifier whitelisting for fields/tables; parameterized values for filters; JOINs constructed from discovered relationships only; LIMITs enforced.
- URL‑persisted state: Report configuration encoded to base64 in `r` query param for shareability and refresh persistence; client-only updates avoid SSR hydration issues.
- Charting via CDN: Chart.js loaded from CDN on client to avoid bundler resolution issues, enabling immediate use without altering project build settings.
- Auth alignment: Report endpoints rely on `serverSupabaseUser(event)` for authenticated user identity; RLS enabled in Supabase to protect records.

#### Files and components of interest
- Pages and layout
  - `pages/reporting/index.vue` (landing), `pages/reporting/builder.vue` (builder)
  - `components/reporting/ReportingLayout.vue`
- State and services
  - `composables/useReportState.ts` (full report state, URL sync, history, joins, appearance)
  - `composables/useReportingService.ts` (datasets, schema, relationships, preview, SQL)
  - `composables/useReportsService.ts` (save/load API)
- UI panels and controls
  - `ReportingSchemaPanel.vue`, `ReportingZones.vue`, `ReportingFilters.vue`, `ReportingAppearancePanel.vue`, `ReportingJoinsPanel.vue`, `ReportsModal.vue`
  - `ReportingBuilder.vue` (chart switcher, SQL toggle, undo/redo, save/load)
  - `ReportingChart.vue` (Chart.js wrapper), `ReportingPreview.vue` (table)
- Server endpoints
  - Discovery: `GET /api/reporting/datasets`, `GET /api/reporting/schema`, `GET /api/reporting/relationships`
  - Preview: `POST /api/reporting/preview` (MySQL auto-aggregation), `POST /api/reporting/sql` (custom read-only SQL)
  - Reports (Supabase): `POST/GET/PUT/DELETE /api/reporting/reports`
  - Details (optional): `POST /api/reporting/details` (raw rows for future drill-down)
- Supabase and auth
  - `server/api/supabase.ts` (`supabaseAdmin`, `supabaseUser`)
  - `server/api/auth/me.get.ts` (reference for canonical session handling)

#### Constraints and environment
- Nuxt/Vercel runtime; please do not start Nuxt automatically in scripts.
- MySQL sources are read-only; write persistence for reports lives in Supabase Postgres.
- Supabase env vars used: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Migrations are applied manually in Supabase; see SQL file under `docs/database/migrations`.

#### Known limitations and next steps
- Drill-down UI is currently disabled on click; enable and wire to `details` endpoint if desired.
- Filters: Operator coverage is basic; add date pickers, granular operators, and value suggestions from server.
- Query builder: Add date bucketing (day/week/month) and sort/limit controls per zone; support multiple metrics and aggregations.
- Visualization: Add stacked/grouped toggles per chart type, data labels, and axis/tooltip number/date formatting parity.
- Save/Load: Add rename/update UI and sharing/collaboration (roles/RBAC) as per spec.
- Exports: CSV (table) and PNG/PDF for charts; schedule delivery (future sprint).
- Performance: Add server-side caching and query timeouts; guard excessive join counts; index advice for large sources.

#### Developer tips
- If you see SSR hydration warnings, confirm state is only encoded/decoded on server safely and URL updates run only on client.
- If Chart rendering fails, verify the CDN script loaded (check `window.Chart` in devtools) and that Chart type selection remounts the component (keyed).
- For Supabase errors, confirm session cookies exist or supply an Authorization Bearer token; ensure `reporting_reports` table and RLS policy are applied.


