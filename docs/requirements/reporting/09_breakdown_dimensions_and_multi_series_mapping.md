### Sprint 09 — Breakdown dimensions and multi-series mapping

#### Goal
Allow adding a secondary dimension (breakdown) to split series and render grouped/stacked visuals.

#### Implementation Prompt (LLM-ready)
- Extend query builder to group by both primary X dimension and a `breakdown` field, returning series categories and values.
- Update `ReportingChart.vue` to map breakdown values into multiple series.
- Add controls to choose stacking vs. grouped bars, and legend placement.
- Ensure table preview shows a pivot-like view or grouped rows with breakdown key.

#### Deliverables
- Breakdown selection in zones and query support.
- Multi-series chart rendering.

#### Acceptance Criteria
- Adding a breakdown creates multiple series in bar/line charts.
- Toggling stacked/grouped updates rendering correctly.
- Table preview includes breakdown column or pivot.

#### Out of Scope
- Grand totals and subtotals (later sprint).

#### Test Checklist
- Select city as X and customer as breakdown; verify legend and series behavior.
- Switch between grouped and stacked; values remain consistent.



