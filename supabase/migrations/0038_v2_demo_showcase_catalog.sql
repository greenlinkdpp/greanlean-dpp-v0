begin;

do $$
begin
  if not exists (
    select 1 from public.greanlean_migration_ledger
    where migration_number = '0037' and result = 'applied'
  ) then
    raise exception '0038 requires migration 0037';
  end if;
end;
$$;

insert into public.capability (code, description, risk_class)
values
  ('platform.demo.view', 'View Demo Showcase catalog entries from the platform console', 'READ'),
  ('platform.demo.manage', 'Manage Demo Showcase catalog entries from the platform console', 'ADMIN')
on conflict (code) do nothing;

insert into public.role_capability (role_id, capability_id)
select role.id, capability.id
from public.role role
join public.capability capability on capability.code in ('platform.demo.view', 'platform.demo.manage')
where role.tenant_id is null
  and role.code = 'platform_operator'
  and role.role_class = 'PLATFORM'
on conflict do nothing;

create table public.demo_showcase_entry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  passport_id uuid not null references public.dpp_passport(id) on delete restrict,
  category_code text not null check (category_code in (
    'LMT_BATTERY', 'INDUSTRIAL_BATTERY', 'TEXTILE', 'CONSUMER_ELECTRONICS',
    'BUILDING_MATERIAL', 'HARDWARE'
  )),
  title_en text not null,
  title_zh text not null,
  brand text not null,
  summary_en text not null,
  summary_zh text not null,
  key_parameters jsonb not null default '{}'::jsonb,
  cover_style text not null default 'gradient-green',
  sort_order integer not null default 100 check (sort_order >= 0),
  is_featured boolean not null default false,
  is_public boolean not null default false,
  is_demo boolean not null default true check (is_demo),
  synthetic boolean not null default true check (synthetic),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (passport_id),
  unique (tenant_id, category_code, sort_order)
);

create index demo_showcase_entry_public_idx
  on public.demo_showcase_entry(is_public, category_code, sort_order, created_at desc);
create index demo_showcase_entry_tenant_idx
  on public.demo_showcase_entry(tenant_id, category_code, sort_order);

create trigger demo_showcase_entry_touch_updated_at
before update on public.demo_showcase_entry
for each row execute function public.v2_touch_updated_at();

alter table public.demo_showcase_entry enable row level security;
grant select on public.demo_showcase_entry to anon, authenticated;
create policy demo_showcase_entry_public_read on public.demo_showcase_entry
for select to anon, authenticated using (is_public and is_demo and synthetic);

comment on table public.demo_showcase_entry is
  'Platform-managed, public-safe catalog of synthetic demo DPPs. It is not a customer catalog or a regulatory applicability declaration.';

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0038', 'v2_demo_showcase_catalog', null,
  'preproduction', 'codex', 'applied',
  'Add a platform-managed, public-safe synthetic Demo Showcase catalog; no V1 tables changed.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
