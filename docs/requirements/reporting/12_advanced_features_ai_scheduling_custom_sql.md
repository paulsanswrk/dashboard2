### Sprint 12 — Advanced features: AI suggestions, scheduled reports, custom SQL

#### Goal
Introduce differentiators: AI-assisted suggestions, scheduled email delivery, and a guarded custom SQL mode for advanced users.

#### Implementation Prompt (LLM-ready)
- AI suggestions (non-blocking):
  - Add a server route `suggestions.post.ts` that receives current state and returns suggested fields, chart types, and simple insights (rule-based first; LLM integration later).
  - Display suggestions in a collapsible panel; one-click apply to modify state.
- Scheduled reports:
  - Define `report_schedules` table with report_id, cron expression, format, recipients, timezone.
  - Add server route to create/update schedules and a Node script or server cron to execute and email exports.
- Custom SQL mode:
  - Add a toggle to switch to SQL editor for the selected dataset connection.
  - Validate and run SQL via a dedicated server route with RLS/permission checks; disable dangerous statements.
  - Map results back into the preview model when possible.

#### Deliverables
- Suggestions endpoint with rule-based output and UI integration.
- Scheduling model with a runnable job and email dispatch using existing email utils.
- Custom SQL editor path with guarded execution.

#### Acceptance Criteria
- Suggestions appear contextually and can be applied without errors.
- Schedules can be created and trigger exports reliably (manual invocation acceptable in dev).
- Custom SQL runs safely and returns previewable results with column inference.

#### Out of Scope
- Full LLM integration for suggestions (placeholder hooks only).
- Complex job orchestration; keep scheduling minimal.

#### Test Checklist
- Request suggestions on a simple state; apply a suggested chart type.
- Create a daily schedule and trigger a run; verify email delivery.
- Paste a simple SELECT query; preview returns rows and columns matching expectation.



