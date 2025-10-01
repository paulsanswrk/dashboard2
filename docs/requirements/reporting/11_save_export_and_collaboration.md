### Sprint 11 — Save, export, and collaboration

#### Goal
Allow saving reports, exporting to common formats, and sharing with role-based access.

#### Implementation Prompt (LLM-ready)
- Define a `reports` table (Supabase migration, manual apply) storing: id, owner, org, name, description, serialized state, created_at, updated_at, visibility.
- Implement server routes:
  - `reports.post.ts` (create), `reports.put.ts` (update), `reports.get.ts` (list/read), `reports.delete.ts` (delete).
- Add export options: CSV (table), PNG/PDF (charts) using server-side or client-side rendering as feasible; initiate via server route to avoid secrets.
- Implement sharing model: owner-only, org-read, org-write, explicit user shares. Enforce in server handlers.

#### Deliverables
- Persistence of report definitions and list UI.
- CSV export and at least one of PNG/PDF for charts.
- Basic sharing with RBAC checks.

#### Acceptance Criteria
- Users can save, update, list, load, and delete reports.
- Exporting produces correct files with applied formatting.
- Access control enforced per user/org role.

#### Out of Scope
- Versioning of reports (future enhancement).

#### Test Checklist
- Save a report; reload and confirm identical state.
- Export CSV and compare row/column alignment; attempt unauthorized access and verify denial.



