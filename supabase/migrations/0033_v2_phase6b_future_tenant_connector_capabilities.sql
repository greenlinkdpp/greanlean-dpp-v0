begin;

do $$
begin
  if to_regclass('public.role') is null
     or to_regclass('public.capability') is null
     or to_regclass('public.role_capability') is null then
    raise exception '0033 requires migrations 0027 and 0031';
  end if;
end;
$$;

create table public.greanlean_0033_role_capability_delta (
  role_id uuid not null references public.role(id) on delete cascade,
  capability_id uuid not null references public.capability(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, capability_id)
);

alter table public.greanlean_0033_role_capability_delta enable row level security;
revoke all on public.greanlean_0033_role_capability_delta from public, anon, authenticated;

create or replace function public.v2_phase6b_seed_connector_role_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.greanlean_0033_role_capability_delta(role_id, capability_id)
  select new.id, capability.id
  from public.capability capability
  where new.role_class = 'TENANT'
    and capability.code = any (
      case new.code
        when 'tenant_admin' then array[
          'connector.view', 'connector.manage', 'connector.execute',
          'connector.retry', 'connector.read_receipt', 'webhook.manage'
        ]::text[]
        when 'dpp_manager' then array[
          'connector.view', 'connector.execute', 'connector.retry',
          'connector.read_receipt'
        ]::text[]
        when 'publisher' then array[
          'connector.view', 'connector.execute', 'connector.retry',
          'connector.read_receipt'
        ]::text[]
        when 'read_only' then array[
          'connector.view', 'connector.read_receipt'
        ]::text[]
        else array[]::text[]
      end
    )
    and not exists (
      select 1 from public.role_capability existing
      where existing.role_id = new.id
        and existing.capability_id = capability.id
    )
  on conflict do nothing;

  insert into public.role_capability(role_id, capability_id)
  select delta.role_id, delta.capability_id
  from public.greanlean_0033_role_capability_delta delta
  where delta.role_id = new.id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.v2_phase6b_seed_connector_role_capabilities() from public, anon, authenticated;

drop trigger if exists role_seed_phase6b_connector_capabilities on public.role;
create trigger role_seed_phase6b_connector_capabilities
after insert on public.role
for each row execute function public.v2_phase6b_seed_connector_role_capabilities();

insert into public.greanlean_0033_role_capability_delta(role_id, capability_id)
select role.id, capability.id
from public.role role
join public.capability capability on capability.code = any (
  case role.code
    when 'tenant_admin' then array[
      'connector.view', 'connector.manage', 'connector.execute',
      'connector.retry', 'connector.read_receipt', 'webhook.manage'
    ]::text[]
    when 'dpp_manager' then array[
      'connector.view', 'connector.execute', 'connector.retry',
      'connector.read_receipt'
    ]::text[]
    when 'publisher' then array[
      'connector.view', 'connector.execute', 'connector.retry',
      'connector.read_receipt'
    ]::text[]
    when 'read_only' then array[
      'connector.view', 'connector.read_receipt'
    ]::text[]
    else array[]::text[]
  end
)
where role.role_class = 'TENANT'
  and not exists (
    select 1 from public.role_capability existing
    where existing.role_id = role.id
      and existing.capability_id = capability.id
  );

insert into public.role_capability(role_id, capability_id)
select role_id, capability_id
from public.greanlean_0033_role_capability_delta
on conflict do nothing;

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0033', 'v2_phase6b_future_tenant_connector_capabilities', null,
  'preproduction', 'codex', 'applied',
  'Backfill Phase 5 Connector capabilities and seed them for tenant roles created after migration 0031.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
