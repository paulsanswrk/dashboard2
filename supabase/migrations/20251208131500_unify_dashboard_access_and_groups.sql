-- Create groups that can be granted dashboard access
create table if not exists user_groups
(
    id
    uuid
    default
    gen_random_uuid
(
) primary key,
    name text not null,
    organization_id uuid references organizations on delete set null,
    created_by uuid references auth.users
                                                  on delete set null,
    created_at timestamptz default now
(
) not null
    );

create table if not exists user_group_members
(
    group_id
    uuid
    not
    null
    references
    user_groups
    on
    delete
    cascade,
    user_id
    uuid
    not
    null
    references
    auth
    .
    users
    on
    delete
    cascade,
    created_at
    timestamptz
    default
    now
(
) not null,
    primary key
(
    group_id,
    user_id
)
    );

-- Evolve dashboard_access into a single table for org/user/group grants
alter table dashboard_access
drop
constraint if exists check_access_type;

drop index if exists idx_dashboard_access_viewer_user_id;
drop index if exists idx_dashboard_access_organization_id;

alter table dashboard_access
    add column if not exists target_type text,
    add column if not exists target_user_id uuid references auth.users on
delete
cascade,
    add column if not exists target_org_id uuid references organizations on delete
cascade,
    add column if not exists target_group_id uuid references user_groups on delete
cascade,
    add column if not exists access_level text;

-- Migrate existing data to the new columns
update dashboard_access
set target_type    = 'user',
    target_user_id = viewer_user_id
where viewer_user_id is not null
  and target_type is null;

update dashboard_access
set target_type   = 'org',
    target_org_id = organization_id
where organization_id is not null
  and target_type is null;

-- Defaults and constraints for new columns
alter table dashboard_access
    alter column target_type set default 'user',
alter
column access_level set default 'read';

alter table dashboard_access
    alter column target_type set not null,
alter
column access_level set not null;

alter table dashboard_access
    add constraint dashboard_access_target_type_check check (target_type in ('org', 'user', 'group')),
    add constraint dashboard_access_access_level_check check (access_level in ('read', 'edit')),
    add constraint dashboard_access_target_presence_check check (
        (target_type = 'user' and target_user_id is not null and target_org_id is null and target_group_id is null) or
        (target_type = 'org' and target_org_id is not null and target_user_id is null and target_group_id is null) or
        (target_type = 'group' and target_group_id is not null and target_user_id is null and target_org_id is null)
    );

-- Ensure uniqueness per target type
create unique index if not exists dashboard_access_unique_user
    on dashboard_access (dashboard_id, target_user_id)
    where target_type = 'user';

create unique index if not exists dashboard_access_unique_org
    on dashboard_access (dashboard_id, target_org_id)
    where target_type = 'org';

create unique index if not exists dashboard_access_unique_group
    on dashboard_access (dashboard_id, target_group_id)
    where target_type = 'group';

create index if not exists idx_dashboard_access_target_user_id
    on dashboard_access (target_user_id)
    where target_type = 'user';

create index if not exists idx_dashboard_access_target_org_id
    on dashboard_access (target_org_id)
    where target_type = 'org';

create index if not exists idx_dashboard_access_target_group_id
    on dashboard_access (target_group_id)
    where target_type = 'group';

-- Remove obsolete columns now that data is migrated
alter table dashboard_access
drop
constraint if exists dashboard_access_viewer_user_id_fkey,
    drop
constraint if exists dashboard_access_organization_id_fkey;

alter table dashboard_access
drop
column if exists viewer_user_id cascade,
    drop
column if exists organization_id cascade;

-- Switch dashboards ownership to organization-scoped while keeping creator user

-- 1) Add new columns
alter table dashboards
    add column if not exists organization_id uuid references organizations on delete cascade,
    add column if not exists creator uuid references auth.users on
delete
cascade;

-- 2) Backfill from existing data
update dashboards d
set organization_id = p.organization_id from profiles p
where d.owner_id = p.user_id
  and d.organization_id is null;

update dashboards
set creator = owner_id
where creator is null;

-- 3) Enforce NOT NULL after backfill
alter table dashboards
    alter column organization_id set not null,
alter
column creator set not null;

-- 4) Indexes: replace owner index with organization
drop index if exists idx_dashboards_owner_id;
create index if not exists idx_dashboards_organization_id
    on dashboards (organization_id);

-- 5) Drop obsolete column
alter table dashboards
drop
constraint if exists dashboards_owner_id_fkey;

alter table dashboards
drop
column if exists owner_id cascade;

