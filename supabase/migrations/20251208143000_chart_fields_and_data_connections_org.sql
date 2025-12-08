-- Backfill data_connections.organization_id from owner profile and enforce NOT NULL
update data_connections d
set organization_id = p.organization_id from profiles p
where d.owner_id = p.user_id
  and d.organization_id is null;

alter table data_connections
    alter column organization_id set not null;

-- Allow dashboard-level chart config overrides
alter table dashboard_charts
    add column if not exists config_override jsonb default '{}'::jsonb not null;

-- Add chart dimensions and thumbnail URL
alter table charts
    add column if not exists width integer,
    add column if not exists height integer,
    add column if not exists thumbnail_url text;

