### Sprint 04 — Live preview and auto-aggregation defaults

#### Goal
Convert the report state into a minimal server-executed query to power a live preview table, with sensible default aggregations.

#### Implementation Prompt (LLM-ready)
- Add a query builder on the server that maps:
  - Metrics: default `SUM` for numeric, `COUNT` for IDs, `AVG` for rates if marked; allow override later.
  - Dimensions: group-by fields; date fields support auto-granularity (day/week/month) with default.
- Implement `POST /api/reporting/preview` to accept `PreviewRequest` containing datasetId, xDimensions, yMetrics (with aggregation), filters, breakdowns (ignored initially), limit.
- Return `PreviewResponse` with `columns`, `rows`, `meta` (execution ms, row count, applied aggregations).
- In `ReportingPreview.vue`, render as a table; show loading skeleton and error states.
- Trigger preview automatically on state changes with debouncing (e.g., 300ms).

#### Deliverables
- Server-side query builder and `preview` endpoint.
- Live updating table preview.

#### Acceptance Criteria
- Changing fields or filters updates the preview within ~500ms.
- Defaults apply as specified without user input.
- No client-side SQL; all queries execute server-side via Nuxt route.

#### Out of Scope
- Charts rendering.
- Complex filter operators beyond equals/contains/date-range.

#### Test Checklist
- Add one dimension and one metric; confirm grouped rows and aggregates appear.
- Verify invalid requests return structured errors and are surfaced in UI.



