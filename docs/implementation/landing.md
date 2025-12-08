# Recent Implementation Changes

## Roles and Access

- Added SUPERADMIN role across types, redirects, and permissions.
- Enforced organization_id constraint: SUPERADMIN requires NULL; others require NOT NULL.
- API guards: role changes limited to ADMIN/SUPERADMIN; cannot self-elevate; cannot assign higher roles.
- Viewer access tightened: blocked from data connections and reporting builder via `canAccessPath`.

## Navigation & Routing

- Home is now the main dashboard page (`/`), replacing the old `/dashboard` entry point. Removed `/my-dashboard` route and menu links.
- Role-based navigation:
    - Top nav (content): ADMIN/EDITOR get Connect/Analyze/Dashboards/Reports; VIEWER gets Dashboards/Reports; SUPERADMIN has no top nav.
    - Side nav (admin): shown only for ADMIN/SUPERADMIN; EDITOR/VIEWER see no side nav. SUPERADMIN includes Email Queue.
    - Mobile: top nav items appear in the hamburger drawer above admin links, separated by a divider.
- Logo/brand: links to home; Optiqo logo component used for editors/viewers, with consistent styling.

## UI/UX Updates

- Account page: organization name editing moved to a modal, allowed for ADMIN/SUPERADMIN with validation.
- User details: role dropdown with hierarchy enforcement (cannot assign higher than own role) and visibility only to ADMIN/SUPERADMIN.

## Data & Constraints

- Supabase migration added for SUPERADMIN and organization_id check constraint.
- Drizzle schema updated with SUPERADMIN enum and check constraint.

## Removed / Deprecated

- `/my-dashboard` page, route, and references.
- “Dashboard” menu item from nav; links adjusted to point to home (`/`).

