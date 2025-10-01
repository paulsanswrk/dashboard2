### Sprint 05 — Core visualization suite (bar, line, pie/donut, table, KPI)

#### Goal
Enable switching between core chart types and a table/KPI view, consuming the preview data model.

#### Implementation Prompt (LLM-ready)
- Choose a charting library compatible with Nuxt 3 (e.g., ECharts or Chart.js) and create a wrapper `ReportingChart.vue`.
- Implement view switcher in `ReportingBuilder.vue` for: Table, Bar, Line, Pie/Donut, KPI.
- Map `PreviewResponse` into a normalized series model for the chosen library.
- Add responsive behavior, legends, and axis labeling placeholders.
- Render a single KPI value when only one aggregated metric and no dimension.

#### Deliverables
- Chart wrapper component and view switcher.
- Working charts using preview data.

#### Acceptance Criteria
- Switching chart type preserves the data selection and renders correctly.
- Empty and error states are handled gracefully per chart type.
- KPI view displays when applicable with clear formatting.

#### Out of Scope
- Advanced formatting controls (colors, number formatting) — later sprint.
- Drill-down interactions.

#### Test Checklist
- Toggle across chart types for the same selection and verify correctness.
- Resize window; charts remain readable without overflow.



