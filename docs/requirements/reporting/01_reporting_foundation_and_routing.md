### Sprint 01 — Reporting foundation, routes, and architecture

#### Goal
Establish the foundation for the reporting feature: page routes, core components, server routes for data access, and a minimal end-to-end preview pipeline (stubbed) that future sprints can extend.

#### Context
From `docs/requirements/Reporting.md`: users need a visual, non-technical reporting wizard with drag-and-drop and instant previews. This sprint lays the groundwork in Nuxt and server routes to support later UI and data features. Backends will connect to MySQL directly from Nuxt server routes (Vercel-compatible), not via Supabase.

#### Implementation Prompt (LLM-ready)
- Create a top-level route `pages/reporting.vue` with a minimal shell and link access from `pages/analyze.vue` and `pages/dashboard.vue` if appropriate.
- Add a nested route `pages/reporting/builder.vue` to host the wizard UI.
- Scaffold high-level components in `components/reporting/`:
  - `ReportingLayout.vue` — overall layout (left schema panel, center canvas, right settings panel placeholders)
  - `ReportingBuilder.vue` — orchestrates zones and state providers
  - `ReportingPreview.vue` — placeholder preview area with loading/empty states
  - `ReportingEmptyState.vue` — shown when no fields selected
- Implement a client-side service module `composables/useReportingService.ts` that calls server routes for:
  - get available datasets/tables
  - get table schema (fields with types)
  - run preview query (stubbed response for now)
- Implement Nuxt server routes in `server/api/reporting/` to encapsulate logic (MySQL source):
  - `datasets.get.ts` — list datasets/tables via `information_schema`
  - `schema.get.ts` — return fields for a dataset via `information_schema`
  - `preview.post.ts` — accept a query payload and return mock data (later MySQL-backed)
- Respect project constraints:
  - Use Nuxt server routes for Supabase communication.
  - Do not edit `.env`; rely on existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  - Do not start Nuxt in scripts; keep idempotent code-only changes.
- Add minimal TypeScript types for Dataset, Field, FieldType, PreviewRequest, PreviewResponse.

#### Deliverables
- New routes: `reporting`, `reporting/builder`.
- Components scaffolded in `components/reporting/`.
- Server endpoints under `server/api/reporting/` returning placeholder data.
- `useReportingService.ts` calling those endpoints.

#### Acceptance Criteria
- Navigating to `/reporting/builder` shows the 3-panel layout with placeholders.
- Calling the preview endpoint via a test button returns mock data and renders a simple table in `ReportingPreview.vue`.
- No runtime errors in browser console for the new pages.
- All API calls are via Nuxt server routes; no direct Supabase calls from client.

#### Out of Scope
- Real schema discovery from database.
- Real query generation or charting.

#### Test Checklist
- Access `/reporting/builder` and verify layout renders.
- Click a temporary "Test Preview" button to invoke `preview.post.ts` and render rows.
- Verify network calls hit `/api/reporting/*` routes.



