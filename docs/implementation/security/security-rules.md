# Security Rules Overview (Objects & Access Paths)

## Scope and enforcement

- RLS is disabled; all authorization is enforced in server routes (Drizzle/Supabase admin client).
- Authentication remains via Supabase auth; profile lookups provide `organization_id` and role.
- Permissions are anchored at dashboards; tabs, chart placement, and data connections are gated through dashboard access checks.

## Dashboards

- Ownership is organization-scoped: `dashboards.organization_id` is required; `creator` stores the user who created it.
- Public dashboards (`is_public = true`) are read-only; password (if set) is checked in the app layer.
- Non-public dashboards require org membership or an explicit grant in `dashboard_access`.
- Admins/Editors of the dashboard org can create/update/delete; Viewers or external shares are read-only.

## Sharing (dashboard_access)

- Single table for grants with `target_type` in `org | user | group`, plus `target_org_id`, `target_user_id`, or `target_group_id`.
- `access_level` is `read` or `edit` (Admins/Editors within the org can edit; external/shared targets are effectively read-only in the app layer).
- Supporting tables: `user_groups`, `user_group_members` for group-based shares.

## Tabs and placements

- `dashboard_tab` and `dashboard_charts` operations require the caller’s org to match the parent dashboard.
- `dashboard_charts.config_override` stores per-dashboard chart config overrides; server enforces org access before CRUD.

## Charts

- Charts inherit access via dashboards; direct read/write is controlled server-side.
- Added fields: `width`, `height`, `thumbnail_url`; tied to the data connection via `data_connection_id`.

## Data connections

- `organization_id` is NOT NULL; creation/update/delete requires org membership (Admins/Editors).
- Access to connection details during render/preview is allowed only when the dashboard/requesting user is in the same org.

## Reports

- Reports must reference dashboards/tabs; server checks org alignment with the requesting user before CRUD.
- Rendering filters out dashboards/tabs the user cannot read.

## General server checks

- All dashboard-related endpoints now resolve the user profile and enforce `organization_id` alignment instead of `owner_id`.
- Public routes still bypass auth only when `is_public` is true; otherwise org membership is required.

