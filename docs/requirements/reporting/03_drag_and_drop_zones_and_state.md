### Sprint 03 — Drag-and-drop zones and report state model

#### Goal
Provide intuitive drag-and-drop fields into zones: X-axis (dimensions), Y-axis (metrics), Filters, and Breakdown. Establish the central report state model.

#### Implementation Prompt (LLM-ready)
- Introduce components:
  - `ReportingSchemaPanel.vue` — searchable list of fields (from Sprint 02).
  - `ReportingZones.vue` — renders droppable areas: X, Y, Filters, Breakdown.
  - Use a Vue drag-and-drop library (e.g., `vue3-dnd` or `vuedraggable`) consistent with project constraints.
- Define a report state model in a composable `useReportState.ts`:
  - `selectedDatasetId`, `xDimensions[]`, `yMetrics[]`, `filters[]`, `breakdowns[]`.
  - Each zone item contains `fieldId`, `aggregation` (for metrics), `alias`, `sort`, `limit`, and `format` placeholders (to be used later).
- Enable adding/removing/reordering fields via drag-and-drop and controls per item.
- Persist state to route querystring for shareability (lightweight), and provide clear reset.

#### Deliverables
- Zones UI with drag-and-drop working.
- `useReportState` managing canonical state, synced to URL.

#### Acceptance Criteria
- Users can drag fields into each zone, reorder them, and remove them.
- State persists on refresh via querystring encoding (e.g., base64 JSON or compact params).
- Empty state instructions are shown when no fields are selected.

#### Out of Scope
- Query generation and execution.
- Advanced validation rules.

#### Test Checklist
- Drag a numeric field into Y and a date/text field into X; confirm state updates.
- Refresh the page; confirm state restores from URL.



