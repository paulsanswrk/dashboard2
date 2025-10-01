### Sprint 10 — Interactivity: tooltips and drill-down

#### Goal
Improve data exploration with informative tooltips and click-to-drill interactions from aggregate to detail.

#### Implementation Prompt (LLM-ready)
- Enhance chart tooltips to display dimension, breakdown, metric name, and formatted value.
- Implement drill-down: clicking a point appends a filter constraint and optionally switches to a detail table view.
- Add server route `details.post.ts` to fetch raw rows for a clicked segment with pagination and column selection.
- Provide a back/crumb UI to step out of drill-down filters.

#### Deliverables
- Configurable tooltips across all charts.
- Drill-down flow with details table and back navigation.

#### Acceptance Criteria
- Tooltip content respects number/date formatting and labels.
- Clicking a bar/point adds a filter and refreshes preview; detail view shows relevant rows.
- Backing out removes the added filter(s) and restores previous aggregate view.

#### Out of Scope
- Multi-level drill hierarchies beyond one or two levels.

#### Test Checklist
- Click on a chart segment; verify added filter in UI and results.
- Drill to detail and paginate through rows; performance remains acceptable.



