# Security Rules Overview (Objects & Access Paths)

## Scope and Enforcement

- **RLS is disabled**; all authorization is enforced in server routes (Drizzle/Supabase admin client).
- Authentication remains via Supabase auth; profile lookups provide `organization_id` and `role`.
- Permissions are anchored at dashboards; tabs, chart placement, and data connections are gated through dashboard access checks.

## Role Hierarchy

| Role | Scope | Organization ID | Capabilities |
|------|-------|-----------------|--------------|
| SUPERADMIN | System-wide | NULL | Full access to all organizations, users, dashboards |
| ADMIN | Organization | Required | Full access within their organization |
| EDITOR | Organization | Required | Create/edit dashboards and charts in their org |
| VIEWER | Organization | Required | Read-only access to shared dashboards |

## Organizations

- **SUPERADMIN**: Can create, view, update, and delete any organization.
- **ADMIN**: Can create, view, update, and delete organizations (system-wide).
- Organization deletion cascades to all profiles (users) in that organization.
- The deprecated `viewers` table has been removed; viewers are now profiles with `role='VIEWER'`.

## Users/Profiles

- **SUPERADMIN**: Can manage users across all organizations (no org filter applied).
- **ADMIN**: Can add/edit/delete users within their own organization.
- **EDITOR**: Cannot manage other users.
- User CRUD operations at `/api/users/[id]` check:
  1. SUPERADMIN bypasses organization checks entirely
  2. Non-SUPERADMIN users can only manage users in their own organization

## Dashboards

- Ownership is organization-scoped: `dashboards.organization_id` is required; `creator` stores the user who created it.
- Public dashboards (`is_public = true`) are read-only; password (if set) is checked in the app layer.
- Non-public dashboards require org membership or an explicit grant in `dashboard_access`.
- **SUPERADMIN**: Can access and delete any dashboard regardless of organization.
- **ADMIN/EDITOR**: Can create/update/delete dashboards in their organization; Viewers are read-only.

## Sharing (dashboard_access)

- Single table for grants with `target_type` in `org | user | group`, plus `target_org_id`, `target_user_id`, or `target_group_id`.
- `access_level` is `read` or `edit` (Admins/Editors within the org can edit; external/shared targets are effectively read-only in the app layer).
- Supporting tables: `user_groups`, `user_group_members` for group-based shares.

## Tabs and Placements

- `dashboard_tab` and `dashboard_charts` operations require the caller's org to match the parent dashboard.
- `dashboard_charts.config_override` stores per-dashboard chart config overrides; server enforces org access before CRUD.

## Charts

- Charts inherit access via dashboards; direct read/write is controlled server-side.
- Added fields: `width`, `height`, `thumbnail_url`; tied to the data connection via `data_connection_id`.

## Data Connections

- `organization_id` is NOT NULL; creation/update/delete requires org membership (Admins/Editors).
- Access to connection details during render/preview is allowed only when the dashboard/requesting user is in the same org.
- **Strict Organization Isolation**: Even SUPERADMIN users are restricted to viewing and using only data connections belonging to their current organization context. This prevents cross-organization data leakage and configuration errors.

## Reports

- Reports must reference dashboards/tabs; server checks org alignment with the requesting user before CRUD.
- Rendering filters out dashboards/tabs the user cannot read.

## General Server Checks

- All dashboard-related endpoints resolve the user profile and enforce `organization_id` alignment (except for SUPERADMIN who can access any org).
- Public routes still bypass auth only when `is_public` is true; otherwise org membership is required.
- SUPERADMIN users have `organization_id = NULL` in their profile, indicating system-wide access.
