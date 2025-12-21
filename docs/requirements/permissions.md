Securable objects:
-data connections
-charts
-dashboards (including all the tabs)

The main principal is organization. Within an organization, Admins get full access to any dashboard belonging to that organization. Editors and Viewers do not have automatic access to dashboards within their organization - they need explicit sharing permissions.

Editors who create dashboards get full access to their own dashboards. Admins can also create dashboards and get full access.

There also can be defined a group of users (with different levels and from different organizations) that can be given the permissions to a dashboard.

A dashboard may be shared to another user (of any level) or group with either read-only or edit access. Shared users get the specified level of access to the dashboard and all charts within it.

Admins can add any shared charts to dashboards within their organization and apply some config overrides (like theme) to the charts. Editors can do this for dashboards they have edit access to (their own or explicitly shared). Those overrides would be saved not in the chart (where the user has no write access) but within the dashboard_charts.

When report is being created or rendered, we need to check the creator has at least readonly access to all the dashboards within it. If a dashboard is missing permissions it is excluded from the render.

Summarizing, permissions cover dashboards and any underlying tabs, charts and data connections. Those lower-level objects have no permission model other than per-dashboard.

Pages:
-create/edit data connection: pages/integration-wizard.vue (Viewers can't access)
-report builder: pages/reporting/builder.vue (Viewers can't access)
-dashboard: pages/dashboards/[id].vue