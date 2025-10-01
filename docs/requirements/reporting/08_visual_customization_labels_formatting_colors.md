### Sprint 08 — Visual customization: labels, formatting, and color palettes

#### Goal
Provide basic chart presentation controls: titles/labels editing, number/date formatting, and selectable color palettes.

#### Implementation Prompt (LLM-ready)
- Add a right-side settings panel `ReportingAppearancePanel.vue` with sections:
  - Titles: chart title, x-axis label, y-axis label, legend title.
  - Number formatting: decimal places, thousands separators, currency symbol, percentage.
  - Date formatting: display granularity and format strings.
  - Color palettes: predefined palettes + custom (hex inputs) with validation.
- Store appearance settings in `useReportState` under `appearance` and include in preview metadata for charts.
- Ensure settings apply to `ReportingChart.vue` mapping for each chart type.

#### Deliverables
- UI for appearance controls and state persistence via URL.
- Charts reflect label/format/palette changes immediately.

#### Acceptance Criteria
- Editing titles updates chart labels live.
- Number and date formatting applies to axes and tooltips.
- Switching palettes updates series colors consistently.

#### Out of Scope
- Conditional formatting (handled separately).

#### Test Checklist
- Change decimal places and verify axes/tooltips.
- Apply a custom palette; confirm color order and accessibility contrast.



