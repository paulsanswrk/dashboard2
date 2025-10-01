### Sprint 06 — Filtering UI and null/empty value handling

#### Goal
Provide simple filtering controls and clear handling of null/empty values in both preview and charts.

#### Implementation Prompt (LLM-ready)
- Add `ReportingFilters.vue` for managing filters:
  - Operators: equals, contains, in, between (for dates and numbers), date range picker.
  - Values input with async suggestions for categorical fields (server-backed, debounced).
- Extend server query builder to apply filters safely (SQL injection-safe parameterization).
- Add null handling options in the UI: include as "(null)", exclude nulls, or group nulls separately.
- Ensure preview and charts reflect null settings consistently.

#### Deliverables
- Filters UI with basic operators and suggestions.
- Server-side filter application and null-handling.

#### Acceptance Criteria
- Adding/removing a filter updates the preview and charts within ~500ms.
- Null treatment options are visible and work as expected.
- No direct database errors leak to the client.

#### Out of Scope
- Advanced predicates (regex, subqueries) and permission-aware value lists.

#### Test Checklist
- Apply text contains and date range filters; verify row set changes appropriately.
- Toggle null treatment and observe reflected changes in preview and charts.



