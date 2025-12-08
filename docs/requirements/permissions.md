Securable objects:
-data connections
-charts
-dashboards (including all the tabs)

The main principal is organization. Admins and Editors create charts and dashboards and then any member of the organization has access to those objects. Viewers have read-only access.
There also can be defined a group of users (with different levels and from different organizations) that can be given the permissions to a dashboard.

A dashboard may be shared to another user (of any level). Then the user gets readonly access to the dashboard and all charts within it.

Editor/Admin can add any shared charts to dashboards within their organization and apply some config overrides (like theme) to the charts. Those overrides would be saved not in the chart (where the user has no write access) but within the dashboard_charts.

When report is being created or rendered, we need to check the creator has at least readonly access to all the dashboards within it. If a dashboard is missing permissions it is excluded from the render.

Summarizing, permissions cover dashboards and any underlying tabs, charts and data connections. Those lower-level objects have no permission model other than per-dashboard.

Pages:
-create/edit data connection: pages/integration-wizard.vue (Viewers can't access)
-report builder: pages/reporting/builder.vue (Viewers can't access)
-dashboard: pages/dashboards/[id].vue