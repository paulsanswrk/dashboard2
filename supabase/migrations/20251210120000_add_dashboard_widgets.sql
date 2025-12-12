-- Widget table to unify charts, text, images, and icons with per-instance styling and config overrides
create table if not exists public.dashboard_widgets
(
    id
    uuid
    primary
    key
    default
    gen_random_uuid
(
),
    dashboard_id uuid not null references public.dashboards
(
    id
) on delete cascade,
    tab_id uuid not null references public.dashboard_tab
(
    id
)
  on delete cascade,
    type text not null check
(
    type
    in
(
    'chart',
    'text',
    'image',
    'icon'
)),
    chart_id bigint references public.charts
(
    id
)
  on delete cascade,
    position jsonb not null,
    style jsonb not null default '{}'::jsonb,
    config_override jsonb not null default '{}'::jsonb,
    z_index integer not null default 0,
    is_locked boolean not null default false,
    created_at timestamptz not null default now
(
),
    updated_at timestamptz not null default now
(
)
    );

create index if not exists dashboard_widgets_tab_idx on public.dashboard_widgets (tab_id);
create index if not exists dashboard_widgets_dashboard_idx on public.dashboard_widgets (dashboard_id);
create index if not exists dashboard_widgets_type_idx on public.dashboard_widgets (type);
create index if not exists dashboard_widgets_chart_idx on public.dashboard_widgets (chart_id) where type = 'chart';

-- Tab-level style/options for UI controls
alter table public.dashboard_tab
    add column if not exists style jsonb not null default '{}'::jsonb,
    add column if not exists options jsonb not null default '{}'::jsonb;

-- Migrate existing chart placements into the unified widget table
insert into public.dashboard_widgets (id, dashboard_id, tab_id, type, chart_id, position, style, config_override, z_index, is_locked, created_at, updated_at)
select gen_random_uuid(),
       dt.dashboard_id,
       dc.tab_id,
       'chart',
       dc.chart_id,
       dc.position,
       '{}'::jsonb, coalesce(dc.config_override, '{}'::jsonb),
       0,
       false,
       dc.created_at,
       dc.created_at
from public.dashboard_charts dc
         join public.dashboard_tab dt on dt.id = dc.tab_id;

-- Remove legacy junction table now that data is migrated
drop table public.dashboard_charts;

